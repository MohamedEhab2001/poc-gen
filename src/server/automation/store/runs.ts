import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { automationRunSteps, automationRuns } from "@/server/db/schema";
import type { AutomationRunRow, AutomationRunStepRow } from "@/server/db/schema";
import { redactedMetadata } from "@/lib/automation/redaction";
import type { Db, Queryable, Tx } from "../db";

/**
 * Automation runs and steps: an audit trail and resumable state model. No
 * daemon polls these tables — the external scheduler decides when to call
 * the next tool. Step result summaries are redacted before storage.
 */

export async function createRun(
  tx: Tx,
  input: { kind: string; requestedBy: string; parentRunId: string | null; now: Date },
): Promise<AutomationRunRow> {
  const inserted = await tx
    .insert(automationRuns)
    .values({
      id: randomUUID(),
      kind: input.kind,
      requestedBy: input.requestedBy,
      parentRunId: input.parentRunId,
      status: "running",
      counters: {},
      startedAt: input.now,
    })
    .returning();
  const first = inserted[0];
  if (!first) throw new Error("Run insert returned no row.");
  return first;
}

export async function getRun(db: Db, runId: string): Promise<AutomationRunRow | null> {
  const rows = await db.select().from(automationRuns).where(eq(automationRuns.id, runId)).limit(1);
  return rows[0] ?? null;
}

/** Merges numeric counters atomically (used by every run-scoped operation). */
export async function incrementRunCounters(
  db: Pick<Db, "update">,
  runId: string,
  deltas: Record<string, number>,
): Promise<void> {
  const entries = Object.entries(deltas);
  if (entries.length === 0) return;
  await db
    .update(automationRuns)
    .set({
      counters: sql`jsonb_concat(coalesce(${automationRuns.counters}, '{}'::jsonb), ${JSON.stringify(
        Object.fromEntries(entries.map(([key, value]) => [key, Number(value)])),
      )}::jsonb)`,
      updatedAt: new Date(),
    })
    .where(eq(automationRuns.id, runId));
}

export async function finishRun(
  db: Db,
  runId: string,
  status: "completed" | "completed_with_skips" | "failed" | "cancelled",
  now: Date,
): Promise<void> {
  await db
    .update(automationRuns)
    .set({ status, finishedAt: now, updatedAt: now })
    .where(eq(automationRuns.id, runId));
}

export interface AddStepInput {
  runId: string;
  operation: string;
  leadId: string | null;
  status: "running" | "completed" | "skipped" | "failed";
  errorCode?: string | null;
  attempt?: number;
  startedAt: Date;
  finishedAt?: Date | null;
  summary?: Record<string, unknown> | null;
}

export async function addRunStep(db: Queryable, input: AddStepInput): Promise<AutomationRunStepRow> {
  const inserted = await db
    .insert(automationRunSteps)
    .values({
      id: randomUUID(),
      runId: input.runId,
      operation: input.operation,
      leadId: input.leadId,
      status: input.status,
      errorCode: input.errorCode ?? null,
      attempt: input.attempt ?? 1,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt ?? null,
      resultSummary: input.summary ? redactedMetadata(input.summary) : null,
    })
    .returning();
  const first = inserted[0];
  if (!first) throw new Error("Run step insert returned no row.");
  return first;
}

export async function listRunSteps(db: Db, runId: string, limit = 200): Promise<AutomationRunStepRow[]> {
  return db
    .select()
    .from(automationRunSteps)
    .where(eq(automationRunSteps.runId, runId))
    .orderBy(desc(automationRunSteps.createdAt))
    .limit(limit);
}
