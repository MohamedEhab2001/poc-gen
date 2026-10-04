import { describe, expect, it } from "vitest";
import {
  collectPayloadStrings,
  normalizeSupport,
  recordHasProviderSource,
  resolveJsonPointer,
  verifyClaimSupport,
} from "./evidence";

const payload = {
  provider: "google_places",
  facts: {
    rating: 4.8,
    reviewCount: 212,
    name: "Harbor Fig Kitchen",
    hours: "Monday: Closed. Tuesday–Sunday: 11am–9pm.",
    note: "Wood-fired   cooking with a coastal menu",
  },
};

describe("evidence claim verification", () => {
  const base = {
    statement: "Rated 4.8 stars by 212 reviewers",
    subject: "Your concept page is ready",
    body: "We saw you are Rated 4.8 stars by 212 reviewers and put together a private concept page.",
    supportingExcerpt: "212",
    payload,
  };

  it("accepts a supported claim whose statement appears in the body and excerpt exists in the payload", () => {
    expect(verifyClaimSupport(base)).toEqual({ ok: true });
  });

  it("matches the statement inside the subject too", () => {
    expect(
      verifyClaimSupport({ ...base, subject: "Rated 4.8 stars by 212 reviewers — a concept for you", body: "Hi" }),
    ).toEqual({ ok: true });
  });

  it("rejects a statement missing from the message", () => {
    const result = verifyClaimSupport({ ...base, body: "Generic greeting only." });
    expect(result).toEqual({ ok: false, reason: "statement_missing_from_message" });
  });

  it("rejects an excerpt unrelated to the evidence", () => {
    const result = verifyClaimSupport({ ...base, supportingExcerpt: "five-star michelin rosette" });
    expect(result).toEqual({ ok: false, reason: "excerpt_not_in_evidence" });
  });

  it("normalization: whitespace and case differences still match", () => {
    const result = verifyClaimSupport({
      ...base,
      supportingExcerpt: "wood-fired   COOKING with a coastal menu",
    });
    expect(result).toEqual({ ok: true });
    expect(normalizeSupport("  A   b  ")).toBe("a b");
  });

  it("jsonPointer: resolves valid paths and rejects missing ones", () => {
    expect(verifyClaimSupport({ ...base, jsonPointer: "/facts/reviewCount" })).toEqual({ ok: true });
    const missing = verifyClaimSupport({ ...base, jsonPointer: "/facts/nonexistent" });
    expect(missing).toEqual({ ok: false, reason: "json_pointer_not_found" });
    const wrongValue = verifyClaimSupport({ ...base, supportingExcerpt: "name", jsonPointer: "/facts/reviewCount" });
    expect(wrongValue).toEqual({ ok: false, reason: "excerpt_not_at_pointer" });
  });

  it("jsonPointer escapes ~1 and ~0 correctly", () => {
    const tricky = { "a/b": { "c~d": "needle-value" } };
    expect(resolveJsonPointer(tricky, "/a~1b/c~0d")).toEqual({ found: true, value: "needle-value" });
    expect(resolveJsonPointer(tricky, "/a/b")).toEqual({ found: false });
    expect(resolveJsonPointer(payload, "")).toEqual({ found: true, value: payload });
  });

  it("bounds payload walks and string collection", () => {
    const deep: Record<string, unknown> = {};
    let node = deep;
    for (let i = 0; i < 30; i++) {
      node.child = {};
      node = node.child as Record<string, unknown>;
    }
    node.child = "deep-value";
    expect(collectPayloadStrings(deep)).not.toContain("deep-value"); // depth-bounded
  });

  it("recordHasProviderSource detects provider-sourced values anywhere in the record", () => {
    const record = {
      identity: {
        name: { value: "X", source: "google_places", verified: true },
        businessStatus: { value: "operational", source: "manual" },
      },
    };
    expect(recordHasProviderSource(record, "google_places")).toBe(true);
    expect(recordHasProviderSource(record, "licensed_asset")).toBe(false);
    const clean = { identity: { name: { value: "X", source: "manual" } } };
    expect(recordHasProviderSource(clean, "google_places")).toBe(false);
    // Null values do not count as provider facts.
    const nullValued = { phone: { value: null, source: "google_places" } };
    expect(recordHasProviderSource(nullValued, "google_places")).toBe(false);
  });
});
