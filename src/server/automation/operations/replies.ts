import "server-only";

import { desc, eq } from "drizzle-orm";
import type { z } from "zod";
import type {
  interestedLeadsInputSchema,
  recordReplyInputSchema,
  suppressContactInputSchema,
} from "@/lib/automation/schemas";
import { businesses, leads, replyEvents, shareLinks } from "@/server/db/schema";
import { getPocByLeadId } from "../store/poc";
import { contactAddressHash } from "@/lib/automation/crypto";
import { normalizeEmailAddress } from "@/lib/automation/normalize";
import { AutomationError } from "@/lib/automation/outcomes";
import { canTransition, isLeadStatus } from "@/lib/automation/lifecycle";
import type { LeadStatus } from "@/lib/automation/lifecycle";
import { contactKeysOrThrow } from "../context";
import type { CallContext } from "../context";
import { withDatabase, withTransaction } from "../db";
import { writeAuditTx } from "../support";
import { addRunStep } from "../store/runs";
import { getLeadWithBusiness, updateLeadStatus } from "../store/leads";
import { listContactsForBusiness } from "../store/contacts";
import {
  addSuppression,
  addUnsubscribe,
  findLeadsForAddressHash,
} from "../store/contacts";
import { insertReplyEvent, listMessagesForLead, listReplyEventsForLead } from "../store/messages";

/**
 * record_reply_outcome, suppress_contact, get_interested_leads.
 *
 * Replies are classified by the external agent; actions here are
 * deterministic. Suppression and unsubscribe rows are created regardless of
 * the lead's lifecycle state (compliance first); lead transitions happen
 * only when the lifecycle table allows them. An OUT_OF_OFFICE reply defers
 * the next action exactly once, never indefinitely.
 */

const OUT_OF_OFFICE_DEFERRAL_DAYS = 3;

function requireLeadStatus(status: string): LeadStatus {
  if (!isLeadStatus(status)) {
    throw new AutomationError("lead_status_corrupt", "The lead has an unknown status.", "FAILED");
  }
  return status;
}

type ReplyInput = z.infer<typeof recordReplyInputSchema>;

export async function recordReplyOutcome(input: ReplyInput, ctx: CallContext) {
  return withTransaction(async (tx) => {
    const pair = await getLeadWithBusiness(tx, input.leadId);
    if (!pair) throw new AutomationError("lead_not_found", "No such lead.", "REJECTED");
    const { lead, business } = pair;
    const receivedAt = input.receivedAt ? new Date(input.receivedAt) : ctx.now;

    if (input.messageId) {
      const messages = await listMessagesForLead(tx, lead.id);
      if (!messages.some((m) => m.id === input.messageId)) {
        throw new AutomationError(
          "message_mismatch",
          "The referenced message does not belong to this lead.",
          "REJECTED",
        );
      }
    }

    await insertReplyEvent(tx, {
      leadId: lead.id,
      messageId: input.messageId ?? null,
      classification: input.classification,
      classifiedBy: ctx.principal,
      receivedAt,
    });

    // Compliance records first, independent of lifecycle legality.
    let suppressionCreated = false;
    const contacts = await listContactsForBusiness(tx, business.id);
    const targetContact = contacts.length > 0 ? contacts[0]! : null;
    if (["NOT_INTERESTED", "UNSUBSCRIBE", "BOUNCE"].includes(input.classification) && targetContact) {
      suppressionCreated = await addSuppression(tx, {
        addressHash: targetContact.addressHash,
        reason:
          input.classification === "NOT_INTERESTED"
            ? "not_interested"
            : input.classification === "UNSUBSCRIBE"
              ? "unsubscribe"
              : "bounce",
        leadId: lead.id,
      });
    }
    if (input.classification === "UNSUBSCRIBE" && targetContact) {
      await addUnsubscribe(tx, { addressHash: targetContact.addressHash, leadId: lead.id, method: "reply" });
    }

    let leadStatus = lead.status;
    let nextActionAt: Date | null = lead.nextActionAt;
    let followupsStopped = false;

    switch (input.classification) {
      case "INTERESTED":
      case "QUESTION": {
        if (canTransition(requireLeadStatus(lead.status), "INTERESTED")) {
          const updated = await updateLeadStatus(tx, {
            leadId: lead.id,
            from: requireLeadStatus(lead.status),
            to: "INTERESTED",
            nextActionAt: null,
          });
          leadStatus = updated.status;
        }
        followupsStopped = true;
        nextActionAt = null;
        break;
      }
      case "NOT_INTERESTED": {
        if (canTransition(requireLeadStatus(lead.status), "NOT_INTERESTED")) {
          const updated = await updateLeadStatus(tx, {
            leadId: lead.id,
            from: requireLeadStatus(lead.status),
            to: "NOT_INTERESTED",
            outcomeReason: "reply_not_interested",
            nextActionAt: null,
          });
          leadStatus = updated.status;
        }
        followupsStopped = true;
        nextActionAt = null;
        break;
      }
      case "UNSUBSCRIBE": {
        if (canTransition(requireLeadStatus(lead.status), "UNSUBSCRIBED")) {
          const updated = await updateLeadStatus(tx, {
            leadId: lead.id,
            from: requireLeadStatus(lead.status),
            to: "UNSUBSCRIBED",
            outcomeReason: "reply_unsubscribe",
            nextActionAt: null,
          });
          leadStatus = updated.status;
        }
        followupsStopped = true;
        nextActionAt = null;
        break;
      }
      case "BOUNCE": {
        if (canTransition(requireLeadStatus(lead.status), "BOUNCED")) {
          const updated = await updateLeadStatus(tx, {
            leadId: lead.id,
            from: requireLeadStatus(lead.status),
            to: "BOUNCED",
            outcomeReason: "reply_bounce",
            nextActionAt: null,
          });
          leadStatus = updated.status;
        }
        followupsStopped = true;
        nextActionAt = null;
        break;
      }
      case "OUT_OF_OFFICE": {
        // Defer once, bounded: a second OOO never moves the date again.
        const prior = await listReplyEventsForLead(tx, lead.id);
        const priorOoo = prior.filter((event) => event.classification === "OUT_OF_OFFICE").length;
        if (priorOoo <= 1 && lead.nextActionAt) {
          nextActionAt = new Date(ctx.now.getTime() + OUT_OF_OFFICE_DEFERRAL_DAYS * 86_400_000);
          await updateLeadStatus(tx, {
            leadId: lead.id,
            from: requireLeadStatus(lead.status),
            to: requireLeadStatus(lead.status),
            nextActionAt,
          });
        }
        break;
      }
      case "AMBIGUOUS": {
        // Stop automatic follow-ups; surface in exception reports. Never send
        // a speculative clarification automatically.
        await updateLeadStatus(tx, {
          leadId: lead.id,
          from: requireLeadStatus(lead.status),
          to: requireLeadStatus(lead.status),
          nextActionAt: null,
        });
        followupsStopped = true;
        nextActionAt = null;
        break;
      }
    }

    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "record_reply_outcome",
      targetType: "lead",
      targetId: lead.id,
      runId: ctx.runId ?? null,
      metadata: {
        classification: input.classification,
        leadStatus,
        suppressionCreated,
        followupsStopped,
      },
    });
    if (ctx.runId) {
      await addRunStep(tx, {
        runId: ctx.runId,
        operation: "record_reply_outcome",
        leadId: lead.id,
        status: "completed",
        startedAt: ctx.now,
        finishedAt: ctx.now,
        summary: { classification: input.classification },
      });
    }

    return {
      leadId: lead.id,
      classification: input.classification,
      leadStatus,
      followupsStopped,
      suppressionCreated,
      ...(nextActionAt ? { nextActionAt: nextActionAt.toISOString() } : {}),
    };
  });
}

