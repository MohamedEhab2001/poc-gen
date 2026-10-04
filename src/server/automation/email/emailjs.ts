import "server-only";

import { randomUUID } from "node:crypto";
import emailjs, { EmailJSResponseStatus } from "@emailjs/nodejs";
import type { AutomationConfig } from "../config";
import type { EmailProvider, OutgoingEmail, ProviderSendOutcome } from "./provider";
import { reserveProviderSlot, waitForSlot, realClock } from "./rate-limit";
import type { InjectedClock } from "./rate-limit";
import { getDb } from "@/server/db/client";
import { sanitizeOutreachHtml } from "@/lib/automation/html-sanitize";

/**
 * Production EmailJS provider (@emailjs/nodejs — server-side only, never
 * imported from client code).
 *
 * Safety properties:
 * - DRY RUN (default outside production): no network call at all; returns a
 *   deterministic sent outcome so the full pipeline stays testable.
 * - Configuration is validated upstream (fail closed); this provider only
 *   runs with a complete, validated configuration.
 * - Cross-instance rate limit: EmailJS allows ~1 request/second, so each
 *   call reserves a PostgreSQL-backed slot and waits OUTSIDE the
 *   transaction, bounded. A slot too far ahead fails retryably.
 * - Bounded request time; timeouts and uncertain network failures become
 *   delivery_unknown (never retried automatically). Definite EmailJS
 *   rejections (4xx validation/auth/template) become failed with a safe
 *   machine code.
 * - Logging: recipient addresses, template parameters, bodies, POC tokens,
 *   and keys are NEVER logged — only safe reference ids and outcome codes.
 * - The visible unsubscribe link inside body_html is the authoritative
 *   unsubscribe mechanism (EmailJS does not support custom
 *   Message-ID/List-Unsubscribe headers).
 */

/** At least 1,100 ms between provider calls (EmailJS ~1 req/s + margin). */
const EMAILJS_MIN_INTERVAL_MS = 1_100;
/** Bounded wait for a rate slot before failing retryably. */
const SLOT_MAX_WAIT_MS = 30_000;

export interface EmailJsProviderOptions {
  serviceId: string;
  templateId: string;
  publicKey: string;
  privateKey: string | null;
  requestTimeoutMs: number;
  dryRun: boolean;
  clock?: InjectedClock;
}

export class EmailJsProvider implements EmailProvider {
  readonly name = "emailjs";
  private readonly options: EmailJsProviderOptions & { clock: InjectedClock };

  constructor(options: EmailJsProviderOptions) {
    this.options = { clock: realClock, ...options };
  }

  async send(message: OutgoingEmail): Promise<ProviderSendOutcome> {
    if (this.options.dryRun) {
      // No network. The log line carries no recipient/parameter content.
      const reference = `emailjs-dryrun-${randomUUID()}`;
      console.log(`[emailjs] dry-run send (messageRef=${message.headers.messageId})`);
      return { status: "sent", providerMessageId: reference };
    }

    // Cross-instance rate slot, reserved transactionally, waited on outside.
    const nowMs = this.options.clock.now();
    let slotAt: number;
    try {
      slotAt = await reserveProviderSlot(getDb(), "emailjs", EMAILJS_MIN_INTERVAL_MS, nowMs);
    } catch {
      return { status: "failed", failureCode: "rate_slot_unavailable" };
    }
    const slotOk = await waitForSlot(slotAt, this.options.clock, SLOT_MAX_WAIT_MS);
    if (!slotOk) {
      return { status: "failed", failureCode: "rate_slot_backlog" };
    }

    const templateParams = buildTemplateParams(message);
    try {
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<"timeout">((resolve) => {
        timeoutHandle = setTimeout(() => resolve("timeout"), this.options.requestTimeoutMs);
      });
      const result = await Promise.race([
        emailjs.send(this.options.serviceId, this.options.templateId, templateParams, {
          publicKey: this.options.publicKey,
          ...(this.options.privateKey ? { privateKey: this.options.privateKey } : {}),
        }),
        timeout,
      ]);
      if (result === "timeout") {
        // The request may still complete server-side: uncertain by definition.
        console.error("[emailjs] request timeout; marking delivery_unknown");
        return { status: "delivery_unknown" };
      }
      const reference = safeReference(result);
      return { status: "sent", providerMessageId: reference };
    } catch (error) {
      if (error instanceof EmailJSResponseStatus) {
        // Definite provider rejection: 4xx-class validation/auth/template.
        const code = classifyEmailJsStatus(error.status);
        console.error(`[emailjs] send rejected (status=${error.status}, code=${code})`);
        return { status: "failed", failureCode: code };
      }
      // Network-level failure before a definitive answer: uncertain.
      console.error("[emailjs] network failure; marking delivery_unknown");
      return { status: "delivery_unknown" };
    }
  }
}

/** Template parameters for the EmailJS outreach template (see docs/emailjs-template-setup.md). */
export function buildTemplateParams(message: OutgoingEmail): Record<string, string> {
  return {
    to_email: message.toAddress,
    ...(message.templateParams ?? {}),
    body_html: sanitizeOutreachHtml(message.html),
    body_text: message.text,
    subject: message.subject,
    unsubscribe_url: message.headers.listUnsubscribe.replace(/[<>]/g, ""),
    reply_to: message.headers.replyTo ?? "",
    message_reference: message.headers.messageId,
  };
}

function safeReference(response: { text?: string; status?: number }): string {
  const raw = typeof response.text === "string" ? response.text : "";
  // Keep only a short safe character run; never echo provider bodies.
  const safe = raw.replace(/[^A-Za-z0-9-]/g, "").slice(0, 64);
  return safe.length > 0 ? `emailjs-${safe}` : `emailjs-ok-${randomUUID().slice(0, 12)}`;
}

function classifyEmailJsStatus(status: number): string {
  if (status === 401 || status === 403) return "emailjs_auth_failed";
  if (status === 400 || status === 422) return "emailjs_request_rejected";
  if (status === 404) return "emailjs_template_or_service_missing";
  if (status === 429) return "emailjs_rate_limited";
  return "emailjs_error";
}

/** Builds the provider from validated application configuration. */
export function emailJsProviderFromConfig(config: AutomationConfig): EmailJsProvider | null {
  if (
    !config.emailjsServiceId ||
    !config.emailjsTemplateId ||
    !config.emailjsPublicKey ||
    (!config.emailjsPrivateKey && !config.emailjsDryRun)
  ) {
    return null;
  }
  return new EmailJsProvider({
    serviceId: config.emailjsServiceId,
    templateId: config.emailjsTemplateId,
    publicKey: config.emailjsPublicKey,
    privateKey: config.emailjsPrivateKey,
    requestTimeoutMs: config.emailjsRequestTimeoutMs,
    dryRun: config.emailjsDryRun,
  });
}
