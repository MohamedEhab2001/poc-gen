import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { contacts, outreachMessages, replyEvents } from "@/server/db/schema";
import type { OutreachMessageRow, ReplyEventRow } from "@/server/db/schema";
import type { ProviderSendOutcome } from "../email/provider";
import { AutomationError } from "@/lib/automation/outcomes";
import type { Db, Queryable, Tx } from "../db";

/**
 * Outreach messages and reply events. A message reservation is a conditional
 * single-row UPDATE (prepared -> reserved), which is the only path to a
 * provider call; delivery_unknown is terminal (never auto-retried).
 */

export type MessageStatus = "prepared" | "reserved" | "sent" | "failed" | "delivery_unknown";

export interface InsertMessageInput {
  leadId: string;
  contactId: string;
  sequenceNumber: number;
  kind: "initial" | "followup";
  subject: string;
  /** Resolved share URL (token included — same sensitivity as the body). */
  pocUrl: string;
  bodyText: string;
  bodyHtml: string;
  idempotencyKeyHash: string;
}

export async function insertMessage(tx: Tx, input: InsertMessageInput): Promise<OutreachMessageRow> {
  const inserted = await tx
    .insert(outreachMessages)
    .values({
      id: randomUUID(),
      leadId: input.leadId,
      contactId: input.contactId,
      sequenceNumber: input.sequenceNumber,
      kind: input.kind,
      subject: input.subject,
      pocUrl: input.pocUrl,
      bodyText: input.bodyText,
      bodyHtml: input.bodyHtml,
      status: "prepared",
      idempotencyKeyHash: input.idempotencyKeyHash,
    })
    .returning();
  const first = inserted[0];
  if (!first) throw new AutomationError("insert_failed", "The message row could not be created.", "FAILED");
  return first;
}

export async function getMessage(db: Queryable, id: string): Promise<OutreachMessageRow | null> {
  const rows = await db.select().from(outreachMessages).where(eq(outreachMessages.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getMessageByKeyHash(db: Queryable, keyHash: string): Promise<OutreachMessageRow | null> {
  const rows = await db
    .select()
    .from(outreachMessages)
    .where(eq(outreachMessages.idempotencyKeyHash, keyHash))
    .limit(1);
  return rows[0] ?? null;
}

export async function listMessagesForLead(tx: Tx, leadId: string): Promise<OutreachMessageRow[]> {
  return tx.select().from(outreachMessages).where(eq(outreachMessages.leadId, leadId));
}

/**
 * Atomically reserves a prepared message for sending. Zero rows means a
 * concurrent reservation or an already-final status.
 */
export async function reserveMessage(tx: Tx, messageId: string): Promise<OutreachMessageRow> {
  const rows = await tx
    .update(outreachMessages)
    .set({ status: "reserved", reservedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(outreachMessages.id, messageId), eq(outreachMessages.status, "prepared")))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new AutomationError(
      "message_not_reservable",
      "The message is not in a preparable state (already reserved, sent, failed, or delivery-unknown).",
      "REJECTED",
    );
  }
  return row;
}

/** Alias so callers pass provider results directly. */
export type ProviderOutcome = ProviderSendOutcome;

export async function recordMessageOutcome(
  db: Queryable,
  messageId: string,
  outcome: ProviderOutcome,
): Promise<void> {
  await db
    .update(outreachMessages)
    .set({
      status: outcome.status,
      providerMessageId: outcome.status === "sent" ? outcome.providerMessageId : null,
      deliveryStatus: outcome.status,
      failureCode: outcome.status === "failed" ? outcome.failureCode : null,
      ...(outcome.status === "sent" ? { sentAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(eq(outreachMessages.id, messageId));
}

// ---------------------------------------------------------------------------
// Rate and volume limits (counts computed from SENT messages)
// ---------------------------------------------------------------------------

/**
 * Send ATTEMPTS since an instant: every message that was reserved (the
 * provider call happened or is in flight). Counting attempts rather than
 * completed sends keeps the daily limit correct under concurrency — the
 * reservation commits inside the advisory-locked transaction, later
 * transactions see it immediately.
 */
export async function countSentSince(db: Queryable, since: Date): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachMessages)
    .where(
      and(
        sql`${outreachMessages.reservedAt} IS NOT NULL`,
        gte(outreachMessages.reservedAt, since),
        sql`${outreachMessages.status} <> 'prepared'`,
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function countSentForContactSince(
  db: Queryable,
  contactId: string,
  since: Date,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachMessages)
    .where(
      and(eq(outreachMessages.status, "sent"), eq(outreachMessages.contactId, contactId), gte(outreachMessages.sentAt, since)),
    );
  return rows[0]?.count ?? 0;
}

export async function countSentForLead(db: Queryable, leadId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachMessages)
    .where(and(eq(outreachMessages.status, "sent"), eq(outreachMessages.leadId, leadId)));
  return rows[0]?.count ?? 0;
}

/** Messages stuck in non-final prepared states that block further sends. */
export async function hasBlockingMessageState(db: Queryable, leadId: string): Promise<boolean> {
  const rows = await db
    .select({ status: outreachMessages.status })
    .from(outreachMessages)
    .where(
      and(
        eq(outreachMessages.leadId, leadId),
        sql`${outreachMessages.status} IN ('reserved', 'delivery_unknown')`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** Sends to one email domain since a given instant (per-domain limits). */
/** Per-domain send ATTEMPTS since an instant (see countSentSince). */
export async function countSentForDomainSince(
  db: Queryable,
  domain: string,
  since: Date,
): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachMessages)
    .innerJoin(contacts, eq(outreachMessages.contactId, contacts.id))
    .where(
      and(
        sql`${outreachMessages.reservedAt} IS NOT NULL`,
        gte(outreachMessages.reservedAt, since),
        sql`${outreachMessages.status} <> 'prepared'`,
        eq(contacts.normalizedDomain, domain),
      ),
    );
  return rows[0]?.count ?? 0;
}

// ---------------------------------------------------------------------------
// Reply events
// ---------------------------------------------------------------------------

export async function insertReplyEvent(
  tx: Tx,
  input: {
    leadId: string;
    messageId: string | null;
    classification: string;
    classifiedBy: string;
    receivedAt: Date;
  },
): Promise<ReplyEventRow> {
  const inserted = await tx
    .insert(replyEvents)
    .values({
      id: randomUUID(),
      leadId: input.leadId,
      messageId: input.messageId,
      classification: input.classification,
      classifiedBy: input.classifiedBy,
      receivedAt: input.receivedAt,
    })
    .returning();
  const first = inserted[0];
  if (!first) throw new AutomationError("insert_failed", "The reply event could not be created.", "FAILED");
  return first;
}

export async function listReplyEventsForLead(db: Queryable, leadId: string): Promise<ReplyEventRow[]> {
  return db.select().from(replyEvents).where(eq(replyEvents.leadId, leadId));
}

export async function listRepliesSince(db: Db, since: Date, limit = 50): Promise<ReplyEventRow[]> {
  return db
    .select()
    .from(replyEvents)
    .where(gte(replyEvents.receivedAt, since))
    .orderBy(replyEvents.receivedAt)
    .limit(limit);
}

export async function countRepliesForLead(db: Queryable, leadId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(replyEvents)
    .where(eq(replyEvents.leadId, leadId));
  return rows[0]?.count ?? 0;
}
