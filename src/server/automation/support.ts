import "server-only";

import { and, eq, lt } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { auditLogs, automationIdempotency } from "@/server/db/schema";
import { hashIdempotencyKey, hashRequest } from "@/lib/automation/canonical";
import { AutomationError } from "@/lib/automation/outcomes";
import { redactedMetadata } from "@/lib/automation/redaction";
import type { Db, Tx } from "./db";

/**
 * Idempotency ledger and audit logging.
 *
 * Every mutating automation operation requires an idempotency key. The
 * reservation commits BEFORE the operation runs, so a crash mid-operation
 * leaves a pending entry that expires (TTL) and can be reclaimed. Replaying
 * the same key with the same request returns the saved result; the same key
 * with a DIFFERENT request is a conflict and never executes.
 */

export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export interface IdempotencyAcquireInput {
  db: Db;
  operation: string;
  principal: string;
  idempotencyKey: string;
  request: unknown;
  now: Date;
}

export type IdempotencyAcquire =
  | { kind: "new" }
  | { kind: "replay"; result: unknown }
  | { kind: "in_progress"; retryAfterSeconds: number };

export async function acquireIdempotency(input: IdempotencyAcquireInput): Promise<IdempotencyAcquire> {
  const keyHash = hashIdempotencyKey(input.operation, input.idempotencyKey);
  const requestHash = hashRequest(input.operation, input.request);
  const expiresAt = new Date(input.now.getTime() + IDEMPOTENCY_TTL_MS);

  const inserted = await input.db
    .insert(automationIdempotency)
    .values({
      id: randomUUID(),
      operation: input.operation,
      principal: input.principal,
      keyHash,
      requestHash,
      status: "pending",
      expiresAt,
    })
    .onConflictDoNothing({ target: [automationIdempotency.operation, automationIdempotency.keyHash] })
    .returning({ id: automationIdempotency.id });

  if (inserted.length > 0) return { kind: "new" };

  const existing = await input.db
    .select()
    .from(automationIdempotency)
    .where(and(eq(automationIdempotency.operation, input.operation), eq(automationIdempotency.keyHash, keyHash)))
    .limit(1);
  const row = existing[0];
  if (!row) {
    // Extremely unlikely race: conflict then disappearance. Treat as new.
    return { kind: "new" };
  }
  if (row.requestHash !== requestHash) {
    throw new AutomationError(
      "idempotency_key_conflict",
      "This idempotency key was already used with a different request.",
      "REJECTED",
    );
  }
  if (row.status === "completed" || row.status === "failed") {
    // A saved failure is a saved result: replaying returns it; the caller
    // must use a NEW key to actually retry the operation.
    return { kind: "replay", result: row.result };
  }
  if (row.status === "pending" && row.expiresAt.getTime() > input.now.getTime()) {
    return { kind: "in_progress", retryAfterSeconds: Math.max(5, Math.ceil((row.expiresAt.getTime() - input.now.getTime()) / 1000)) };
  }
  // Pending but expired: reclaim atomically.
  const reclaimed = await input.db
    .update(automationIdempotency)
    .set({ expiresAt, status: "pending", createdAt: input.now })
    .where(and(eq(automationIdempotency.id, row.id), lt(automationIdempotency.expiresAt, input.now)))
    .returning({ id: automationIdempotency.id });
  if (reclaimed.length > 0) return { kind: "new" };
  return { kind: "in_progress", retryAfterSeconds: 30 };
}

export async function completeIdempotency(input: {
  db: Db;
  operation: string;
  idempotencyKey: string;
  status: "completed" | "failed";
  result: unknown;
}): Promise<void> {
  const keyHash = hashIdempotencyKey(input.operation, input.idempotencyKey);
  await input.db
    .update(automationIdempotency)
    .set({ status: input.status, result: redactedMetadata({ value: input.result }) as object })
    .where(and(eq(automationIdempotency.operation, input.operation), eq(automationIdempotency.keyHash, keyHash)));
}

/** Purge helper for operators (documented, not called by the automation loop). */
export async function purgeExpiredIdempotency(db: Db, now: Date): Promise<number> {
  const deleted = await db
    .delete(automationIdempotency)
    .where(lt(automationIdempotency.expiresAt, now))
    .returning({ id: automationIdempotency.id });
  return deleted.length;
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

export interface AuditEntry {
  actor: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  runId?: string | null;
  metadata?: Record<string, unknown>;
}

export async function writeAudit(db: Db, entry: AuditEntry): Promise<void> {
  await db.insert(auditLogs).values({
    id: randomUUID(),
    actor: entry.actor.slice(0, 200),
    action: entry.action.slice(0, 64),
    targetType: entry.targetType?.slice(0, 48) ?? null,
    targetId: entry.targetId?.slice(0, 64) ?? null,
    runId: entry.runId ?? null,
    metadata: entry.metadata ? redactedMetadata(entry.metadata) : null,
  });
}

export async function writeAuditTx(tx: Tx, entry: AuditEntry): Promise<void> {
  await tx.insert(auditLogs).values({
    id: randomUUID(),
    actor: entry.actor.slice(0, 200),
    action: entry.action.slice(0, 64),
    targetType: entry.targetType?.slice(0, 48) ?? null,
    targetId: entry.targetId?.slice(0, 64) ?? null,
    runId: entry.runId ?? null,
    metadata: entry.metadata ? redactedMetadata(entry.metadata) : null,
  });
}
