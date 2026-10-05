import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  outreachCampaignAreas,
  outreachCampaigns,
  outreachCampaignStates,
} from "@/server/db/schema";
import type {
  OutreachCampaignAreaRow,
  OutreachCampaignRow,
  OutreachCampaignStateRow,
} from "@/server/db/schema";
import type { Queryable, Tx } from "../db";

export type CampaignStateDefinition = { code: string; name: string };
export type CampaignAreaDefinition = { key: string; label: string };

export async function createCampaign(
  tx: Tx,
  input: {
    name: string;
    country: string;
    stateQueue: CampaignStateDefinition[];
    maxSendsPerRun: number;
    createdBy: string;
    now: Date;
  },
): Promise<OutreachCampaignRow> {
  const id = randomUUID();
  const inserted = await tx
    .insert(outreachCampaigns)
    .values({
      id,
      name: input.name,
      country: input.country,
      stateQueue: input.stateQueue,
      currentStateIndex: 0,
      status: "active",
      maxSendsPerRun: input.maxSendsPerRun,
      createdBy: input.createdBy,
      version: 1,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .returning();
  const campaign = inserted[0];
  if (!campaign) throw new Error("Campaign insert returned no row.");

  await tx.insert(outreachCampaignStates).values(
    input.stateQueue.map((state, index) => ({
      id: randomUUID(),
      campaignId: id,
      stateCode: state.code,
      stateName: state.name,
      queueIndex: index,
      status: index === 0 ? "active" : "pending",
      startedAt: index === 0 ? input.now : null,
      createdAt: input.now,
      updatedAt: input.now,
    })),
  );

  return campaign;
}

export async function getCampaign(db: Queryable, campaignId: string): Promise<OutreachCampaignRow | null> {
  const rows = await db
    .select()
    .from(outreachCampaigns)
    .where(eq(outreachCampaigns.id, campaignId))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCampaignByName(db: Queryable, name: string): Promise<OutreachCampaignRow | null> {
  const rows = await db
    .select()
    .from(outreachCampaigns)
    .where(eq(outreachCampaigns.name, name))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCampaignState(
  db: Queryable,
  campaignId: string,
  stateCode: string,
): Promise<OutreachCampaignStateRow | null> {
  const rows = await db
    .select()
    .from(outreachCampaignStates)
    .where(
      and(
        eq(outreachCampaignStates.campaignId, campaignId),
        eq(outreachCampaignStates.stateCode, stateCode),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getCurrentCampaignState(
  db: Queryable,
  campaign: OutreachCampaignRow,
): Promise<OutreachCampaignStateRow | null> {
  const current = campaign.stateQueue[campaign.currentStateIndex];
  if (!current) return null;
  return getCampaignState(db, campaign.id, current.code);
}

export async function listCampaignStates(
  db: Queryable,
  campaignId: string,
): Promise<OutreachCampaignStateRow[]> {
  return db
    .select()
    .from(outreachCampaignStates)
    .where(eq(outreachCampaignStates.campaignId, campaignId))
    .orderBy(asc(outreachCampaignStates.queueIndex));
}

export async function listPendingCampaignAreas(
  db: Queryable,
  campaignStateId: string,
  limit: number,
): Promise<OutreachCampaignAreaRow[]> {
  return db
    .select()
    .from(outreachCampaignAreas)
    .where(
      and(
        eq(outreachCampaignAreas.campaignStateId, campaignStateId),
        eq(outreachCampaignAreas.status, "pending"),
      ),
    )
    .orderBy(asc(outreachCampaignAreas.createdAt), asc(outreachCampaignAreas.areaKey))
    .limit(limit);
}

export async function listCampaignAreasByKeys(
  db: Queryable,
  campaignStateId: string,
  areaKeys: string[],
): Promise<OutreachCampaignAreaRow[]> {
  if (areaKeys.length === 0) return [];
  return db
    .select()
    .from(outreachCampaignAreas)
    .where(
      and(
        eq(outreachCampaignAreas.campaignStateId, campaignStateId),
        inArray(outreachCampaignAreas.areaKey, areaKeys),
      ),
    );
}

export async function planCampaignAreas(
  tx: Tx,
  campaignStateId: string,
  areas: CampaignAreaDefinition[],
  now: Date,
): Promise<{ insertedCount: number; plannedAreaCount: number }> {
  const inserted = await tx
    .insert(outreachCampaignAreas)
    .values(
      areas.map((area) => ({
        id: randomUUID(),
        campaignStateId,
        areaKey: area.key,
        label: area.label,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })),
    )
    .onConflictDoNothing({
      target: [outreachCampaignAreas.campaignStateId, outreachCampaignAreas.areaKey],
    })
    .returning({ id: outreachCampaignAreas.id });

  const totals = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachCampaignAreas)
    .where(eq(outreachCampaignAreas.campaignStateId, campaignStateId));
  const plannedAreaCount = totals[0]?.count ?? 0;
  await tx
    .update(outreachCampaignStates)
    .set({ plannedAreaCount, version: sql`${outreachCampaignStates.version} + 1`, updatedAt: now })
    .where(eq(outreachCampaignStates.id, campaignStateId));

  return { insertedCount: inserted.length, plannedAreaCount };
}

export async function completeCampaignAreas(
  tx: Tx,
  campaignStateId: string,
  areaKeys: string[],
  runId: string | null,
  now: Date,
): Promise<number> {
  if (areaKeys.length === 0) return 0;
  const rows = await tx
    .update(outreachCampaignAreas)
    .set({
      status: "completed",
      attempts: sql`${outreachCampaignAreas.attempts} + 1`,
      lastRunId: runId,
      lastSearchedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(outreachCampaignAreas.campaignStateId, campaignStateId),
        eq(outreachCampaignAreas.status, "pending"),
        inArray(outreachCampaignAreas.areaKey, areaKeys),
      ),
    )
    .returning({ id: outreachCampaignAreas.id });
  return rows.length;
}

export async function countPendingCampaignAreas(tx: Tx, campaignStateId: string): Promise<number> {
  const rows = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(outreachCampaignAreas)
    .where(
      and(
        eq(outreachCampaignAreas.campaignStateId, campaignStateId),
        eq(outreachCampaignAreas.status, "pending"),
      ),
    );
  return rows[0]?.count ?? 0;
}

export async function updateCampaignStateBatch(
  tx: Tx,
  input: {
    state: OutreachCampaignStateRow;
    processedAreaCount: number;
    discovered: number;
    qualified: number;
    queued: number;
    contacted: number;
    rejected: number;
    statewideSweep: boolean;
    runId: string | null;
    now: Date;
  },
): Promise<OutreachCampaignStateRow> {
  // Only broad statewide sweeps count toward closing a state. Empty city or
  // county batches must not accidentally advance the nationwide cursor.
  const consecutiveEmptyRuns = input.statewideSweep
    ? input.qualified === 0
      ? input.state.consecutiveEmptyRuns + 1
      : 0
    : input.qualified > 0
      ? 0
      : input.state.consecutiveEmptyRuns;
  const rows = await tx
    .update(outreachCampaignStates)
    .set({
      processedAreaCount: sql`${outreachCampaignStates.processedAreaCount} + ${input.processedAreaCount}`,
      consecutiveEmptyRuns,
      statewideSweepCount: sql`${outreachCampaignStates.statewideSweepCount} + ${input.statewideSweep ? 1 : 0}`,
      discoveredCount: sql`${outreachCampaignStates.discoveredCount} + ${input.discovered}`,
      qualifiedCount: sql`${outreachCampaignStates.qualifiedCount} + ${input.qualified}`,
      queuedCount: sql`${outreachCampaignStates.queuedCount} + ${input.queued}`,
      contactedCount: sql`${outreachCampaignStates.contactedCount} + ${input.contacted}`,
      rejectedCount: sql`${outreachCampaignStates.rejectedCount} + ${input.rejected}`,
      lastRunId: input.runId,
      lastSearchAt: input.now,
      version: sql`${outreachCampaignStates.version} + 1`,
      updatedAt: input.now,
    })
    .where(eq(outreachCampaignStates.id, input.state.id))
    .returning();
  const updated = rows[0];
  if (!updated) throw new Error("Campaign state update returned no row.");
  return updated;
}

export async function advanceCampaign(
  tx: Tx,
  campaign: OutreachCampaignRow,
  state: OutreachCampaignStateRow,
  now: Date,
): Promise<{ campaign: OutreachCampaignRow; advancedTo: CampaignStateDefinition | null }> {
  await tx
    .update(outreachCampaignStates)
    .set({ status: "completed", completedAt: now, version: sql`${outreachCampaignStates.version} + 1`, updatedAt: now })
    .where(eq(outreachCampaignStates.id, state.id));

  const nextIndex = campaign.currentStateIndex + 1;
  const next = campaign.stateQueue[nextIndex] ?? null;
  if (!next) {
    const rows = await tx
      .update(outreachCampaigns)
      .set({ status: "completed", completedAt: now, version: sql`${outreachCampaigns.version} + 1`, updatedAt: now })
      .where(eq(outreachCampaigns.id, campaign.id))
      .returning();
    const completed = rows[0];
    if (!completed) throw new Error("Campaign completion returned no row.");
    return { campaign: completed, advancedTo: null };
  }

  await tx
    .update(outreachCampaignStates)
    .set({ status: "active", startedAt: now, version: sql`${outreachCampaignStates.version} + 1`, updatedAt: now })
    .where(
      and(
        eq(outreachCampaignStates.campaignId, campaign.id),
        eq(outreachCampaignStates.stateCode, next.code),
      ),
    );
  const rows = await tx
    .update(outreachCampaigns)
    .set({ currentStateIndex: nextIndex, version: sql`${outreachCampaigns.version} + 1`, updatedAt: now })
    .where(eq(outreachCampaigns.id, campaign.id))
    .returning();
  const advanced = rows[0];
  if (!advanced) throw new Error("Campaign advance returned no row.");
  return { campaign: advanced, advancedTo: next };
}
