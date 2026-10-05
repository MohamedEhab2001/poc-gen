import "server-only";

import type { z } from "zod";
import type {
  createCampaignInputSchema,
  getCampaignProgressInputSchema,
  planCampaignStateInputSchema,
  recordCampaignBatchInputSchema,
} from "@/lib/automation/schemas";
import { AutomationError } from "@/lib/automation/outcomes";
import type { CallContext } from "../context";
import { advisoryLock, withDatabase, withTransaction } from "../db";
import { writeAuditTx } from "../support";
import { addRunStep } from "../store/runs";
import {
  advanceCampaign,
  completeCampaignAreas,
  countPendingCampaignAreas,
  createCampaign,
  getCampaign,
  getCampaignByName,
  getCampaignState,
  getCurrentCampaignState,
  listCampaignAreasByKeys,
  listCampaignStates,
  listPendingCampaignAreas,
  planCampaignAreas,
  updateCampaignStateBatch,
} from "../store/campaigns";

export async function createStateCampaign(
  input: z.infer<typeof createCampaignInputSchema>,
  ctx: CallContext,
) {
  return withTransaction(async (tx) => {
    await advisoryLock(tx, `campaign-name:${input.name.toLowerCase()}`);
    const existing = await getCampaignByName(tx, input.name);
    if (existing) {
      throw new AutomationError(
        "campaign_name_exists",
        "A campaign with this name already exists.",
        "REJECTED",
      );
    }
    const campaign = await createCampaign(tx, {
      name: input.name,
      country: input.country ?? "United States",
      stateQueue: input.stateQueue,
      maxSendsPerRun: input.maxSendsPerRun ?? 3,
      createdBy: ctx.principal,
      now: ctx.now,
    });
    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "create_state_campaign",
      targetType: "outreach_campaign",
      targetId: campaign.id,
      runId: ctx.runId,
      metadata: {
        stateCount: input.stateQueue.length,
        firstState: input.stateQueue[0]?.code,
        maxSendsPerRun: campaign.maxSendsPerRun,
      },
    });
    if (ctx.runId) {
      await addRunStep(tx, {
        runId: ctx.runId,
        operation: "create_state_campaign",
        leadId: null,
        status: "completed",
        startedAt: ctx.now,
        finishedAt: ctx.now,
        summary: { campaignId: campaign.id, stateCount: input.stateQueue.length },
      });
    }
    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      currentState: input.stateQueue[0] ?? null,
      stateCount: input.stateQueue.length,
      maxSendsPerRun: campaign.maxSendsPerRun,
    };
  });
}

export async function planStateCampaign(
  input: z.infer<typeof planCampaignStateInputSchema>,
  ctx: CallContext,
) {
  return withTransaction(async (tx) => {
    await advisoryLock(tx, `campaign:${input.campaignId}`);
    const campaign = await getCampaign(tx, input.campaignId);
    if (!campaign) throw new AutomationError("campaign_not_found", "No such campaign.", "REJECTED");
    if (campaign.status !== "active") {
      throw new AutomationError("campaign_not_active", "The campaign is not active.", "REJECTED");
    }
    const state = await getCurrentCampaignState(tx, campaign);
    if (!state || state.stateCode !== input.stateCode || state.status !== "active") {
      throw new AutomationError(
        "campaign_state_mismatch",
        "Only the campaign's current active state may be planned.",
        "REJECTED",
      );
    }
    const planned = await planCampaignAreas(tx, state.id, input.areas, ctx.now);
    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "plan_campaign_state",
      targetType: "outreach_campaign",
      targetId: campaign.id,
      runId: ctx.runId,
      metadata: {
        stateCode: state.stateCode,
        submittedAreas: input.areas.length,
        insertedAreas: planned.insertedCount,
        plannedAreaCount: planned.plannedAreaCount,
      },
    });
    if (ctx.runId) {
      await addRunStep(tx, {
        runId: ctx.runId,
        operation: "plan_campaign_state",
        leadId: null,
        status: "completed",
        startedAt: ctx.now,
        finishedAt: ctx.now,
        summary: { stateCode: state.stateCode, plannedAreaCount: planned.plannedAreaCount },
      });
    }
    return {
      campaignId: campaign.id,
      stateCode: state.stateCode,
      insertedAreaCount: planned.insertedCount,
      plannedAreaCount: planned.plannedAreaCount,
    };
  });
}

