import "server-only";

import { createRun, getRun, finishRun, listRunSteps } from "../store/runs";
import { listRepliesSince } from "../store/messages";
import { withDatabase, withTransaction } from "../db";
import { writeAudit, writeAuditTx } from "../support";
import type { CallContext } from "../context";
import { AutomationError } from "@/lib/automation/outcomes";
import type { z } from "zod";
import type { runReportInputSchema, startRunInputSchema } from "@/lib/automation/schemas";

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
 * get_run_report: bounded, safe summary of a run. With finish:true it also
 * closes the run (status derived from its steps) — the daily report is the
 * natural close of a scheduled cycle.
 */
export async function getRunReport(
  input: z.infer<typeof runReportInputSchema>,
  ctx: CallContext,
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
    const steps = await listRunSteps(db, run.id, 200);
    const ambiguous = await listRepliesSince(db, run.startedAt, 50);
    const exceptionReplies = ambiguous
      .filter((reply) => reply.classification === "AMBIGUOUS")
      .map((reply) => ({
        leadId: reply.leadId,
        classification: reply.classification,
        receivedAt: reply.receivedAt.toISOString(),
      }));

    let status = run.status;
    if (input.finish && run.status === "running") {
      const derived = steps.some((s) => s.status === "failed")
        ? "failed"
        : steps.some((s) => s.status === "skipped")
          ? "completed_with_skips"
          : "completed";
      await finishRun(db, run.id, derived, ctx.now);
      await writeAudit(db, {
        actor: ctx.principal,
        action: "finish_automation_run",
        targetType: "automation_run",
        targetId: run.id,
        metadata: { derivedStatus: derived },
      });
      status = derived;
    }

    return {
      runId: run.id,
      kind: run.kind,
      status,
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
