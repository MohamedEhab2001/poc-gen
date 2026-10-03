import "server-only";

import type { z } from "zod";
import type {
  publishPocInputSchema,
  retryFailedLeadInputSchema,
  runQaInputSchema,
  upsertPocInputSchema,
} from "@/lib/automation/schemas";
import { themeIds } from "@/lib/poc/schema";
import { runDeterministicQa } from "@/lib/automation/qa";
import { AutomationError } from "@/lib/automation/outcomes";
import { isLeadStatus, isRetryRestorableStatus } from "@/lib/automation/lifecycle";
import type { LeadStatus } from "@/lib/automation/lifecycle";

/** Narrows a stored status string to the lifecycle type or fails closed. */
function requireLeadStatus(status: string): LeadStatus {
  if (!isLeadStatus(status)) {
    throw new AutomationError("lead_status_corrupt", "The lead has an unknown status.", "FAILED");
  }
  return status;
}
import type { CallContext } from "../context";
import { withTransaction } from "../db";
import { writeAuditTx } from "../support";
import { addRunStep, incrementRunCounters } from "../store/runs";
import {
  failLead,
  getLeadWithBusiness,
  resolveEvidenceRefs,
  restoreFailedLead,
  updateLeadStatus,
} from "../store/leads";
import {
  getPocByLeadId,
  parseStoredRecord,
  transitionPocState,
  upsertPocRow,
} from "../store/poc";
import { createShareLink } from "@/server/share/service";
import { listShareLinksForSlug } from "@/server/share/service";

/**
 * upsert_poc_record, run_poc_qa, publish_poc, retry_failed_lead.
 *
 * - Every record write/read passes through recordSchema; invalid stored JSON
 *   fails closed.
 * - Blocked facts never persist as renderable: the central render policy is
 *   re-run by the QA gate, and normalization hides blocked values at render
 *   time regardless.
 * - QA failures are terminal business failures (REJECTED / QUARANTINED).
 *   There is no override parameter and no manual review state.
 */

export async function upsertPocRecord(
  input: z.infer<typeof upsertPocInputSchema>,
  ctx: CallContext,
) {
  if (!(themeIds as readonly string[]).includes(input.record.themeId)) {
    throw new AutomationError(
      "unknown_theme",
      "The record's themeId is not in the thirteen-theme registry.",
      "REJECTED",
      undefined,
      { themeId: input.record.themeId },
    );
  }

  return withTransaction(async (tx) => {
    const pair = await getLeadWithBusiness(tx, input.leadId);
    if (!pair) throw new AutomationError("lead_not_found", "No such lead.", "REJECTED");
    const { lead } = pair;

    // Evidence references must belong to this lead; factual claims need at
    // least one snapshot behind them.
    if (input.evidenceRefs.length === 0) {
      throw new AutomationError(
        "evidence_required",
        "At least one evidence snapshot reference is required.",
        "REJECTED",
      );
    }
    const evidence = await resolveEvidenceRefs(tx, lead.id, input.evidenceRefs);
    if (evidence.missing.length > 0) {
      throw new AutomationError(
        "evidence_reference_invalid",
        "One or more evidence references do not belong to this lead.",
        "REJECTED",
        undefined,
        { missingCount: evidence.missing.length },
      );
    }

    const row = await upsertPocRow(tx, {
      leadId: lead.id,
      slug: input.record.slug,
      record: input.record,
      recordSchemaVersion: input.record.schemaVersion,
      reason: input.reason,
      changedBy: ctx.principal,
      now: ctx.now,
    });

    // Writing a new revision moves the lead to POC_GENERATED (a backwards
    // transition from QA_PASSED/PUBLISHED is legal and invalidates the
    // previous publication — fail closed until QA and publish re-run).
    const updatedLead = await updateLeadStatus(tx, {
      leadId: lead.id,
      from: requireLeadStatus(lead.status),
      to: "POC_GENERATED",
    });

    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "upsert_poc_record",
      targetType: "poc_record",
      targetId: row.id,
      runId: ctx.runId ?? null,
      metadata: {
        leadId: lead.id,
        version: row.version,
        revisionCreated: row.version > 1,
        evidenceCount: evidence.valid.length,
        themeId: input.record.themeId,
      },
    });

    if (ctx.runId) {
      await addRunStep(tx, {
        runId: ctx.runId,
        operation: "upsert_poc_record",
        leadId: lead.id,
        status: "completed",
        startedAt: ctx.now,
        finishedAt: ctx.now,
        summary: { version: row.version, slug: row.slug },
      });
    }

    return {
      pocRecordId: row.id,
      leadId: lead.id,
      slug: row.slug,
      version: row.version,
      state: row.state,
      revisionCreated: row.version > 1,
      leadStatus: updatedLead.status,
    };
  });
}

