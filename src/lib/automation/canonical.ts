import { createHash } from "node:crypto";

/**
 * Deterministic canonicalization and checksums. Snapshot content checksums
 * and idempotency request hashes MUST be stable across processes and runs,
 * so key order in objects is sorted recursively and values are serialized
 * with a fixed format. Only JSON-safe values are accepted (no undefined
 * functions, no NaN) — canonicalize() throws on non-JSON input rather than
 * producing an unstable digest.
 */

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function canonicalJson(value: unknown): string {
  return serialize(value, new WeakSet());
}

function serialize(value: unknown, seen: WeakSet<object>): string {
  if (value === null) return "null";
  switch (typeof value) {
    case "number":
      if (!Number.isFinite(value)) throw new Error("Cannot canonicalize a non-finite number.");
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "string":
      return JSON.stringify(value);
    case "object": {
      if (seen.has(value as object)) throw new Error("Cannot canonicalize a circular structure.");
      seen.add(value as object);
      try {
        if (Array.isArray(value)) {
          return `[${value.map((item) => serialize(item, seen)).join(",")}]`;
        }
        const keys = Object.keys(value as Record<string, unknown>)
          .filter((key) => (value as Record<string, unknown>)[key] !== undefined)
          .sort();
        return `{${keys
          .map((key) => `${JSON.stringify(key)}:${serialize((value as Record<string, unknown>)[key], seen)}`)
          .join(",")}}`;
      } finally {
        seen.delete(value as object);
      }
    }
    default:
      throw new Error(`Cannot canonicalize a value of type ${typeof value}.`);
  }
}

/** Stable checksum of an arbitrary JSON payload (snapshots, requests). */
export function checksumPayload(payload: unknown): string {
  return sha256Hex(canonicalJson(payload));
}

/** Stable hash of an automation request for idempotency replay comparison. */
export function hashRequest(operation: string, payload: unknown): string {
  return sha256Hex(`${operation}\n${canonicalJson(payload)}`);
}

/** Hash of an idempotency key (operation-scoped). */
export function hashIdempotencyKey(operation: string, key: string): string {
  return sha256Hex(`${operation}\n${key}`);
}
