import "server-only";

import type { z } from "zod";
import type { ingestLeadsInputSchema } from "@/lib/automation/schemas";
import { normalizeEmailAddress } from "@/lib/automation/normalize";
import { AutomationError } from "@/lib/automation/outcomes";
import type { CallContext } from "../context";
import { contactKeysOrThrow } from "../context";
import { advisoryLock, withDatabase, withTransaction } from "../db";
import { writeAuditTx } from "../support";
import { addRunStep, incrementRunCounters } from "../store/runs";
import {
  analyzeBusinessDuplicates,
  countLeadsCreatedSince,
  getLeadByBusinessId,
  isCompleteAddressKey,
  insertBusiness,
  insertLead,
  insertSnapshot,
  normalizeBusinessKeys,
  primaryDedupLockKey,
  updateLeadStatus,
  upsertContactRef,
} from "../store/leads";
import type { BusinessIdentityInput } from "../store/leads";
import { upsertContact } from "../store/contacts";
import type { LeadStatus } from "@/lib/automation/lifecycle";

/**
 * ingest_leads: bounded batch ingestion (max 10 candidates per call).
 *
 * Each candidate is deduplicated transactionally under an advisory lock on
 * its strongest identity key, in priority order: source key, domain, phone,
 * name+address. Multiple disagreeing matches are an explicit conflict —
 * never a merge. Weak candidates (score below the configured minimum) are
 * rejected without entering the system.
 */

type IngestInput = z.infer<typeof ingestLeadsInputSchema>;

interface CandidateOutcome {
  candidateKey: string;
  outcome: "created" | "matched_existing" | "conflict" | "rejected" | "invalid";
  leadId?: string;
  businessId?: string;
  /** Snapshot ids created (or already present) for created leads. */
  snapshotIds?: string[];
  reason?: string;
  conflictCandidates?: string[];
}

export async function ingestLeads(input: IngestInput, ctx: CallContext) {
  // Enforce the configured daily lead limit BEFORE any database work.
  const startOfDay = new Date(ctx.now);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const createdToday = await withDatabase((db) => countLeadsCreatedSince(db, startOfDay));
  if (createdToday + input.candidates.length > ctx.config.dailyLeadLimit) {
    throw new AutomationError(
      "daily_lead_limit_exceeded",
      `The daily lead limit (${ctx.config.dailyLeadLimit}) would be exceeded.`,
      "REJECTED",
      undefined,
      { createdToday, requested: input.candidates.length },
    );
  }

  const results: CandidateOutcome[] = [];
  const contactKeys = input.candidates.some((c) => c.contact) ? contactKeysOrThrow(ctx.config) : null;

  for (const candidate of input.candidates) {
    results.push(await ingestOne(candidate, ctx, contactKeys));
  }

  const summary = {
    results,
    createdCount: results.filter((r) => r.outcome === "created").length,
    matchedCount: results.filter((r) => r.outcome === "matched_existing").length,
    rejectedCount: results.filter((r) => r.outcome === "rejected").length,
    conflictCount: results.filter((r) => r.outcome === "conflict").length,
    invalidCount: results.filter((r) => r.outcome === "invalid").length,
  };

  if (input.runId) {
    await withDatabase((db) =>
      incrementRunCounters(db, input.runId!, {
        leads_created: summary.createdCount,
        leads_matched: summary.matchedCount,
        leads_rejected: summary.rejectedCount + summary.invalidCount,
        leads_conflict: summary.conflictCount,
      }),
    );
  }

  return summary;
}