export async function runPocQa(input: z.infer<typeof runQaInputSchema>, ctx: CallContext) {
  return withTransaction(async (tx) => {
    const pair = await getLeadWithBusiness(tx, input.leadId);
    if (!pair) throw new AutomationError("lead_not_found", "No such lead.", "REJECTED");
    const { lead } = pair;

    const row = await getPocByLeadId(tx, lead.id);
    if (!row) {
      throw new AutomationError("poc_not_found", "The lead has no POC record yet.", "REJECTED");
    }

    let record;
    try {
      record = parseStoredRecord(row.slug, row.record);
    } catch {
      // Invalid stored JSON fails closed; the lead is quarantined.
      await failLead(tx, lead.id, requireLeadStatus(lead.status), "invalid_stored_record");
      throw new AutomationError(
        "invalid_stored_record",
        "The stored record failed schema validation.",
        "QUARANTINED",
      );
    }

    const report = runDeterministicQa(record, ctx.now);

    if (report.passed) {
      const updated = await transitionPocState(tx, row.id, ["draft", "qa_passed"], "qa_passed", {
        qaReport: report,
      });
      const updatedLead = await updateLeadStatus(tx, {
        leadId: lead.id,
        from: requireLeadStatus(lead.status),
        to: "QA_PASSED",
      });
      await writeAuditTx(tx, {
        actor: ctx.principal,
        action: "run_poc_qa",
        targetType: "poc_record",
        targetId: row.id,
        runId: ctx.runId ?? null,
        metadata: { passed: true, leadStatus: updatedLead.status },
      });
      if (ctx.runId) {
        await addRunStep(tx, {
          runId: ctx.runId,
          operation: "run_poc_qa",
          leadId: lead.id,
          status: "completed",
          startedAt: ctx.now,
          finishedAt: ctx.now,
          summary: { passed: true },
        });
      }
      return {
        leadId: lead.id,
        passed: true,
        blockingFailures: [] as string[],
        checks: report.checks,
        leadStatus: updatedLead.status,
        pocState: updated.state,
      };
    }

    // Deterministic failure: suspicious/inconsistent model problems are
    // quarantined; every other blocking failure is a terminal rejection.
    const suspicious = report.blockingFailures.some((code) =>
      ["RENDER_MODEL_OK", "RENDER_POLICY"].includes(code),
    );
    const outcomeStatus = suspicious ? "QUARANTINED" : "REJECTED";
    await transitionPocState(tx, row.id, ["draft", "qa_passed"], "draft", { qaReport: report });
    await updateLeadStatus(tx, {
      leadId: lead.id,
      from: requireLeadStatus(lead.status),
      to: outcomeStatus,
      outcomeReason: report.blockingFailures[0] ?? "qa_failed",
      nextActionAt: null,
    });
    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "run_poc_qa",
      targetType: "poc_record",
      targetId: row.id,
      runId: ctx.runId ?? null,
      metadata: { passed: false, blockingFailures: report.blockingFailures, outcomeStatus },
    });
    if (ctx.runId) {
      await addRunStep(tx, {
        runId: ctx.runId,
        operation: "run_poc_qa",
        leadId: lead.id,
        status: "skipped",
        errorCode: report.blockingFailures[0],
        startedAt: ctx.now,
        finishedAt: ctx.now,
        summary: { passed: false },
      });
      await incrementRunCounters(tx, ctx.runId, { qa_failures: 1 });
    }
    return {
      leadId: lead.id,
      passed: false,
      blockingFailures: report.blockingFailures,
      checks: report.checks,
      leadStatus: outcomeStatus,
      pocState: "draft",
    };
  });
}

