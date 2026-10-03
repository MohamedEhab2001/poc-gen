import { describe, expect, it } from "vitest";
import {
  allowedTransitions,
  assertLeadTransition,
  canTransition,
  isLeadStatus,
  isRetryRestorableStatus,
  isTerminalLeadStatus,
  LEAD_STATUSES,
  LeadTransitionError,
} from "./lifecycle";

describe("lead lifecycle transition table", () => {
  it("contains all nineteen statuses exactly once", () => {
    expect(LEAD_STATUSES).toHaveLength(19);
    expect(new Set(LEAD_STATUSES).size).toBe(19);
  });

  it("recognizes valid and invalid status strings", () => {
    expect(isLeadStatus("QUALIFIED")).toBe(true);
    expect(isLeadStatus("qualified")).toBe(false);
    expect(isLeadStatus("MADE_UP")).toBe(false);
  });

  const happyPath: Array<[string, string[]]> = [
    ["DISCOVERED", ["QUALIFIED", "REJECTED", "QUARANTINED", "FAILED"]],
    ["QUALIFIED", ["ENRICHED", "REJECTED", "QUARANTINED", "SUPPRESSED", "FAILED"]],
    ["ENRICHED", ["CONTACT_VERIFIED", "REJECTED", "QUARANTINED", "SUPPRESSED", "FAILED"]],
    ["CONTACT_VERIFIED", ["POC_GENERATED", "REJECTED", "QUARANTINED", "SUPPRESSED", "FAILED"]],
    ["POC_GENERATED", ["QA_PASSED", "REJECTED", "QUARANTINED", "FAILED"]],
    ["QA_PASSED", ["PUBLISHED", "POC_GENERATED", "REJECTED", "FAILED"]],
    ["PUBLISHED", ["OUTREACH_READY", "POC_GENERATED", "REJECTED", "FAILED"]],
    ["OUTREACH_READY", ["CONTACTED", "SUPPRESSED", "FAILED"]],
    [
      "CONTACTED",
      ["FOLLOW_UP_1", "INTERESTED", "NOT_INTERESTED", "UNSUBSCRIBED", "BOUNCED", "SUPPRESSED", "FAILED"],
    ],
    [
      "FOLLOW_UP_1",
      ["FOLLOW_UP_2", "INTERESTED", "NOT_INTERESTED", "UNSUBSCRIBED", "BOUNCED", "SUPPRESSED", "FAILED"],
    ],
    [
      "FOLLOW_UP_2",
      ["INTERESTED", "NOT_INTERESTED", "UNSUBSCRIBED", "BOUNCED", "SUPPRESSED", "FAILED"],
    ],
  ];

  for (const [from, allowed] of happyPath) {
    it(`allows exactly the documented transitions from ${from}`, () => {
      expect([...allowedTransitions(from as never)]).toEqual(allowed);
    });
  }

  const terminal = [
    "INTERESTED",
    "NOT_INTERESTED",
    "UNSUBSCRIBED",
    "BOUNCED",
    "SUPPRESSED",
    "REJECTED",
    "QUARANTINED",
  ] as const;

  for (const status of terminal) {
    it(`terminal state ${status} has no outgoing transitions`, () => {
      expect(allowedTransitions(status)).toEqual([]);
      expect(isTerminalLeadStatus(status)).toBe(true);
      // Never back into outreach automatically.
      expect(canTransition(status, "CONTACTED")).toBe(false);
      expect(canTransition(status, "OUTREACH_READY")).toBe(false);
      expect(canTransition(status, "FOLLOW_UP_1")).toBe(false);
    });
  }

  it("FAILED is terminal for the table but explicitly retry-restorable states exist", () => {
    expect(allowedTransitions("FAILED")).toEqual([]);
    expect(isTerminalLeadStatus("FAILED")).toBe(true);
    expect(isRetryRestorableStatus("QA_PASSED")).toBe(true);
    expect(isRetryRestorableStatus("OUTREACH_READY")).toBe(true);
    expect(isRetryRestorableStatus("CONTACTED")).toBe(false);
    expect(isRetryRestorableStatus("REJECTED")).toBe(false);
    expect(isRetryRestorableStatus("FAILED")).toBe(false);
  });

  it("rejects forbidden jumps with a structured error", () => {
    expect(() => assertLeadTransition("DISCOVERED", "PUBLISHED")).toThrow(LeadTransitionError);
    expect(() => assertLeadTransition("QUALIFIED", "CONTACTED")).toThrow(/Illegal lead transition/);
    expect(() => assertLeadTransition("CONTACTED", "QUALIFIED")).toThrow();
    expect(() => assertLeadTransition("PUBLISHED", "CONTACTED")).toThrow();
  });

  it("treats same-status writes as legal no-ops", () => {
    expect(canTransition("QUALIFIED", "QUALIFIED")).toBe(true);
    expect(canTransition("CONTACTED", "CONTACTED")).toBe(true);
  });
});
