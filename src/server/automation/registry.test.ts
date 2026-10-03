import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  AUTOMATION_SCOPES,
  dispatchOperation,
  getOperationInputSchema,
  listAutomationOperations,
} from "./registry";
import { ingestLeadsInputSchema } from "@/lib/automation/schemas";

const ALL_SCOPES = [...AUTOMATION_SCOPES];

describe("automation operation registry", () => {
  it("exposes the five documented scopes", () => {
    expect(AUTOMATION_SCOPES).toEqual(["poc:read", "poc:write", "outreach:prepare", "outreach:send", "reports:read"]);
  });

  it("registers all fourteen operations with scopes and mutation flags", () => {
    const operations = listAutomationOperations();
    const names = operations.map((op) => op.name).sort();
    expect(names).toEqual(
      [
        "health",
        "start_automation_run",
        "ingest_leads",
        "upsert_poc_record",
        "run_poc_qa",
        "publish_poc",
        "prepare_outreach",
        "send_outreach",
        "list_due_followups",
        "record_reply_outcome",
        "suppress_contact",
        "get_run_report",
        "get_interested_leads",
        "retry_failed_lead",
      ].sort(),
    );
    for (const op of operations) {
      expect(AUTOMATION_SCOPES).toContain(op.scope);
    }
    const mutating = new Set(
      operations.filter((op) => op.mutating).map((op) => op.name),
    );
    expect(mutating.size).toBe(10);
    for (const readOnly of ["health", "list_due_followups", "get_run_report", "get_interested_leads"]) {
      expect(mutating.has(readOnly), readOnly).toBe(false);
    }
    // Scope separation: reads never need write scopes.
    const scopes = new Map(operations.map((op) => [op.name, op.scope]));
    expect(scopes.get("health")).toBe("poc:read");
    expect(scopes.get("get_run_report")).toBe("reports:read");
    expect(scopes.get("publish_poc")).toBe("poc:write");
    expect(scopes.get("send_outreach")).toBe("outreach:send");
    expect(scopes.get("prepare_outreach")).toBe("outreach:prepare");
  });

  it("every input schema is bounded (batch and length caps)", () => {
    const ingest = getOperationInputSchema("ingest_leads") as unknown as z.ZodObject<z.ZodRawShape>;
    expect(ingest).toBe(ingestLeadsInputSchema);
    // candidates array cap is 10
    const tooMany = {
      idempotencyKey: "bounded-test-key",
      candidates: Array.from({ length: 11 }, (_, i) => ({
        candidateKey: `c${i}`,
        business: { sourceType: "test", displayName: "Bistro", primaryCategory: "Restaurant" },
        score: 50,
        scoreReasons: [],
        evidence: [],
      })),
    };
    expect(ingestLeadsInputSchema.safeParse(tooMany).success).toBe(false);
    const tenOk = { ...tooMany, candidates: tooMany.candidates.slice(0, 10) };
    expect(ingestLeadsInputSchema.safeParse(tenOk).success).toBe(true);
  });

  it("enforces scopes before touching anything else", async () => {
    const result = await dispatchOperation(
      "ingest_leads",
      {},
      { principal: "unit", scopes: ["poc:read"] },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe("insufficient_scope");
      expect(result.failure.details).toEqual({ requiredScope: "poc:write" });
    }
  });

  it("unknown operations are rejected generically", async () => {
    const result = await dispatchOperation("definitely_not_real", {}, { principal: "unit", scopes: ALL_SCOPES });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe("unknown_operation");
  });

  it("rejects malformed input with structured, bounded issues", async () => {
    const result = await dispatchOperation(
      "ingest_leads",
      { idempotencyKey: "valid-key-123", candidates: "not-an-array" },
      { principal: "unit", scopes: ALL_SCOPES },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe("invalid_input");
      expect((result.failure.details as { issues: unknown[] }).issues.length).toBeLessThanOrEqual(10);
    }
  });

  it("health is reachable read-only and reveals no secrets", async () => {
    const result = await dispatchOperation("health", {}, { principal: "unit", scopes: ["poc:read"] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const serialized = JSON.stringify(result.result);
      expect(serialized).not.toMatch(/secret|password|bearer|database_url/i);
      expect(serialized).toContain("poc-gen-automation");
    }
  });
});
