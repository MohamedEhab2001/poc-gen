import "server-only";

import { and, eq, inArray, lte } from "drizzle-orm";
import type { z } from "zod";
import type {
  listDueFollowupsInputSchema,
  prepareOutreachInputSchema,
  sendOutreachInputSchema,
} from "@/lib/automation/schemas";
import { businesses, leads } from "@/server/db/schema";
import {
  POC_LINK_PLACEHOLDER,
  buildMessageId,
  validateOutreachDraft,
} from "@/lib/automation/outreach";
import { decryptContactAddress, unsubscribeToken } from "@/lib/automation/crypto";
import { emailDomain } from "@/lib/automation/normalize";
import { hashIdempotencyKey } from "@/lib/automation/canonical";
import { verifyClaimSupport } from "@/lib/automation/evidence";
import { AutomationError } from "@/lib/automation/outcomes";
import { isLeadStatus } from "@/lib/automation/lifecycle";
import type { LeadStatus } from "@/lib/automation/lifecycle";
import { contactKeysOrThrow } from "../context";
import type { CallContext } from "../context";
import { advisoryLock, contactLockKey, withDatabase, withTransaction } from "../db";
import { writeAudit, writeAuditTx } from "../support";
import { addRunStep } from "../store/runs";
import { getLeadWithBusiness, resolveEvidenceRefs, updateLeadStatus } from "../store/leads";
import { getPocByLeadId, parseStoredRecord } from "../store/poc";
import { checkSuppression, getContactByHash, getVerifiedContactForBusiness } from "../store/contacts";
import {
  countRepliesForLead,
  countSentForDomainSince,
  countSentForLead,
  countSentSince,
  getMessage,
  hasBlockingMessageState,
  insertMessage,
  listMessagesForLead,
  recordMessageOutcome,
  reserveMessage,
} from "../store/messages";
import { createShareLink, listShareLinksForSlug } from "@/server/share/service";
import { getEmailProvider, sendWithTimeout } from "../email/provider";

/**
 * prepare_outreach, send_outreach, list_due_followups.
 *
 * Sending is disabled by default (OUTREACH_SEND_ENABLED). Every send:
 * verified public business contact only, transactional suppression check,
 * daily/per-domain/per-lead limits, one initial + at most two follow-ups,
 * idempotency reservation BEFORE the provider call, and no automatic retry
 * of a DELIVERY_UNKNOWN outcome.
 */

const FOLLOWUP_DELAY_DAYS = 3;

/** Deterministic preview text: the first ~90 characters of the plain-text body. */
function previewTextFrom(bodyText: string): string {
  const firstLine = bodyText.split("\n").find((line) => line.trim().length > 0) ?? "";
  return firstLine.trim().slice(0, 90);
}

