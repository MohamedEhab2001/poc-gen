import { renderPolicy } from "./policy";
import type { BusinessPocRecord } from "./types";

export type RecordDisposition =
  | "not_found"
  | "expired"
  | "permanently_closed"
  | "render";

/**
 * Pure visibility rule shared by the demo, preview, share-link, and metadata
 * paths so it is unit testable. Drafts and archived records behave as
 * missing on public routes; expired and permanently closed records get their
 * safe states.
 *
 * Business status passes the factual render policy before any decision: a
 * blocked (for example low-confidence AI-derived) status is treated as
 * unknown — never as evidence the business is open, and never as a trusted
 * closure claim. Trusted closure (verified or unverified provider factual)
 * renders the safe closed state.
 *
 * Expiration is enforced here at request time: a record whose expiresAt
 * (UTC instant) is in the past can never render as active, regardless of
 * what any background maintenance job has or has not updated. `now` is
 * injectable for deterministic tests.
 */
export function getRecordDisposition(
  record: BusinessPocRecord,
  now: Date = new Date(),
): RecordDisposition {
  if (record.status === "draft" || record.status === "archived") return "not_found";
  if (record.status === "expired") return "expired";
  if (record.expiresAt && new Date(record.expiresAt).getTime() <= now.getTime()) {
    return "expired";
  }

  const statusSourced = record.identity.businessStatus;
  const statusOutcome = renderPolicy("factual", {
    source: statusSourced.source,
    verified: statusSourced.verified,
    confidence: statusSourced.confidence ?? null,
  });
  const businessStatus =
    statusOutcome === "blocked" ? "unknown" : (statusSourced.value ?? "unknown");

  if (businessStatus === "permanently_closed") {
    return "permanently_closed";
  }
  return "render";
}