async function ingestOne(
  candidate: IngestInput["candidates"][number],
  ctx: CallContext,
  contactKeys: ReturnType<typeof contactKeysOrThrow> | null,
): Promise<CandidateOutcome> {
  // Contact validation happens before any database work.
  if (candidate.contact && !normalizeEmailAddress(candidate.contact.address)) {
    return { candidateKey: candidate.candidateKey, outcome: "invalid", reason: "invalid_contact_address" };
  }
  if (candidate.score < ctx.config.minLeadScore) {
    // Weak candidates are never forced into the system.
    return { candidateKey: candidate.candidateKey, outcome: "rejected", reason: "score_below_minimum" };
  }

  const business: BusinessIdentityInput = {
    sourceType: candidate.business.sourceType,
    sourceExternalId: candidate.business.sourceExternalId ?? null,
    displayName: candidate.business.displayName,
    primaryCategory: candidate.business.primaryCategory,
    website: candidate.business.website ?? null,
    phone: candidate.business.phone ?? null,
    address: candidate.business.address ?? null,
    city: candidate.business.city ?? null,
    region: candidate.business.region ?? null,
    country: candidate.business.country ?? null,
  };
  const keys = normalizeBusinessKeys(business);

  return withTransaction(async (tx) => {
    // Serialize duplicate analysis on this candidate's strongest identity
    // key: a concurrent ingest of the same business blocks here until the
    // first commits, then sees the committed row.
    await advisoryLock(tx, primaryDedupLockKey(business, keys));

    const analysis = await analyzeBusinessDuplicates(tx, business, keys);

    // Soft signals (domain, phone) NEVER merge by themselves. A candidate
    // that carries its OWN strong identity basis (a source external id, or
    // a complete address establishing a distinct location) is a legitimate
    // distinct business — chain branches share websites and phones all the
    // time — so it is CREATED even when soft signals match an existing row.
    // Only when identity is genuinely UNCERTAIN (no source id, no complete
    // address, soft signals matching) does the candidate surface as an
    // explicit conflict instead of a silent merge.
    const conflictIds = [...analysis.softMatchIds, ...(analysis.strongMatch ? [analysis.strongMatch.businessId] : [])];
    const canEstablishStrongIdentity =
      Boolean(business.sourceExternalId) || isCompleteAddressKey(keys.normalizedAddressKey);
    if (!analysis.strongMatch && analysis.softMatchIds.length > 0 && !canEstablishStrongIdentity) {
      return {
        candidateKey: candidate.candidateKey,
        outcome: "conflict" as const,
        reason: "soft_signal_match_only",
        conflictCandidates: analysis.softMatchIds.slice(0, 8),
      };
    }
    if (analysis.strongMatch && analysis.softMatchIds.length > 0) {
      // Strong identity says X but domain/phone say Y: disagreement.
      return {
        candidateKey: candidate.candidateKey,
        outcome: "conflict" as const,
        reason: "identity_disagreement",
        conflictCandidates: conflictIds.slice(0, 8),
      };
    }

    if (analysis.strongMatch) {
      // MATCHED with enrichment: attach new immutable evidence (checksum
      // dedup), refresh the score, and add a newly verified contact — never
      // downgrading existing verification, never discarding fresh evidence.
      const existingLead = await getLeadByBusinessId(tx, analysis.strongMatch.businessId);
      if (!existingLead) {
        return {
          candidateKey: candidate.candidateKey,
          outcome: "conflict" as const,
          reason: "business_without_lead",
          conflictCandidates: [analysis.strongMatch.businessId],
        };
      }
      const snapshotIds: string[] = [];
      for (const evidence of candidate.evidence) {
        const snapshot = await insertSnapshot(tx, {
          leadId: existingLead.id,
          provider: evidence.provider,
          sourceUrl: evidence.sourceUrl ?? null,
          sourceIdentifier: evidence.sourceIdentifier ?? null,
          retrievedAt: new Date(evidence.retrievedAt),
          payload: evidence.payload,
          attribution: evidence.attribution ?? null,
          freshUntil: evidence.freshUntil ? new Date(evidence.freshUntil) : null,
        });
        snapshotIds.push(snapshot.id);
      }
      await updateLeadStatus(tx, {
        leadId: existingLead.id,
        from: existingLead.status as never,
        to: existingLead.status as never,
        score: candidate.score,
        scoreReasons: candidate.scoreReasons,
      });
      if (candidate.contact && contactKeys) {
        await upsertContactRef(tx, {
          businessId: analysis.strongMatch.businessId,
          rawAddress: candidate.contact.address,
          verified: candidate.contact.verified,
          provenance: candidate.contact.provenance,
          keys: contactKeys,
          now: ctx.now,
        });
      }
      await writeAuditTx(tx, {
        actor: ctx.principal,
        action: "enrich_lead",
        targetType: "lead",
        targetId: existingLead.id,
        runId: ctx.runId ?? null,
        metadata: {
          strategies: analysis.strongMatch.strategies,
          evidenceAdded: snapshotIds.length,
          contactProvided: Boolean(candidate.contact),
        },
      });
      return {
        candidateKey: candidate.candidateKey,
        outcome: "matched_existing" as const,
        leadId: existingLead.id,
        businessId: analysis.strongMatch.businessId,
        snapshotIds,
        reason: `matched_by_${analysis.strongMatch.strategies.join("_and_")}`,
      };
    }

    // No strong match, no identity disagreement: create.
    const insertedBusiness = await insertBusiness(tx, business, keys);
    const leadStatus: LeadStatus = candidate.contact?.verified
      ? "CONTACT_VERIFIED"
      : candidate.evidence.length > 0
        ? "ENRICHED"
        : "QUALIFIED";
    const lead = await insertLead(tx, {
      businessId: insertedBusiness.id,
      status: leadStatus,
      score: candidate.score,
      scoreReasons: candidate.scoreReasons,
    });

    const snapshotIds: string[] = [];
    for (const evidence of candidate.evidence) {
      const snapshot = await insertSnapshot(tx, {
        leadId: lead.id,
        provider: evidence.provider,
        sourceUrl: evidence.sourceUrl ?? null,
        sourceIdentifier: evidence.sourceIdentifier ?? null,
        retrievedAt: new Date(evidence.retrievedAt),
        payload: evidence.payload,
        attribution: evidence.attribution ?? null,
        freshUntil: evidence.freshUntil ? new Date(evidence.freshUntil) : null,
      });
      snapshotIds.push(snapshot.id);
    }

    if (candidate.contact && contactKeys) {
      await upsertContactRef(tx, {
        businessId: insertedBusiness.id,
        rawAddress: candidate.contact.address,
        verified: candidate.contact.verified,
        provenance: candidate.contact.provenance,
        keys: contactKeys,
        now: ctx.now,
      });
    }

    await writeAuditTx(tx, {
      actor: ctx.principal,
      action: "ingest_lead",
      targetType: "lead",
      targetId: lead.id,
      runId: ctx.runId ?? null,
      metadata: {
        status: leadStatus,
        score: candidate.score,
        evidenceCount: candidate.evidence.length,
        contactProvided: Boolean(candidate.contact),
      },
    });

    if (ctx.runId) {
      await addRunStep(tx, {
        runId: ctx.runId,
        operation: "ingest_leads",
        leadId: lead.id,
        status: "completed",
        startedAt: ctx.now,
        finishedAt: ctx.now,
        summary: { candidateKey: candidate.candidateKey, outcome: "created" },
      });
    }

    return {
      candidateKey: candidate.candidateKey,
      outcome: "created" as const,
      leadId: lead.id,
      businessId: insertedBusiness.id,
      snapshotIds,
    };
  }).catch((error: unknown) => {
    // Unique-constraint race (a concurrent create committed between our
    // analysis and insert): re-query deterministically under the lock we
    // already hold conceptually — re-run in a fresh transaction and return
    // the ACTUAL identifiers, or conflict if identity stays ambiguous.
    if (isUniqueViolation(error)) {
      return requeryAfterRace(candidate, ctx, contactKeys, business, keys);
    }
    throw error;
  });
}

