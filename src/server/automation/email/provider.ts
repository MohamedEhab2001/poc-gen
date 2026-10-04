import "server-only";

import { randomUUID } from "node:crypto";
import { AutomationError } from "@/lib/automation/outcomes";
import { getAutomationConfig } from "../config";
import { emailJsProviderFromConfig } from "./emailjs";

/**
 * Email provider boundary. Phase 2A ships the deterministic mock only: it
 * never opens a socket, so tests, builds, previews, and smoke runs can never
 * send real email. A production adapter (AWS SES v2 is the preferred choice)
 * implements this same interface behind OUTREACH_EMAIL_PROVIDER without any
 * service-contract change; it is deliberately NOT added in this phase so no
 * untested live-send path exists in the repository.
 */

export interface OutgoingEmail {
  toEncrypted: string;
  /** Plaintext recipient — exists only inside the provider call, never logged. */
  toAddress: string;
  subject: string;
  text: string;
  html: string;
  /** Extra provider template parameters (business name, poc_url, footer facts). */
  templateParams?: Record<string, string>;
  headers: {
    messageId: string;
    listUnsubscribe: string;
    listUnsubscribePost: boolean;
    from: string;
    replyTo: string | null;
  };
}

export type ProviderSendOutcome =
  | { status: "sent"; providerMessageId: string }
  | { status: "failed"; failureCode: string }
  | { status: "delivery_unknown" };

export interface EmailProvider {
  readonly name: string;
  send(message: OutgoingEmail): Promise<ProviderSendOutcome>;
}

/**
 * Deterministic mock: succeeds unless the recipient domain encodes a forced
 * outcome ("fail.example", "unknown.example"), enabling full failure-path
 * tests with zero network activity.
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";

  async send(message: OutgoingEmail): Promise<ProviderSendOutcome> {
    const domain = message.toAddress.slice(message.toAddress.lastIndexOf("@") + 1).toLowerCase();
    if (domain === "fail.example") {
      return { status: "failed", failureCode: "mock_forced_failure" };
    }
    if (domain === "unknown.example") {
      return { status: "delivery_unknown" };
    }
    return { status: "sent", providerMessageId: `mock-${randomUUID()}` };
  }
}

/** Test seam: inject a deterministic provider (spy/fault) in tests. */
let providerOverride: EmailProvider | null = null;

export function setEmailProviderOverride(provider: EmailProvider | null): void {
  providerOverride = provider;
}

export function getEmailProvider(): EmailProvider {
  // Tests may inject a deterministic provider; production never overrides.
  if (providerOverride) return providerOverride;
  // Exhaustive selection from VALIDATED configuration. The mock is a
  // development/test provider: it fails closed here when live sending is
  // enabled in production (configuration validation also rejects this, so
  // this is defense in depth — nothing is ever silently substituted).
  const config = getAutomationConfig();
  if (config.emailProvider === "emailjs") {
    const provider = emailJsProviderFromConfig(config);
    if (!provider) {
      throw new AutomationError(
        "emailjs_config_incomplete",
        "The emailjs provider is selected but not fully configured.",
        "FAILED",
      );
    }
    return provider;
  }
  if (config.isProduction && config.sendingEnabled) {
    throw new AutomationError(
      "provider_not_allowed_in_production",
      'The mock provider cannot send in production; configure OUTREACH_EMAIL_PROVIDER=emailjs.',
      "FAILED",
    );
  }
  return new MockEmailProvider();
}

/**
 * Runs a provider send under a bounded timeout. A timeout does NOT cancel
 * the underlying request (the provider may still deliver) — it resolves as
 * delivery_unknown, which the pipeline never retries automatically. This
 * bounds how long a database or advisory lock holder can wait on the
 * provider path.
 */
export async function sendWithTimeout(
  provider: EmailProvider,
  message: OutgoingEmail,
  timeoutMs: number,
): Promise<ProviderSendOutcome> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timeoutHandle = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  try {
    const result = await Promise.race([provider.send(message), timeout]);
    if (result === "timeout") {
      return { status: "delivery_unknown" };
    }
    return result;
  } catch {
    // Provider exceptions are uncertain outcomes unless the provider itself
    // classified them; never convert to a definitive failure here.
    return { status: "delivery_unknown" };
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
