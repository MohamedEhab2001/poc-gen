import type { DataOrigin } from "./schema";

/**
 * Central render policy for sourced values. One function decides whether a
 * value may be rendered and under which outcome; normalization consults it
 * for every narrative field so low-confidence or untrusted content can never
 * reach a customer page as a factual claim.
 *
 * Field classes:
 * - "narrative": marketing and story copy (hero copy, tagline, about,
 *   announcement, review summary). Only business-origin sources render
 *   unverified; everything else must be verified or confidently derived.
 * - "factual": operational data (hours, address, phone, ratings, menus).
 *   Provider data may render unverified but stays flagged for the admin
 *   provenance UI.
 */

export type FieldClass = "narrative" | "factual";

export const DERIVED_CONFIDENCE_THRESHOLD = 0.7;

export type PolicyOutcome = "verified" | "unverified" | "derived" | "fallback" | "blocked";

export interface PolicyInput {
  source: DataOrigin;
  verified?: boolean;
  confidence?: number | null;
}

/** Sources that speak for the business itself. */
const BUSINESS_ORIGIN_SOURCES: ReadonlySet<DataOrigin> = new Set([
  "business_owner",
  "official_website",
  "official_social",
  "manual",
]);

export function renderPolicy(fieldClass: FieldClass, input: PolicyInput): PolicyOutcome {
  if (input.source === "fallback") return "fallback";

  if (input.source === "ai_derived") {
    // Missing confidence on generated data defaults to untrusted.
    const confidence = input.confidence ?? 0;
    return confidence >= DERIVED_CONFIDENCE_THRESHOLD ? "derived" : "blocked";
  }

  if (input.verified) return "verified";

  if (fieldClass === "factual") return "unverified";

  // Narrative, unverified: only business-origin sources may render.
  return BUSINESS_ORIGIN_SOURCES.has(input.source) ? "unverified" : "blocked";
}

/** Convenience: policy result as a simple allow/deny. */
export function policyAllows(outcome: PolicyOutcome): boolean {
  return outcome !== "blocked";
}