export async function getStateCampaignProgress(
  input: z.infer<typeof getCampaignProgressInputSchema>,
) {
  return withDatabase(async (db) => {
    const campaign = input.campaignId
      ? await getCampaign(db, input.campaignId)
      : await getCampaignByName(db, input.campaignName!);
    if (!campaign) throw new AutomationError("campaign_not_found", "No such campaign.", "REJECTED");
    const currentState = await getCurrentCampaignState(db, campaign);
    const states = await listCampaignStates(db, campaign.id);
    const nextAreas = currentState
      ? await listPendingCampaignAreas(db, currentState.id, input.nextAreaLimit ?? 10)
      : [];
    return {
      campaignId: campaign.id,
      name: campaign.name,
      country: campaign.country,
      status: campaign.status,
      currentStateIndex: campaign.currentStateIndex,
      stateCount: campaign.stateQueue.length,
      maxSendsPerRun: campaign.maxSendsPerRun,
      currentState: currentState
        ? {
            code: currentState.stateCode,
            name: currentState.stateName,
            status: currentState.status,
            plannedAreaCount: currentState.plannedAreaCount,
            processedAreaCount: currentState.processedAreaCount,
            consecutiveEmptyRuns: currentState.consecutiveEmptyRuns,
            statewideSweepCount: currentState.statewideSweepCount,
            counters: {
              discovered: currentState.discoveredCount,
              qualified: currentState.qualifiedCount,
              queued: currentState.queuedCount,
              contacted: currentState.contactedCount,
              rejected: currentState.rejectedCount,
            },
          }
        : null,
      nextAreas: nextAreas.map((area) => ({ key: area.areaKey, label: area.label })),
      states: states.map((state) => ({
        code: state.stateCode,
        name: state.stateName,
        status: state.status,
        processedAreaCount: state.processedAreaCount,
        plannedAreaCount: state.plannedAreaCount,
        qualifiedCount: state.qualifiedCount,
        contactedCount: state.contactedCount,
      })),
    };
  });
}

export async function recordStateCampaignBatch(
  input: z.infer<typeof recordCampaignBatchInputSchema>,
  ctx: CallContext,
) {
  return withTransaction(async (tx) => {
    await advisoryLock(tx, `campaign:${input.campaignId}`);
    const campaign = await getCampaign(tx, input.campaignId);
    if (!campaign) throw new AutomationError("campaign_not_found", "No such campaign.", "REJECTED");
    if (campaign.status !== "active") {
      throw new AutomationError("campaign_not_active", "The campaign is not active.", "REJECTED");
    }
    const state = await getCampaignState(tx, campaign.id, input.stateCode);
    const current = campaign.stateQueue[campaign.currentStateIndex];
    if (!state || state.status !== "active" || current?.code !== state.stateCode) {
      throw new AutomationError(
        "campaign_state_mismatch",
        "The batch does not belong to the campaign's current active state.",
        "REJECTED",
      );
    }

    const requestedAreas = await listCampaignAreasByKeys(tx, state.id, input.completedAreaKeys);
    if (
      requestedAreas.length !== input.completedAreaKeys.length ||
      requestedAreas.some((area) => area.status !== "pending")
    ) {
      throw new AutomationError(
        "campaign_area_invalid",
        "Every completed area must be planned, pending, and belong to the current state.",
        "REJECTED",
      );
    }
    if (input.statewideSweep && state.plannedAreaCount === 0) {
      throw new AutomationError(
        "campaign_state_unplanned",
        "Plan the current state's search areas before recording a statewide sweep.",
        "REJECTED",
      );
    }

    const processedAreaCount = await completeCampaignAreas(
      tx,
      state.id,
      input.completedAreaKeys,
      input.runId ?? null,
      ctx.now,
    );
    const pendingAreaCount = await countPendingCampaignAreas(tx, state.id);
    if (input.statewideSweep && pendingAreaCount > 0) {
      throw new AutomationError(
        "campaign_sweep_before_areas_complete",
        "A statewide sweep may be recorded only after every planned area is complete.",
        "REJECTED",
      );
    }
    const updatedState = await updateCampaignStateBatch(tx, {
      state,
      processedAreaCount,
      discovered: input.counters.discovered,
      qualified: input.counters.qualified,
      queued: input.counters.queued,
      contacted: input.counters.contacted,
      rejected: input.counters.rejected,
      statewideSweep: input.statewideSweep,
      runId: input.runId ?? null,
      now: ctx.now,
    });
    const shouldAdvance =
      updatedState.plannedAreaCount > 0 &&
      pendingAreaCount === 0 &&
      updatedState.consecutiveEmptyRuns >= 2 &&
      updatedState.statewideSweepCount >= 2;
    const transition = shouldAdvance
      ? await advanceCampaign(tx, campaign, updatedState, ctx.now)
      : { campaign, advancedTo: null };

    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "record_campaign_batch",
      targetType: "outreach_campaign",
      targetId: campaign.id,
      runId: ctx.runId,
      metadata: {
        stateCode: state.stateCode,
        processedAreaCount,
        pendingAreaCount,
        qualified: input.counters.qualified,
        contacted: input.counters.contacted,
        statewideSweep: input.statewideSweep,
        advancedTo: transition.advancedTo?.code ?? null,
        campaignCompleted: transition.campaign.status === "completed",
      },
    });
    if (ctx.runId) {
      await addRunStep(tx, {
        runId: ctx.runId,
        operation: "record_campaign_batch",
        leadId: null,
        status: "completed",
        startedAt: ctx.now,
        finishedAt: ctx.now,
        summary: {
          stateCode: state.stateCode,
          processedAreaCount,
          pendingAreaCount,
          advancedTo: transition.advancedTo?.code ?? null,
        },
      });
    }

    return {
      campaignId: campaign.id,
      stateCode: state.stateCode,
      processedAreaCount,
      pendingAreaCount,
      consecutiveEmptyRuns: updatedState.consecutiveEmptyRuns,
      statewideSweepCount: updatedState.statewideSweepCount,
      advanced: shouldAdvance,
      advancedTo: transition.advancedTo ?? null,
      campaignStatus: transition.campaign.status,
    };
  });
}