function providerTimeoutMs(ctx: CallContext): number {
  const parsed = Number.parseInt(process.env.OUTREACH_PROVIDER_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1000 && parsed <= 60_000 ? parsed : 15_000;
}

function requireLeadStatus(status: string): LeadStatus {
  if (!isLeadStatus(status)) {
    throw new AutomationError("lead_status_corrupt", "The lead has an unknown status.", "FAILED");
  }
  return status;
}

function startOfUtcDay(now: Date): Date {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function prepareOutreach(
  input: z.infer<typeof prepareOutreachInputSchema>,
  ctx: CallContext,
) {
  if (!ctx.config.senderName || !ctx.config.senderIntro || !ctx.config.senderLinkedInUrl) {
    throw new AutomationError(
      "sender_identity_incomplete",
      "Sender name, introduction, and LinkedIn profile are required before preparing outreach.",
      "REJECTED",
    );
  }
  const senderName = ctx.config.senderName;
  const senderIntro = ctx.config.senderIntro;
  const senderLinkedInUrl = ctx.config.senderLinkedInUrl;
  return withTransaction(async (tx) => {
    const pair = await getLeadWithBusiness(tx, input.leadId);
    if (!pair) throw new AutomationError("lead_not_found", "No such lead.", "REJECTED");
    const { lead, business } = pair;

    const messages = await listMessagesForLead(tx, lead.id);
    const sequenceNumber = messages.length;
    if (sequenceNumber > ctx.config.maxFollowups) {
      throw new AutomationError(
        "message_limit_reached",
        `At most one initial message and ${ctx.config.maxFollowups} follow-ups may be prepared.`,
        "REJECTED",
      );
    }
    if (sequenceNumber === 0 && !["PUBLISHED", "OUTREACH_READY"].includes(lead.status)) {
      throw new AutomationError(
        "lead_not_publishable",
        "The initial message requires a published lead.",
        "REJECTED",
        undefined,
        { leadStatus: lead.status },
      );
    }
    if (sequenceNumber > 0) {
      if (!["CONTACTED", "FOLLOW_UP_1"].includes(lead.status)) {
        throw new AutomationError(
          "followup_invalid_state",
          "Follow-ups require an active outreach lead.",
          "REJECTED",
          undefined,
          { leadStatus: lead.status },
        );
      }
      const previous = messages.find((m) => m.sequenceNumber === sequenceNumber - 1);
      if (!previous || previous.status !== "sent") {
        throw new AutomationError(
          "previous_message_not_sent",
          "The previous message in the sequence has not been sent.",
          "REJECTED",
          undefined,
          { previousStatus: previous?.status ?? "missing" },
        );
      }
    }

    // Verified public business contact only.
    const contact = await getVerifiedContactForBusiness(tx, business.id);
    if (!contact) {
      throw new AutomationError(
        "contact_not_verified",
        "No verified public business contact exists for this lead.",
        "REJECTED",
      );
    }
    const suppression = await checkSuppression(tx, contact.addressHash);
    if (suppression.suppressed || suppression.unsubscribed) {
      throw new AutomationError(
        "contact_suppressed",
        "The contact is suppressed or unsubscribed.",
        "SUPPRESSED",
      );
    }

    // Claim validation: every referenced snapshot belongs to this lead AND
    // every claim is deterministically supported by its snapshot payload.
    // (Deterministic linkage, not semantic fact-checking — see
    // src/lib/automation/evidence.ts.)
    const refs = [...new Set([...input.evidenceRefs, ...(input.claims ?? []).map((c) => c.evidenceRef)])];
    if (refs.length > 0) {
      const evidence = await resolveEvidenceRefs(tx, lead.id, refs);
      if (evidence.missing.length > 0) {
        throw new AutomationError(
          "evidence_reference_invalid",
          "One or more evidence references do not belong to this lead.",
          "REJECTED",
        );
      }
    }
    if ((input.claims ?? []).length > 0) {
      const { listSnapshotsForLead } = await import("../store/leads");
      const snapshots = await listSnapshotsForLead(tx, lead.id);
      const byId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));
      for (const [index, claim] of (input.claims ?? []).entries()) {
        const snapshot = byId.get(claim.evidenceRef);
        if (!snapshot) {
          throw new AutomationError(
            "evidence_claim_unsupported",
            "A claim references evidence that does not belong to this lead.",
            "REJECTED",
            undefined,
            { claimIndex: index, reason: "evidence_not_found" },
          );
        }
        const support = verifyClaimSupport({
          statement: claim.statement,
          subject: input.subject,
          body: input.body,
          supportingExcerpt: claim.supportingExcerpt,
          jsonPointer: claim.jsonPointer ?? null,
          payload: snapshot.payload,
        });
        if (!support.ok) {
          // Safe details only: indices and machine reasons — never payload content.
          throw new AutomationError(
            "evidence_claim_unsupported",
            "A personalized claim is not supported by its evidence snapshot.",
            "REJECTED",
            undefined,
            { claimIndex: index, reason: support.reason },
          );
        }
      }
    }

    // The POC must be published and renderable; the placeholder resolves to a
    // fresh secure share link for THIS lead's record.
    const poc = await getPocByLeadId(tx, lead.id);
    if (!poc || poc.state !== "published") {
      throw new AutomationError("poc_not_published", "The lead's POC is not published.", "REJECTED");
    }
    const record = parseStoredRecord(poc.slug, poc.record);

    const keys = contactKeysOrThrow(ctx.config);
    const created = await createShareLink({
      slug: poc.slug,
      createdBy: ctx.principal,
      record,
      expiresInDays: 30,
      maxViews: null,
    });
    if (!created) {
      throw new AutomationError("share_link_refused", "The record cannot currently be shared.", "REJECTED");
    }
    const pocLink = `${ctx.baseUrl}/p/${created.token}`;
    const unsubscribeUrl = `${ctx.baseUrl}/api/unsubscribe?k=${unsubscribeToken(contact.addressHash, keys.keys)}`;

    const validated = validateOutreachDraft({
      subject: input.subject,
      body: input.body,
      pocLink,
      unsubscribeUrl,
      config: {
        businessName: business.displayName,
        senderName,
        senderIntro,
        senderLinkedInUrl,
        fromEmail: ctx.config.fromEmail ?? "outreach@localhost",
        replyTo: ctx.config.replyTo,
        postalAddress: ctx.config.postalAddress,
        advertisementDisclosure: ctx.config.advertisementDisclosure,
        publicBaseUrl: ctx.baseUrl,
      },
    });

    const message = await insertMessage(tx, {
      leadId: lead.id,
      contactId: contact.id,
      sequenceNumber,
      kind: sequenceNumber === 0 ? "initial" : "followup",
      subject: validated.subject,
      pocUrl: pocLink,
      bodyText: validated.bodyText,
      bodyHtml: validated.bodyHtml,
      idempotencyKeyHash: hashIdempotencyKey("prepare_outreach", ctx.idempotencyKey),
    });

    let leadStatus = lead.status;
    if (sequenceNumber === 0 && lead.status === "PUBLISHED") {
      leadStatus = (
        await updateLeadStatus(tx, {
          leadId: lead.id,
          from: requireLeadStatus(lead.status),
          to: "OUTREACH_READY",
        })
      ).status;
    }

    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "prepare_outreach",
      targetType: "outreach_message",
      targetId: message.id,
      runId: ctx.runId ?? null,
      metadata: {
        leadId: lead.id,
        sequenceNumber,
        placeholder: POC_LINK_PLACEHOLDER,
        footer: validated.footer,
      },
    });
    if (ctx.runId) {
      await addRunStep(tx, {
        runId: ctx.runId,
        operation: "prepare_outreach",
        leadId: lead.id,
        status: "completed",
        startedAt: ctx.now,
        finishedAt: ctx.now,
        summary: { sequenceNumber },
      });
    }

    return {
      messageId: message.id,
      leadId: lead.id,
      kind: message.kind as "initial" | "followup",
      sequenceNumber,
      subjectLength: validated.subject.length,
      footer: validated.footer,
      leadStatus,
    };
  });
}

