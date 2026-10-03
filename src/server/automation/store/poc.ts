import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { pocRecords, pocRevisions } from "@/server/db/schema";
import type { PocRecordRow } from "@/server/db/schema";
import { recordSchema } from "@/lib/poc/schema";
import type { BusinessPocRecord } from "@/lib/poc/schema";
import { AutomationError } from "@/lib/automation/outcomes";
import type { Db, Queryable, Tx } from "../db";

/**
 * POC records and immutable revision history. Every read passes through the
 * Zod recordSchema; invalid stored JSON fails closed with a structured error
 * and must never render. Updates insert the previous version into
 * poc_revisions INSIDE the same transaction.
 */

export type PocState = "draft" | "qa_passed" | "published" | "expired" | "archived" | "failed";

export class InvalidStoredRecordError extends AutomationError {
  constructor(slug: string) {
    super(
      "invalid_stored_record",
      "The stored record failed schema validation.",
      "QUARANTINED",
      undefined,
      { slug },
    );
  }
}

export function parseStoredRecord(slug: string, raw: unknown): BusinessPocRecord {
  const result = recordSchema.safeParse(raw);
  if (!result.success) {
    console.error(
      `[automation] Stored POC record failed schema validation (slug=${slug}); failing closed.`,
      { issues: result.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}: ${issue.code}`) },
    );
    throw new InvalidStoredRecordError(slug);
  }
  return result.data;
}

export async function getPocByLeadId(db: Queryable, leadId: string): Promise<PocRecordRow | null> {
  const rows = await db.select().from(pocRecords).where(eq(pocRecords.leadId, leadId)).limit(1);
  return rows[0] ?? null;
}

export async function getPocBySlug(db: Db, slug: string): Promise<PocRecordRow | null> {
  const rows = await db.select().from(pocRecords).where(eq(pocRecords.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getPocById(tx: Tx, id: string): Promise<PocRecordRow | null> {
  const rows = await tx.select().from(pocRecords).where(eq(pocRecords.id, id)).limit(1);
  return rows[0] ?? null;
}

export interface UpsertPocRowInput {
  leadId: string;
  slug: string;
  record: BusinessPocRecord;
  recordSchemaVersion: number;
  reason: string;
  changedBy: string;
  now: Date;
}

/**
 * Writes the current record. On update, the previous version lands in
 * poc_revisions in the same transaction, the optimistic version increments,
 * and the state resets to draft (a new revision invalidates QA/publication
 * until they run again — fail closed).
 */
export async function upsertPocRow(tx: Tx, input: UpsertPocRowInput): Promise<PocRecordRow> {
  const existing = await getPocByLeadId(tx, input.leadId);

  if (!existing) {
    const inserted = await tx
      .insert(pocRecords)
      .values({
        id: randomUUID(),
        leadId: input.leadId,
        slug: input.record.slug,
        record: input.record,
        recordSchemaVersion: input.recordSchemaVersion,
        version: 1,
        state: "draft",
      })
      .returning();
    const first = inserted[0];
    if (!first) throw new AutomationError("insert_failed", "The POC row could not be created.", "FAILED");
    return first;
  }

  if (existing.slug !== input.record.slug) {
    throw new AutomationError(
      "slug_change_not_allowed",
      "A published record's slug is immutable; delete and re-ingest instead.",
      "REJECTED",
    );
  }

  await tx.insert(pocRevisions).values({
    id: randomUUID(),
    pocRecordId: existing.id,
    version: existing.version,
    record: existing.record,
    reason: input.reason.slice(0, 200),
    changedBy: input.changedBy.slice(0, 200),
  });

  const updated = await tx
    .update(pocRecords)
    .set({
      record: input.record,
      recordSchemaVersion: input.recordSchemaVersion,
      version: sql`${pocRecords.version} + 1`,
      state: "draft",
      qaReport: null,
      publishedAt: null,
      updatedAt: input.now,
    })
    .where(and(eq(pocRecords.id, existing.id), eq(pocRecords.version, existing.version)))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new AutomationError(
      "poc_concurrently_modified",
      "The POC record changed while the operation was running.",
      "RETRYABLE",
      5,
    );
  }
  return row;
}

export async function countPocRevisions(db: Queryable, pocRecordId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(pocRevisions)
    .where(eq(pocRevisions.pocRecordId, pocRecordId));
  return rows[0]?.count ?? 0;
}

/** Conditional state transition on the record row (optimistic). */
export async function transitionPocState(
  tx: Tx,
  pocRecordId: string,
  from: PocState[],
  to: PocState,
  extra: { qaReport?: unknown; publishedAt?: Date | null } = {},
): Promise<PocRecordRow> {
  const updated = await tx
    .update(pocRecords)
    .set({
      state: to,
      ...(extra.qaReport !== undefined ? { qaReport: extra.qaReport as object } : {}),
      ...(extra.publishedAt !== undefined ? { publishedAt: extra.publishedAt } : {}),
      updatedAt: new Date(),
    })
    .where(sql`${pocRecords.id} = ${pocRecordId} AND ${pocRecords.state} IN (${sql.join(
      from.map((state) => sql`${state}`),
      sql`, `,
    )})`)
    .returning();
  const conflictRow = updated[0];
  if (!conflictRow) {
    throw new AutomationError(
      "poc_state_conflict",
      "The POC record is not in the expected state.",
      "RETRYABLE",
      5,
    );
  }
  return conflictRow;
}