export async function publishPoc(input: z.infer<typeof publishPocInputSchema>, ctx: CallContext) {
  // Emergency stop is checked immediately before publication.
  if (ctx.config.emergencyStop) {
    throw new AutomationError(
      "emergency_stop",
      "Automation is halted by the emergency stop flag.",
      "FAILED",
    );
  }

  return withTransaction(async (tx) => {
    const pair = await getLeadWithBusiness(tx, input.leadId);
    if (!pair) throw new AutomationError("lead_not_found", "No such lead.", "REJECTED");
    const { lead } = pair;

    const row = await getPocByLeadId(tx, lead.id);
    if (!row) throw new AutomationError("poc_not_found", "The lead has no POC record.", "REJECTED");

    // Require the QA-passed state — a QA failure cannot be overridden.
    if (row.state !== "qa_passed") {
      throw new AutomationError(
        "qa_not_passed",
        "The POC has not passed every blocking QA check.",
        "REJECTED",
        undefined,
        { pocState: row.state },
      );
    }
    if (lead.status !== "QA_PASSED") {
      throw new AutomationError(
        "qa_not_passed",
        "The lead has not passed QA.",
        "REJECTED",
        undefined,
        { leadStatus: lead.status },
      );
    }

    const record = parseStoredRecord(row.slug, row.record);

    await transitionPocState(tx, row.id, ["qa_passed"], "published", {
      publishedAt: ctx.now,
    });
    await updateLeadStatus(tx, {
      leadId: lead.id,
      from: requireLeadStatus(lead.status),
      to: "PUBLISHED",
    });

    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "publish_poc",
      targetType: "poc_record",
      targetId: row.id,
      runId: ctx.runId ?? null,
      metadata: { leadId: lead.id, slug: row.slug },
    });
    if (ctx.runId) {
      await addRunStep(tx, {
        runId: ctx.runId,
        operation: "publish_poc",
        leadId: lead.id,
        status: "completed",
        startedAt: ctx.now,
        finishedAt: ctx.now,
        summary: { slug: row.slug },
      });
    }

    return { pocRecordId: row.id, leadId: lead.id, slug: row.slug, record };
  }).then(async (base) => {
    // Share-link creation runs through the existing secure service (it
    // re-validates that the record currently renders). If an active link
    // already exists for this slug it is reused; the plaintext token is
    // returned exactly once, here.
    const existing = (await listShareLinksForSlug(base.slug)).find(
      (link) => !link.revokedAt && (!link.expiresAt || new Date(link.expiresAt).getTime() > ctx.now.getTime()),
    );
    if (existing) {
      return {
        ...base,
        shareLinkId: existing.id,
        shareLinkUrl: null,
        ...(existing.expiresAt ? { expiresAt: existing.expiresAt } : {}),
        ...(existing.maxViews !== null ? { maxViews: existing.maxViews } : {}),
        replayed: true,
      };
    }
    const created = await createShareLink({
      slug: base.slug,
      createdBy: ctx.principal,
      record: base.record,
      expiresInDays: input.expiresInDays ?? null,
      maxViews: input.maxViews ?? null,
    });
    if (!created) {
      throw new AutomationError(
        "share_link_refused",
        "The record cannot currently be shared.",
        "REJECTED",
      );
    }
    const { record: _record, ...rest } = base;
    void _record;
    return {
      ...rest,
      shareLinkId: created.id,
      shareLinkUrl: `${ctx.baseUrl}/p/${created.token}`,
      ...(created.expiresAt ? { expiresAt: created.expiresAt } : {}),
      ...(created.maxViews !== null ? { maxViews: created.maxViews } : {}),
      replayed: false,
    };
  });
}

export async function retryFailedLead(
  input: z.infer<typeof retryFailedLeadInputSchema>,
  ctx: CallContext,
) {
  return withTransaction(async (tx) => {
    const pair = await getLeadWithBusiness(tx, input.leadId);
    if (!pair) throw new AutomationError("lead_not_found", "No such lead.", "REJECTED");
    const { lead } = pair;
    if (lead.status !== "FAILED") {
      throw new AutomationError(
        "lead_not_failed",
        "Only technically failed leads can be retried.",
        "REJECTED",
        undefined,
        { leadStatus: lead.status },
      );
    }
    const previous = lead.previousStatus ?? "DISCOVERED";
    if (!isLeadStatus(previous) || !isRetryRestorableStatus(previous)) {
      throw new AutomationError(
        "retry_unsupported_previous_status",
        "The stored pre-failure status cannot be restored.",
        "REJECTED",
      );
    }
    // The explicit audited retry: the only legal exit from FAILED.
    const updated = await restoreFailedLead(tx, { leadId: lead.id, to: previous });
    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "retry_failed_lead",
      targetType: "lead",
      targetId: lead.id,
      runId: ctx.runId ?? null,
      metadata: { restoredStatus: previous },
    });
    return { leadId: lead.id, status: updated.status, previousStatus: previous };
  });
}
