/**
 * Central lead lifecycle. This table is the ONLY authority for which status
 * transitions are legal; React components, MCP handlers, and route handlers
 * must never write statuses directly. Services call assertLeadTransition()
 * inside the same transaction that persists the change.
 *
 * Design rules (Phase 2A):
 * - Terminal states never transition back into outreach automatically.
 * - FAILED has no outgoing transitions here. Retrying a technical failure is
 *   a separate, explicit, audited operation (retry_failed_lead) that restores
 *   the stored previousStatus; it can never skip policy gates because every
 *   subsequent step re-runs its own gates.
 */

export const LEAD_STATUSES = [
  "DISCOVERED",
  "QUALIFIED",
  "ENRICHED",
  "CONTACT_VERIFIED",
  "POC_GENERATED",
  "QA_PASSED",
  "PUBLISHED",
  "OUTREACH_READY",
  "CONTACTED",
  "FOLLOW_UP_1",
  "FOLLOW_UP_2",
  "INTERESTED",
  "NOT_INTERESTED",
  "UNSUBSCRIBED",
  "BOUNCED",
  "SUPPRESSED",
  "REJECTED",
  "QUARANTINED",
  "FAILED",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

/** States from which outreach messages may be prepared or sent. */
export const OUTREACH_ELIGIBLE_STATUSES: ReadonlySet<LeadStatus> = new Set([
  "OUTREACH_READY",
  "CONTACTED",
  "FOLLOW_UP_1",
  "FOLLOW_UP_2",
]);

/**
 * Transitions. Empty/absent means the status is terminal (or, for FAILED,
 * retryable only through the explicit audited retry operation).
 *
 * QA_PASSED -> POC_GENERATED and PUBLISHED -> POC_GENERATED are intentional
 * backwards transitions: writing a NEW record revision invalidates the
 * previous QA/publication state (fail closed: the share link stops resolving
 * until QA and publish run again).
 */
const TRANSITIONS: Readonly<Record<LeadStatus, readonly LeadStatus[]>> = {
  DISCOVERED: ["QUALIFIED", "REJECTED", "QUARANTINED", "FAILED"],
  QUALIFIED: ["ENRICHED", "REJECTED", "QUARANTINED", "SUPPRESSED", "FAILED"],
  // POC generation does NOT require a verified contact: ENRICHED may go
  // straight to POC_GENERATED. Contact verification gates OUTREACH only
  // (prepare_outreach / send_outreach enforce contact_not_verified).
  ENRICHED: ["CONTACT_VERIFIED", "POC_GENERATED", "REJECTED", "QUARANTINED", "SUPPRESSED", "FAILED"],
  CONTACT_VERIFIED: ["POC_GENERATED", "REJECTED", "QUARANTINED", "SUPPRESSED", "FAILED"],
  POC_GENERATED: ["QA_PASSED", "REJECTED", "QUARANTINED", "FAILED"],
  QA_PASSED: ["PUBLISHED", "POC_GENERATED", "REJECTED", "FAILED"],
  PUBLISHED: ["OUTREACH_READY", "POC_GENERATED", "REJECTED", "FAILED"],
  OUTREACH_READY: ["CONTACTED", "SUPPRESSED", "FAILED"],
  CONTACTED: [
    "FOLLOW_UP_1",
    "INTERESTED",
    "NOT_INTERESTED",
    "UNSUBSCRIBED",
    "BOUNCED",
    "SUPPRESSED",
    "FAILED",
  ],
  FOLLOW_UP_1: [
    "FOLLOW_UP_2",
    "INTERESTED",
    "NOT_INTERESTED",
    "UNSUBSCRIBED",
    "BOUNCED",
    "SUPPRESSED",
    "FAILED",
  ],
  FOLLOW_UP_2: [
    "INTERESTED",
    "NOT_INTERESTED",
    "UNSUBSCRIBED",
    "BOUNCED",
    "SUPPRESSED",
    "FAILED",
  ],
  INTERESTED: [],
  NOT_INTERESTED: [],
  UNSUBSCRIBED: [],
  BOUNCED: [],
  SUPPRESSED: [],
  REJECTED: [],
  QUARANTINED: [],
  FAILED: [],
};

export const TERMINAL_LEAD_STATUSES: ReadonlySet<LeadStatus> = new Set([
  "INTERESTED",
  "NOT_INTERESTED",
  "UNSUBSCRIBED",
  "BOUNCED",
  "SUPPRESSED",
  "REJECTED",
  "QUARANTINED",
]);

/** FAILED is technically terminal-but-retryable through the explicit tool. */
export function isTerminalLeadStatus(status: LeadStatus): boolean {
  return TERMINAL_LEAD_STATUSES.has(status) || status === "FAILED";
}

export function allowedTransitions(from: LeadStatus): readonly LeadStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return true; // idempotent no-op writes stay legal
  return allowedTransitions(from).includes(to);
}

export class LeadTransitionError extends Error {
  constructor(
    readonly from: LeadStatus,
    readonly to: LeadStatus,
  ) {
    super(`Illegal lead transition ${from} -> ${to}.`);
    this.name = "LeadTransitionError";
  }
}

export function assertLeadTransition(from: LeadStatus, to: LeadStatus): void {
  if (!canTransition(from, to)) throw new LeadTransitionError(from, to);
}

/** Statuses a retry_failed_lead may restore (never terminal or outreach-active). */
export function isRetryRestorableStatus(status: LeadStatus): boolean {
  return status === "DISCOVERED" || status === "QUALIFIED" || status === "ENRICHED" ||
    status === "CONTACT_VERIFIED" || status === "POC_GENERATED" || status === "QA_PASSED" ||
    status === "PUBLISHED" || status === "OUTREACH_READY";
}
