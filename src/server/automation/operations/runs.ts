import "server-only";

import { and, eq } from "drizzle-orm";
import { automationRuns } from "@/server/db/schema";
import { createRun, getRun, listRunSteps as listSteps } from "../store/runs";
import { listRepliesSince } from "../store/messages";
import { withDatabase, withTransaction } from "../db";
import { writeAuditTx } from "../support";
import type { CallContext } from "../context";
import { AutomationError } from "@/lib/automation/outcomes";
import type { z } from "zod";
import type {
  finishRunInputSchema,
  runReportInputSchema,
  startRunInputSchema,
} from "@/lib/automation/schemas";

/** start_automation_run: creates (or idempotently resumes) an automation run. */
export async function startAutomationRun(
  input: z.infer<typeof startRunInputSchema>,
  ctx: CallContext,
): Promise<{
  runId: string;
  kind: string;
  status: string;
  counters: Record<string, number>;
  resumed: boolean;
}> {
  const run = await withTransaction(async (tx) => {
    const created = await createRun(tx, {
      kind: input.kind,
      requestedBy: ctx.principal,
      parentRunId: input.parentRunId ?? null,
      now: ctx.now,
    });
    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "start_automation_run",
      targetType: "automation_run",
      targetId: created.id,
      metadata: { kind: input.kind, note: input.note ?? null },
    });
    return created;
  });
  return {
    runId: run.id,
    kind: run.kind,
    status: run.status,
    counters: run.counters ?? {},
    resumed: false,
  };
}

/**
 * get_run_report: STRICTLY read-only. Bounded, safe summary of a run — no
 * audit rows, no state changes, no counters mutated. Run completion is the
 * separate mutating finish_automation_run operation.
 */
export async function getRunReport(
  input: z.infer<typeof runReportInputSchema>,
): Promise<{
  runId: string;
  kind: string;
  status: string;
  requestedBy: string;
  counters: Record<string, number>;
  startedAt: string;
  finishedAt?: string;
  steps: Array<Record<string, unknown>>;
  exceptionReplies: Array<{ leadId: string; classification: string; receivedAt: string }>;
}> {
  return withDatabase(async (db) => {
    const run = await getRun(db, input.runId);
    if (!run) {
      throw new AutomationError("run_not_found", "No such automation run.", "REJECTED");
    }
    const steps = await listSteps(db, run.id, 200);
    const ambiguous = await listRepliesSince(db, run.startedAt, 50);
    const exceptionReplies = ambiguous
      .filter((reply) => reply.classification === "AMBIGUOUS")
      .map((reply) => ({
        leadId: reply.leadId,
        classification: reply.classification,
        receivedAt: reply.receivedAt.toISOString(),
      }));

    return {
      runId: run.id,
      kind: run.kind,
      status: run.status,
      requestedBy: run.requestedBy,
      counters: run.counters ?? {},
      startedAt: run.startedAt.toISOString(),
      ...(run.finishedAt ? { finishedAt: run.finishedAt.toISOString() } : {}),
      steps: steps
        .map((step) => ({
          operation: step.operation,
          ...(step.leadId ? { leadId: step.leadId } : {}),
          status: step.status,
          ...(step.errorCode ? { errorCode: step.errorCode } : {}),
          attempt: step.attempt,
          summary: step.resultSummary ?? null,
        }))
        .reverse(),
      exceptionReplies,
    };
  });
}

/**
 * finish_automation_run: the mutating completion. Derives the final status
 * from the run's steps (failed > completed_with_skips > completed), finishes
 * idempotently (an already-finished run returns its current state), and
 * writes the audit record.
 */
export async function finishAutomationRun(
  input: z.infer<typeof finishRunInputSchema>,
  ctx: CallContext,
): Promise<{
  runId: string;
  kind: string;
  status: string;
  derivedFrom: string;
  finishedAt?: string;
  stepCount: number;
  counters: Record<string, number>;
}> {
  return withTransaction(async (tx) => {
    const run = await getRun(tx, input.runId);
    if (!run) {
      throw new AutomationError("run_not_found", "No such automation run.", "REJECTED");
    }
    const steps = await listSteps(tx, run.id, 200);

    if (run.status === "running") {
      const failed = steps.some((step) => step.status === "failed");
      const skipped = steps.some((step) => step.status === "skipped");
      const derived = failed ? "failed" : skipped ? "completed_with_skips" : "completed";
      // Conditional update: only this call transitions a running run.
      const updated = await tx
        .update(automationRuns)
        .set({ status: derived, finishedAt: ctx.now, updatedAt: ctx.now })
        .where(and(eq(automationRuns.id, run.id), eq(automationRuns.status, "running")))
        .returning({ status: automationRuns.status, finishedAt: automationRuns.finishedAt });
      const row = updated[0];
      await writeAuditTx(tx, {
        actor: ctx.principal,
        action: "finish_automation_run",
        targetType: "automation_run",
        targetId: run.id,
        metadata: { derivedStatus: row?.status ?? derived },
      });
      return {
        runId: run.id,
        kind: run.kind,
        status: row?.status ?? derived,
        derivedFrom: "steps",
        ...(ctx.now ? { finishedAt: ctx.now.toISOString() } : {}),
        stepCount: steps.length,
        counters: run.counters ?? {},
      };
    }

    // Already finished: idempotent return of the persisted state.
    return {
      runId: run.id,
      kind: run.kind,
      status: run.status,
      derivedFrom: "already_finished",
      ...(run.finishedAt ? { finishedAt: run.finishedAt.toISOString() } : {}),
      stepCount: steps.length,
      counters: run.counters ?? {},
    };
  });
}