/** Deterministic re-query after a unique-race; never a generic matched_existing. */
async function requeryAfterRace(
  candidate: IngestInput["candidates"][number],
  ctx: CallContext,
  contactKeys: ReturnType<typeof contactKeysOrThrow> | null,
  business: BusinessIdentityInput,
  keys: ReturnType<typeof normalizeBusinessKeys>,
): Promise<CandidateOutcome> {
  return withTransaction(async (tx) => {
    await advisoryLock(tx, primaryDedupLockKey(business, keys));
    const analysis = await analyzeBusinessDuplicates(tx, business, keys);
    if (analysis.strongMatch && analysis.softMatchIds.length === 0) {
      const existingLead = await getLeadByBusinessId(tx, analysis.strongMatch.businessId);
      if (existingLead) {
        return {
          candidateKey: candidate.candidateKey,
          outcome: "matched_existing" as const,
          leadId: existingLead.id,
          businessId: analysis.strongMatch.businessId,
          reason: `matched_by_${analysis.strongMatch.strategies.join("_and_")}_after_race`,
        };
      }
    }
    return {
      candidateKey: candidate.candidateKey,
      outcome: "conflict" as const,
      reason: "unresolved_after_race",
      conflictCandidates: analysis.softMatchIds.slice(0, 8),
    };
  });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "23505";
}
