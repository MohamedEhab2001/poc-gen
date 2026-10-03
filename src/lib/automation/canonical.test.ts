import { describe, expect, it } from "vitest";
import { canonicalJson, checksumPayload, hashIdempotencyKey, hashRequest } from "./canonical";

describe("canonical json and checksums", () => {
  it("is key-order independent", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe(canonicalJson({ a: 2, b: 1 }));
  });

  it("preserves array order", () => {
    expect(canonicalJson({ items: [1, 2, 3] })).not.toBe(canonicalJson({ items: [3, 2, 1] }));
  });

  it("drops undefined properties deterministically", () => {
    expect(canonicalJson({ a: undefined, b: 1 })).toBe(canonicalJson({ b: 1 }));
  });

  it("rejects circular structures and non-finite numbers", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => canonicalJson(circular)).toThrow();
    expect(() => canonicalJson(NaN)).toThrow();
    expect(() => canonicalJson(() => 1)).toThrow();
  });

  it("produces stable checksums across key orders and runs", () => {
    const a = checksumPayload({ provider: "p", facts: { rating: 4.5, name: "X" } });
    const b = checksumPayload({ facts: { name: "X", rating: 4.5 }, provider: "p" });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("separates idempotency key hashing from request hashing", () => {
    expect(hashIdempotencyKey("op", "key1")).not.toBe(hashIdempotencyKey("op", "key2"));
    expect(hashIdempotencyKey("op1", "key")).not.toBe(hashIdempotencyKey("op2", "key"));
    expect(hashRequest("op", { a: 1 })).not.toBe(hashRequest("op", { a: 2 }));
    expect(hashRequest("op", { a: 1, b: 2 })).toBe(hashRequest("op", { b: 2, a: 1 }));
  });
});