export async function sendOutreach(
  input: z.infer<typeof sendOutreachInputSchema>,
  ctx: CallContext,
) {
  // Fail-closed gates, in order: the send flag now; the emergency stop
  // immediately before the provider call below.
  if (!ctx.config.sendingEnabled) {
    throw new AutomationError(
      "sending_disabled",
      "Outreach sending is disabled on this deployment.",
      "REJECTED",
    );
  }

  const message = await withDatabase((db) => getMessage(db, input.messageId));
  if (!message) throw new AutomationError("message_not_found", "No such message.", "REJECTED");

  // Self-healing completion: a previous attempt sent the message but crashed
  // before the lifecycle transition committed.
  if (message.status === "sent") {
    const leadStatus = await completeSendLifecycle(message.leadId, message.sequenceNumber, ctx);
    return {
      messageId: message.id,
      leadId: message.leadId,
      status: "sent" as const,
      ...(message.providerMessageId ? { providerMessageId: message.providerMessageId } : {}),
      leadStatus,
    };
  }

  const contactKeys = contactKeysOrThrow(ctx.config);
  const startOfDay = startOfUtcDay(ctx.now);

  // RESERVATION TRANSACTION. The shared contact-level advisory lock is held
  // for the whole decision+reservation: suppression transactions take the
  // SAME lock, so suppression and sending are linearized — whichever
  // acquires the lock first commits its decision first.
  const { prepared, contact, businessName } = await withTransaction(async (tx) => {
    const pair = await getLeadWithBusiness(tx, message.leadId);
    if (!pair) throw new AutomationError("lead_not_found", "No such lead.", "REJECTED");
    const { lead, business } = pair;

    const contactRow = await getVerifiedContactForBusiness(tx, business.id);
    if (!contactRow || contactRow.id !== message.contactId) {
      throw new AutomationError(
        "contact_not_verified",
        "The message's contact is not a verified public business contact.",
        "REJECTED",
      );
    }

    // Hold the shared contact lock across the suppression decision AND the
    // reservation below: a suppression transaction either committed before
    // us (we see it and stop here) or waits for our commit (and the
    // post-commit recheck below catches it before the provider boundary).
    await advisoryLock(tx, contactLockKey(contactRow.addressHash));

    const suppression = await checkSuppression(tx, contactRow.addressHash);
    if (suppression.suppressed || suppression.unsubscribed) {
      throw new AutomationError("contact_suppressed", "The contact is suppressed or unsubscribed.", "SUPPRESSED");
    }

    // Volume limits, computed from committed sends. The advisory
    // transaction locks serialize concurrent check+reserve cycles so the
    // counters are correct under parallel sends (no TOCTOU overshoot).
    await advisoryLock(tx, `send-limit:daily:${startOfDay.toISOString().slice(0, 10)}`);
    const sentToday = await countSentSince(tx, startOfDay);
    if (sentToday >= ctx.config.dailySendLimit) {
      throw new AutomationError(
        "daily_send_limit",
        `The daily send limit (${ctx.config.dailySendLimit}) is reached.`,
        "REJECTED",
      );
    }
    const domain = contactRow.normalizedDomain ?? "unknown.invalid";
    await advisoryLock(tx, `send-limit:domain:${domain}`);
    if ((await countSentForDomainSince(tx, domain, startOfDay)) >= ctx.config.perDomainDailyLimit) {
      throw new AutomationError(
        "per_domain_send_limit",
        `The per-domain daily limit (${ctx.config.perDomainDailyLimit}) is reached.`,
        "REJECTED",
      );
    }
    if ((await countSentForLead(tx, lead.id)) >= 1 + ctx.config.maxFollowups) {
      throw new AutomationError(
        "lead_send_limit",
        "This lead already received the maximum number of messages.",
        "REJECTED",
      );
    }
    if (await hasBlockingMessageState(tx, lead.id)) {
      throw new AutomationError(
        "lead_send_blocked",
        "A reserved or delivery-unknown message blocks further sends.",
        "REJECTED",
      );
    }

    // Reserve (prepared -> reserved) BEFORE the provider call. The unique
    // idempotency hash plus this conditional update make double-sends
    // impossible across processes.
    const reserved = await reserveMessage(tx, message.id);
    return { prepared: reserved, contact: contactRow, businessName: business.displayName };
  });

  // Emergency stop: checked immediately before the provider call.
  if (ctx.config.emergencyStop) {
    await withDatabase((db) =>
      recordMessageOutcome(db, prepared.id, {
        status: "failed",
        failureCode: "emergency_stop",
      }),
    );
    throw new AutomationError("emergency_stop", "Automation is halted by the emergency stop flag.", "FAILED");
  }

  // FINAL RECHECK after the reservation committed and immediately before
  // crossing the provider boundary. A suppression that committed while we
  // held the lock (or right after) is visible here — the provider is NOT
  // called. Once the provider call is in flight it cannot be recalled; a
  // suppression landing after this point still stops every future
  // follow-up (due-followups queries re-check suppression).
  const recheck = await withTransaction(async (tx) => {
    const row = await getContactByHash(tx, contact.addressHash);
    if (!row) return false;
    const state = await checkSuppression(tx, row.addressHash);
    return state.suppressed || state.unsubscribed;
  });
  if (recheck) {
    await withDatabase((db) =>
      recordMessageOutcome(db, prepared.id, {
        status: "failed",
        failureCode: "suppressed_before_provider",
      }),
    );
    throw new AutomationError(
      "contact_suppressed",
      "The contact was suppressed before the provider call.",
      "SUPPRESSED",
    );
  }

  let toAddress: string;
  try {
    toAddress = decryptContactAddress(contact.encryptedAddress ?? "", contactKeys.keys);
  } catch {
    throw new AutomationError("contact_decrypt_failed", "The stored contact could not be decrypted.", "FAILED");
  }

  const unsubscribeUrl = `${ctx.baseUrl}/api/unsubscribe?k=${unsubscribeToken(contact.addressHash, contactKeys.keys)}`;
  const provider = getEmailProvider();
  // Bounded provider call: a hung provider cannot hold pipeline state
  // indefinitely; a timeout resolves as delivery_unknown (never retried
  // automatically). Note: EmailJS does not support custom Message-ID /
  // List-Unsubscribe headers — the visible unsubscribe link in the body is
  // the authoritative mechanism.
  // Provider template parameters (EmailJS template; see
  // docs/emailjs-template-setup.md). The recipient address travels ONLY to
  // the provider over TLS — never into logs or stored results.
  const templateParams: Record<string, string> = {
    business_name: businessName,
    sender_name: ctx.config.senderName ?? "POC Gen",
    sender_intro: ctx.config.senderIntro ?? "",
    sender_linkedin_url: ctx.config.senderLinkedInUrl ?? "",
    preview_text: previewTextFrom(prepared.bodyText),
    ...(prepared.pocUrl ? { poc_url: prepared.pocUrl } : {}),
    postal_address: ctx.config.postalAddress ?? "",
    advertisement_disclosure: ctx.config.advertisementDisclosure ? "This is an advertisement." : "",
  };

  const outcome = await sendWithTimeout(
    provider,
    {
      toEncrypted: contact.id,
      toAddress,
      subject: prepared.subject,
      text: prepared.bodyText,
      html: prepared.bodyHtml,
      templateParams,
      headers: {
        messageId: buildMessageId(prepared.id, ctx.config.fromEmail ?? "outreach@localhost"),
        listUnsubscribe: `<${unsubscribeUrl}>`,
        listUnsubscribePost: true,
        from:
          ctx.config.senderName && ctx.config.fromEmail
            ? `${ctx.config.senderName} <${ctx.config.fromEmail}>`
            : (ctx.config.fromEmail ?? "outreach@localhost"),
        replyTo: ctx.config.replyTo,
      },
    },
    providerTimeoutMs(ctx),
  );

  await withDatabase((db) => recordMessageOutcome(db, prepared.id, outcome));

  let leadStatus: string;
  if (outcome.status === "sent") {
    leadStatus = await completeSendLifecycle(prepared.leadId, prepared.sequenceNumber, ctx);
  } else {
    const pair = await withTransaction((tx) => getLeadWithBusiness(tx, prepared.leadId));
    leadStatus = pair?.lead.status ?? "UNKNOWN";
  }

  await withDatabase(async (db) => {
    await writeAudit(db, {
      actor: ctx.principal,
      action: "send_outreach",
      targetType: "outreach_message",
      targetId: prepared.id,
      runId: ctx.runId ?? null,
      metadata: {
        leadId: prepared.leadId,
        sequenceNumber: prepared.sequenceNumber,
        outcome: outcome.status,
        provider: provider.name,
        domain: emailDomain(toAddress),
      },
    });
    if (ctx.runId) {
      await addRunStep(db, {
        runId: ctx.runId,
        operation: "send_outreach",
        leadId: prepared.leadId,
        status: outcome.status === "sent" ? "completed" : "failed",
        errorCode:
          outcome.status === "sent"
            ? null
            : outcome.status === "failed"
              ? outcome.failureCode
              : "delivery_unknown",
        startedAt: ctx.now,
        finishedAt: new Date(),
        summary: { outcome: outcome.status },
      });
    }
  });

  return {
    messageId: prepared.id,
    leadId: prepared.leadId,
    status: outcome.status,
    ...(outcome.status === "sent" && outcome.providerMessageId
      ? { providerMessageId: outcome.providerMessageId }
      : {}),
    leadStatus,
  };
}

