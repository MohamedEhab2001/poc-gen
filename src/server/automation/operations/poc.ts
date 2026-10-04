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
import { recordExternalProviders } from "@/lib/automation/evidence";
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
  listSnapshotsForLead,
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
import { createShareLinkWithin } from "@/server/share/service";
import { PostgresShareLinkStore } from "@/server/share/store";

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

    // Deterministic provenance linkage: for EVERY external provider whose
    // facts appear in the record, at least one snapshot from that provider
    // must exist for this lead — one unrelated snapshot ID cannot launder an
    // entire record. (Deterministic linkage, not semantic verification of
    // each fact.)
    const requiredProviders = recordExternalProviders(input.record);
    if (requiredProviders.length > 0) {
      const snapshots = await listSnapshotsForLead(tx, lead.id);
      const snapshotProviders = new Set(snapshots.map((snapshot) => snapshot.provider));
      const missing = requiredProviders.filter((provider) => !snapshotProviders.has(provider));
      if (missing.length > 0) {
        throw new AutomationError(
          "provider_evidence_missing",
          "The record contains provider-sourced facts but no matching provider snapshot exists for this lead.",
          "REJECTED",
          undefined,
          { missingProviders: missing },
        );
      }
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

  // ONE transaction covers validation, link revocation, link creation, both
  // state transitions, the audit entry, and the run step. A failure at ANY
  // point (including share-link insertion) rolls back everything: a POC can
  // never end up published without its link.
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
      throw new AutomationError("qa_not_passed", "The lead has not passed QA.", "REJECTED", undefined, {
        leadStatus: lead.status,
      });
    }

    const record = parseStoredRecord(row.slug, row.record);
    // Revalidate renderability inside the transaction; createShareLinkWithin
    // re-checks the disposition again on the same record (defense in depth).

    // Republishing (a revised POC that re-passed QA): revoke every still
    // active link for this slug — their plaintext tokens are no longer
    // available, so they must never be reused — then create exactly one new
    // link below. Only the token HASH is persisted (Phase 1.2 invariant).
    await new PostgresShareLinkStore().revokeActiveBySlug(tx, row.slug, ctx.now);

    // Conditional single-row transitions: concurrent publishers cannot both
    // succeed past this point.
    await transitionPocState(tx, row.id, ["qa_passed"], "published", {
      publishedAt: ctx.now,
    });
    await updateLeadStatus(tx, {
      leadId: lead.id,
      from: requireLeadStatus(lead.status),
      to: "PUBLISHED",
    });

    // Link creation inside the transaction; refusal or failure rolls back
    // the transitions above.
    const created = await createShareLinkWithin(tx, {
      slug: row.slug,
      createdBy: ctx.principal,
      record,
      expiresInDays: input.expiresInDays ?? null,
      maxViews: input.maxViews ?? null,
      now: ctx.now,
    });
    if (!created) {
      throw new AutomationError("share_link_refused", "The record cannot currently be shared.", "REJECTED");
    }

    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "publish_poc",
      targetType: "poc_record",
      targetId: row.id,
      runId: ctx.runId ?? null,
      metadata: { leadId: lead.id, slug: row.slug, atomic: true },
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

    // The plaintext token exists ONLY in this return value, exactly once.
    return {
      pocRecordId: row.id,
      leadId: lead.id,
      slug: row.slug,
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
