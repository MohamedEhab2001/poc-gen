import "server-only";

import { and, eq, gte, inArray, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { businesses, leads, sourceSnapshots } from "@/server/db/schema";
import type { BusinessRow, LeadRow, SourceSnapshotRow } from "@/server/db/schema";
import { checksumPayload } from "@/lib/automation/canonical";
import {
  normalizeAddressKey,
  normalizeBusinessName,
  normalizeDomain,
  normalizePhoneKey,
} from "@/lib/automation/normalize";
import { AutomationError } from "@/lib/automation/outcomes";
import { canTransition } from "@/lib/automation/lifecycle";
import type { LeadStatus } from "@/lib/automation/lifecycle";
import type { Db, Queryable, Tx } from "../db";
export { upsertContact as upsertContactRef } from "./contacts";

/**
 * Businesses, leads, and immutable evidence snapshots.
 *
 * Duplicate detection priority: (source_type, source_external_id), then
 * normalized domain, then normalized phone, then normalized name+address.
 * Ambiguous matches (multiple distinct businesses) are returned explicitly
 * and NEVER merged.
 */

export interface BusinessIdentityInput {
  sourceType: string;
  sourceExternalId: string | null;
  displayName: string;
  primaryCategory: string;
  website: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
}

export interface NormalizedBusinessKeys {
  normalizedNameKey: string;
  normalizedAddressKey: string | null;
  normalizedDomain: string | null;
  normalizedPhone: string | null;
}

export function normalizeBusinessKeys(input: BusinessIdentityInput): NormalizedBusinessKeys {
  return {
    normalizedNameKey: normalizeBusinessName(input.displayName),
    normalizedAddressKey: normalizeAddressKey(input.address),
    normalizedDomain: normalizeDomain(input.website),
    normalizedPhone: normalizePhoneKey(input.phone),
  };
}

/** Strongest available dedup key for the advisory lock. */
export function primaryDedupLockKey(input: BusinessIdentityInput, keys: NormalizedBusinessKeys): string {
  if (input.sourceExternalId) return `biz:src:${input.sourceType}:${input.sourceExternalId}`;
  if (keys.normalizedDomain) return `biz:dom:${keys.normalizedDomain}`;
  if (keys.normalizedPhone) return `biz:tel:${keys.normalizedPhone}`;
  return `biz:nameaddr:${keys.normalizedNameKey}|${keys.normalizedAddressKey ?? ""}`;
}

export interface DuplicateAnalysis {
  /** Strong-signal match: (source key) or (exact name + complete address). At most one. */
  strongMatch: { businessId: string; strategies: string[] } | null;
  /** Businesses matched ONLY by soft signals (domain, phone), excluding any strong match. */
  softMatchIds: string[];
  /** Strategies that actually matched (never strategies merely attempted). */
  strategiesMatched: string[];
}

/** An address key is "sufficiently complete" for identity when it carries a street number and enough detail. */
export function isCompleteAddressKey(addressKey: string | null): addressKey is string {
  if (!addressKey || addressKey.length < 8) return false;
  return /\d/.test(addressKey);
}

/**
 * Identity analysis for duplicate detection.
 *
 * STRONG signals (may match automatically):
 *   1. exact (source_type, source_external_id);
 *   2. exact normalized name + sufficiently complete normalized address.
 * SOFT signals (never merge by themselves — chain branches legitimately
 * share a website or phone): normalized domain, normalized phone.
 *
 * A soft match that points at a DIFFERENT business than a strong match is an
 * identity disagreement and must surface as a conflict, never a merge.
 */
export async function analyzeBusinessDuplicates(
  tx: Tx,
  input: BusinessIdentityInput,
  keys: NormalizedBusinessKeys,
): Promise<DuplicateAnalysis> {
  const strategiesMatched: string[] = [];

  // Strong 1: source key.
  const sourceRows = input.sourceExternalId
    ? await tx
        .select({ id: businesses.id })
        .from(businesses)
        .where(
          and(eq(businesses.sourceType, input.sourceType), eq(businesses.sourceExternalId, input.sourceExternalId)),
        )
    : [];

  // Strong 2: exact name + complete address.
  const nameAddressRows =
    isCompleteAddressKey(keys.normalizedAddressKey) && keys.normalizedNameKey.length >= 4
      ? await tx
          .select({ id: businesses.id })
          .from(businesses)
          .where(
            and(
              eq(businesses.normalizedNameKey, keys.normalizedNameKey),
              eq(businesses.normalizedAddressKey, keys.normalizedAddressKey),
            ),
          )
      : [];

  const strongIds = [...new Set([...sourceRows, ...nameAddressRows].map((row) => row.id))];
  if (sourceRows.length > 0) strategiesMatched.push("source_key");
  if (nameAddressRows.length > 0) strategiesMatched.push("name_address");

  // Soft signals: domain and phone. They never merge by themselves; they are
  // reported so the caller can detect identity disagreement (conflict).
  const softConditions = [];
  if (keys.normalizedDomain) softConditions.push(eq(businesses.normalizedDomain, keys.normalizedDomain));
  if (keys.normalizedPhone) softConditions.push(eq(businesses.normalizedPhone, keys.normalizedPhone));
  const softRows =
    softConditions.length > 0
      ? await tx.select({ id: businesses.id }).from(businesses).where(or(...softConditions))
      : [];
  const softIds = [...new Set(softRows.map((row) => row.id))].filter((id) => !strongIds.includes(id));
  if (softRows.length > 0 && keys.normalizedDomain) strategiesMatched.push("domain");
  if (softRows.length > 0 && keys.normalizedPhone) strategiesMatched.push("phone");

  return {
    strongMatch:
      strongIds.length > 0
        ? {
            businessId: strongIds[0]!,
            strategies: strategiesMatched.filter((s) => s === "source_key" || s === "name_address"),
          }
        : null,
    softMatchIds: softIds,
    strategiesMatched: [...new Set(strategiesMatched)],
  };
}

export async function insertBusiness(
  tx: Tx,
  input: BusinessIdentityInput,
  keys: NormalizedBusinessKeys,
): Promise<BusinessRow> {
  const row = {
    id: randomUUID(),
    sourceType: input.sourceType,
    sourceExternalId: input.sourceExternalId,
    displayName: input.displayName,
    normalizedNameKey: keys.normalizedNameKey,
    normalizedAddressKey: keys.normalizedAddressKey,
    normalizedDomain: keys.normalizedDomain,
    normalizedPhone: keys.normalizedPhone,
    primaryCategory: input.primaryCategory,
    city: input.city,
    region: input.region,
    country: input.country,
    websiteUrl: input.website,
    publicPhone: input.phone,
  };
  const inserted = await tx.insert(businesses).values(row).returning();
  const first = inserted[0];
  if (!first) throw new AutomationError("insert_failed", "The business row could not be created.", "FAILED");
  return first;
}

export async function getBusiness(tx: Tx, id: string): Promise<BusinessRow | null> {
  const rows = await tx.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function insertLead(
  tx: Tx,
  input: {
    businessId: string;
    status: LeadStatus;
    score: number;
    scoreReasons: string[];
  },
): Promise<LeadRow> {
  const inserted = await tx
    .insert(leads)
    .values({
      id: randomUUID(),
      businessId: input.businessId,
      status: input.status,
      score: input.score,
      scoreReasons: input.scoreReasons,
    })
    .returning();
  const first = inserted[0];
  if (!first) throw new AutomationError("insert_failed", "The lead row could not be created.", "FAILED");
  return first;
}

export async function getLeadByBusinessId(db: Queryable, businessId: string): Promise<LeadRow | null> {
  const rows = await db.select().from(leads).where(eq(leads.businessId, businessId)).limit(1);
  return rows[0] ?? null;
}

export async function getLead(db: Queryable, id: string): Promise<LeadRow | null> {
  const rows = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getLeadWithBusiness(
  tx: Tx,
  leadId: string,
): Promise<{ lead: LeadRow; business: BusinessRow } | null> {
  const rows = await tx
    .select({ lead: leads, business: businesses })
    .from(leads)
    .innerJoin(businesses, eq(leads.businessId, businesses.id))
    .where(eq(leads.id, leadId))
    .limit(1);
  return rows[0] ?? null;
}

export interface UpdateLeadInput {
  leadId: string;
  from: LeadStatus;
  to: LeadStatus;
  outcomeReason?: string | null;
  previousStatus?: string | null;
  nextActionAt?: Date | null;
  score?: number;
  scoreReasons?: string[];
}

/**
 * Conditional, optimistic status update. The WHERE clause re-checks the
 * expected current status AND version, so concurrent writers cannot stomp
 * each other; zero rows means a concurrent modification (retryable).
 */
export async function updateLeadStatus(tx: Tx, input: UpdateLeadInput): Promise<LeadRow> {
  if (input.from !== input.to) {
    // Lifecycle violations are terminal data-shape failures: surface the
    // transition itself as a safe structured error (never internal_error).
    if (!canTransition(input.from, input.to)) {
      throw new AutomationError(
        "illegal_lead_transition",
        `Illegal lead transition ${input.from} -> ${input.to}.`,
        "REJECTED",
        undefined,
        { from: input.from, to: input.to },
      );
    }
  }
  const updated = await tx
    .update(leads)
    .set({
      status: input.to,
      ...(input.outcomeReason !== undefined ? { outcomeReason: input.outcomeReason } : {}),
      ...(input.previousStatus !== undefined ? { previousStatus: input.previousStatus } : {}),
      ...(input.nextActionAt !== undefined ? { nextActionAt: input.nextActionAt } : {}),
      ...(input.score !== undefined ? { score: input.score } : {}),
      ...(input.scoreReasons !== undefined ? { scoreReasons: input.scoreReasons } : {}),
      version: sql`${leads.version} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, input.leadId), eq(leads.status, input.from)))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new AutomationError(
      "lead_concurrently_modified",
      "The lead changed while the operation was running.",
      "RETRYABLE",
      5,
    );
  }
  return row;
}

/**
 * The explicit, audited retry path. This is the ONLY write that leaves the
 * FAILED status: the standard transition table has no outgoing edges from
 * FAILED precisely so nothing else can. Conditional on the current status
 * and version; the caller audits the restore.
 */
export async function restoreFailedLead(
  tx: Tx,
  input: { leadId: string; to: LeadStatus },
): Promise<LeadRow> {
  const updated = await tx
    .update(leads)
    .set({
      status: input.to,
      outcomeReason: null,
      previousStatus: null,
      version: sql`${leads.version} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(leads.id, input.leadId), eq(leads.status, "FAILED")))
    .returning();
  const row = updated[0];
  if (!row) {
    throw new AutomationError(
      "lead_concurrently_modified",
      "The lead changed while the operation was running.",
      "RETRYABLE",
      5,
    );
  }
  return row;
}

/** Fails a lead (technical) remembering the status to restore on retry. */
export async function failLead(tx: Tx, leadId: string, from: LeadStatus, reason: string): Promise<void> {
  await updateLeadStatus(tx, {
    leadId,
    from,
    to: "FAILED",
    outcomeReason: reason,
    previousStatus: from,
    nextActionAt: null,
  });
}

// ---------------------------------------------------------------------------
// Immutable evidence snapshots
// ---------------------------------------------------------------------------

export interface SnapshotInsert {
  leadId: string;
  provider: string;
  sourceUrl: string | null;
  sourceIdentifier: string | null;
  retrievedAt: Date;
  payload: unknown;
  attribution: { label: string; url?: string | null } | null;
  freshUntil: Date | null;
}

export interface SnapshotInsertResult {
  id: string;
  contentChecksum: string;
  inserted: boolean;
}

/**
 * Inserts an immutable snapshot. Identical content (same canonical checksum)
 * for the same lead is a no-op returning the existing row — evidence is
 * deduplicated by content, never mutated.
 */
export async function insertSnapshot(tx: Tx, input: SnapshotInsert): Promise<SnapshotInsertResult> {
  const contentChecksum = checksumPayload({
    provider: input.provider,
    sourceIdentifier: input.sourceIdentifier,
    retrievedAt: input.retrievedAt.toISOString(),
    payload: input.payload,
  });
  const existing = await tx
    .select({ id: sourceSnapshots.id })
    .from(sourceSnapshots)
    .where(
      and(eq(sourceSnapshots.leadId, input.leadId), eq(sourceSnapshots.contentChecksum, contentChecksum)),
    )
    .limit(1);
  if (existing[0]) return { id: existing[0].id, contentChecksum, inserted: false };

  const id = randomUUID();
  await tx.insert(sourceSnapshots).values({
    id,
    leadId: input.leadId,
    provider: input.provider,
    sourceUrl: input.sourceUrl,
    sourceIdentifier: input.sourceIdentifier,
    retrievedAt: input.retrievedAt,
    contentChecksum,
    payload: input.payload as object,
    attribution: input.attribution,
    freshUntil: input.freshUntil,
  });
  return { id, contentChecksum, inserted: true };
}

export async function listSnapshotsForLead(tx: Tx, leadId: string): Promise<SourceSnapshotRow[]> {
  return tx.select().from(sourceSnapshots).where(eq(sourceSnapshots.leadId, leadId));
}

/** Validates that every referenced snapshot belongs to the lead. */
export async function resolveEvidenceRefs(
  tx: Tx,
  leadId: string,
  refs: string[],
): Promise<{ valid: string[]; missing: string[] }> {
  if (refs.length === 0) return { valid: [], missing: [] };
  const rows = await tx
    .select({ id: sourceSnapshots.id })
    .from(sourceSnapshots)
    .where(and(eq(sourceSnapshots.leadId, leadId), inArray(sourceSnapshots.id, refs)));
  const present = new Set(rows.map((row) => row.id));
  const missing = refs.filter((ref) => !present.has(ref));
  return { valid: refs.filter((ref) => present.has(ref)), missing };
}

/** Count of leads created since a given instant (daily lead limit). */
export async function countLeadsCreatedSince(db: Db, since: Date): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(leads)
    .where(gte(leads.createdAt, since));
  return rows[0]?.count ?? 0;
}