/** Lifecycle transition after a successful send; safe to re-run. */
async function completeSendLifecycle(
  leadId: string,
  sequenceNumber: number,
  ctx: CallContext,
): Promise<string> {
  return withTransaction(async (tx) => {
    const pair = await getLeadWithBusiness(tx, leadId);
    if (!pair) throw new AutomationError("lead_not_found", "No such lead.", "REJECTED");
    const { lead } = pair;
    const target =
      sequenceNumber === 0 ? "CONTACTED" : sequenceNumber === 1 ? "FOLLOW_UP_1" : "FOLLOW_UP_2";
    if (lead.status === target) return target;
    const lastFollowup = sequenceNumber >= ctx.config.maxFollowups;
    await updateLeadStatus(tx, {
      leadId,
      from: requireLeadStatus(lead.status),
      to: target,
      nextActionAt: lastFollowup
        ? null
        : new Date(ctx.now.getTime() + FOLLOWUP_DELAY_DAYS * 86_400_000),
    });
    return target;
  });
}

export async function listDueFollowups(
  input: z.infer<typeof listDueFollowupsInputSchema>,
  ctx: CallContext,
) {
  const limit = input.limit ?? 25;
  return withDatabase(async (db) => {
    const candidates = await db
      .select({ lead: leads, business: businesses })
      .from(leads)
      .innerJoin(businesses, eq(leads.businessId, businesses.id))
      .where(and(inArray(leads.status, ["CONTACTED", "FOLLOW_UP_1"]), lte(leads.nextActionAt, ctx.now)))
      .orderBy(leads.nextActionAt)
      .limit(Math.min(limit * 3, 100));

    const due: Array<{
      leadId: string;
      displayName: string;
      slug: string;
      nextSequenceNumber: number;
      dueAt: string;
    }> = [];

    for (const candidate of candidates) {
      if (due.length >= limit) break;
      if ((await countRepliesForLead(db, candidate.lead.id)) > 0) continue; // any reply stops follow-ups
      if (await hasBlockingMessageState(db, candidate.lead.id)) continue;
      const sent = await countSentForLead(db, candidate.lead.id);
      if (sent === 0 || sent >= 1 + ctx.config.maxFollowups) continue;
      const poc = await getPocByLeadId(db, candidate.lead.id);
      if (!poc || poc.state !== "published") continue;
      if (poc.expiresAt && poc.expiresAt.getTime() <= ctx.now.getTime()) continue;
      const contact = await getVerifiedContactForBusiness(db, candidate.business.id);
      if (!contact) continue;
      const suppression = await checkSuppression(db, contact.addressHash);
      if (suppression.suppressed || suppression.unsubscribed) continue;
      const activeLink = (await listShareLinksForSlug(poc.slug)).some(
        (link) =>
          !link.revokedAt &&
          (!link.expiresAt || new Date(link.expiresAt).getTime() > ctx.now.getTime()),
      );
      if (!activeLink) continue;

      due.push({
        leadId: candidate.lead.id,
        displayName: candidate.business.displayName,
        slug: poc.slug,
        nextSequenceNumber: sent,
        dueAt: (candidate.lead.nextActionAt ?? ctx.now).toISOString(),
      });
    }

    return { due, count: due.length, limit };
  });
}