export async function suppressContact(
  input: z.infer<typeof suppressContactInputSchema>,
  ctx: CallContext,
) {
  const keys = contactKeysOrThrow(ctx.config);

  let addressHashes: string[] = [];
  let leadIds: string[] = [];
  if (input.address) {
    const normalized = normalizeEmailAddress(input.address);
    if (!normalized) {
      throw new AutomationError("invalid_contact_address", "The address is not a usable email.", "REJECTED");
    }
    addressHashes = [contactAddressHash(normalized, keys.keys)];
  }
  if (input.leadId) {
    const found = await withTransaction(async (tx) => {
      const pair = await getLeadWithBusiness(tx, input.leadId!);
      if (!pair) throw new AutomationError("lead_not_found", "No such lead.", "REJECTED");
      const contacts = await listContactsForBusiness(tx, pair.business.id);
      return contacts.map((contact) => contact.addressHash);
    });
    addressHashes = [...new Set([...addressHashes, ...found])];
    leadIds = [input.leadId];
  }
  if (addressHashes.length === 0) {
    throw new AutomationError("no_contact_found", "No contact to suppress was found.", "REJECTED");
  }

  for (const addressHash of addressHashes) {
    await withTransaction(async (tx) => {
      const created = await addSuppression(tx, {
        addressHash,
        reason: input.reason,
        leadId: input.leadId ?? null,
        note: input.note ?? null,
      });
      const affected = await findLeadsForAddressHash(tx, addressHash);
      leadIds = [...new Set([...leadIds, ...affected])];
      await writeAuditTx(tx, {
        actor: ctx.principal,
        action: "suppress_contact",
        targetType: "contact",
        targetId: addressHash.slice(0, 12),
        runId: ctx.runId ?? null,
        metadata: { reason: input.reason, created, affectedLeadCount: affected.length },
      });
    });
  }

  return {
    suppressed: true,
    addressHashPrefix: (addressHashes[0] ?? "").slice(0, 12),
    reason: input.reason,
    leadIds: leadIds.slice(0, 10),
  };
}

export async function getInterestedLeads(
  input: z.infer<typeof interestedLeadsInputSchema>,
): Promise<{ leads: unknown[]; count: number }> {
  const limit = input.limit ?? 25;
  return withDatabase(async (db) => {
    const rows = await db
      .select({ lead: leads, business: businesses })
      .from(leads)
      .innerJoin(businesses, eq(leads.businessId, businesses.id))
      .where(eq(leads.status, "INTERESTED"))
      .orderBy(desc(leads.updatedAt))
      .limit(limit);

    const interested = [];
    for (const row of rows) {
      const replies = await db
        .select()
        .from(replyEvents)
        .where(eq(replyEvents.leadId, row.lead.id))
        .orderBy(desc(replyEvents.receivedAt))
        .limit(1);
      const lastReply = replies[0];
      const poc = await getPocByLeadId(db, row.lead.id);
      let shareViewCount: number | null = null;
      if (poc) {
        const linkRows = await db
          .select({ views: shareLinks.viewCount })
          .from(shareLinks)
          .where(eq(shareLinks.slug, poc.slug));
        shareViewCount = linkRows.reduce((sum, link) => sum + link.views, 0);
      }

      interested.push({
        leadId: row.lead.id,
        displayName: row.business.displayName,
        slug: poc?.slug ?? null,
        status: row.lead.status,
        ...(lastReply
          ? {
              lastReplyAt: lastReply.receivedAt.toISOString(),
              lastReplyClassification: lastReply.classification,
            }
          : {}),
        ...(shareViewCount !== null ? { shareViewCount } : {}),
      });
    }
    return { leads: interested, count: interested.length };
  });
}
