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
  if ((record.identity.businessStatus.value ?? "unknown") === "permanently_closed") {
    return "permanently_closed";
  }
  return "render";
}
