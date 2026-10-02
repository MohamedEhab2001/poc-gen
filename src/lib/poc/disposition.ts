import type { BusinessPocRecord } from "./types";

export type RecordDisposition =
  | "not_found"
  | "expired"
  | "permanently_closed"
  | "render";

/**
 * Pure visibility rule shared by the demo and preview routes so it is unit
 * testable. Drafts and archived records behave as missing on public routes;
 * expired and permanently closed records get their safe states.
 */
export function getRecordDisposition(record: BusinessPocRecord): RecordDisposition {
  if (record.status === "draft" || record.status === "archived") return "not_found";
  if (record.status === "expired") return "expired";
  if ((record.identity.businessStatus.value ?? "unknown") === "permanently_closed") {
    return "permanently_closed";
  }
  return "render";
}
