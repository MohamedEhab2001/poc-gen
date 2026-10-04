/**
 * Deterministic evidence-claim verification.
 *
 * A structured claim is supported when:
 *  1. its statement occurs (after normalization) in the message subject or body;
 *  2. its supporting excerpt occurs in the referenced snapshot's payload
 *     (deterministic normalization: case-folding and whitespace collapse),
 *     OR the optional JSON pointer resolves to a value whose normalized form
 *     contains the excerpt / exists at all.
 *
 * HONEST LIMITS: this is deterministic linkage, not semantic fact-checking.
 * It proves the claim text was drawn from stored immutable evidence — it
 * cannot prove the evidence itself is true, current, or fairly framed.
 */

export type ClaimSupportResult = { ok: true } | { ok: false; reason: string };

/** Case-fold, collapse whitespace; keep punctuation (deterministic, cheap). */
export function normalizeSupport(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

const MAX_DEPTH = 8;
const MAX_STRINGS = 500;

/** Collects every string leaf (and stringified scalar) from a JSON payload. */
export function collectPayloadStrings(payload: unknown, out: string[] = [], depth = 0): string[] {
  if (out.length >= MAX_STRINGS || depth > MAX_DEPTH) return out;
  if (typeof payload === "string") {
    out.push(payload);
  } else if (typeof payload === "number" || typeof payload === "boolean") {
    out.push(String(payload));
  } else if (Array.isArray(payload)) {
    for (const item of payload) collectPayloadStrings(item, out, depth + 1);
  } else if (payload !== null && typeof payload === "object") {
    for (const value of Object.values(payload as Record<string, unknown>)) {
      collectPayloadStrings(value, out, depth + 1);
    }
  }
  return out;
}

/** RFC 6901 pointer resolution with ~1/~0 unescaping; found=false when absent. */
export function resolveJsonPointer(payload: unknown, pointer: string): { found: boolean; value?: unknown } {
  if (pointer === "") return { found: true, value: payload };
  if (!pointer.startsWith("/")) return { found: false };
  const tokens = pointer
    .slice(1)
    .split("/")
    .map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
  let current: unknown = payload;
  for (const token of tokens) {
    if (Array.isArray(current)) {
      const index = Number.parseInt(token, 10);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return { found: false };
      current = current[index];
    } else if (current !== null && typeof current === "object") {
      const record = current as Record<string, unknown>;
      if (!(token in record)) return { found: false };
      current = record[token];
    } else {
      return { found: false };
    }
  }
  return { found: true, value: current };
}

export interface ClaimSupportInput {
  statement: string;
  subject: string;
  body: string;
  supportingExcerpt: string;
  jsonPointer?: string | null;
  payload: unknown;
}

export function verifyClaimSupport(input: ClaimSupportInput): ClaimSupportResult {
  const statement = normalizeSupport(input.statement);
  if (statement.length === 0) return { ok: false, reason: "empty_statement" };

  // 1. The claim statement must occur in the message itself.
  const subject = normalizeSupport(input.subject);
  const body = normalizeSupport(input.body);
  if (!subject.includes(statement) && !body.includes(statement)) {
    return { ok: false, reason: "statement_missing_from_message" };
  }

  // 2a. JSON pointer path, when provided, must resolve in the payload.
  let pointerValue: unknown;
  let pointerProvided = false;
  if (input.jsonPointer) {
    const resolved = resolveJsonPointer(input.payload, input.jsonPointer);
    if (!resolved.found) return { ok: false, reason: "json_pointer_not_found" };
    pointerValue = resolved.value;
    pointerProvided = true;
  }

  const excerpt = normalizeSupport(input.supportingExcerpt);
  if (excerpt.length === 0) return { ok: false, reason: "empty_excerpt" };

  if (pointerProvided) {
    // The excerpt must be contained in the value at the referenced path.
    const normalizedValues = collectPayloadStrings(pointerValue);
    const whole = normalizeSupport(JSON.stringify(pointerValue) ?? "");
    if (!normalizedValues.some((value) => normalizeSupport(value).includes(excerpt)) && !whole.includes(excerpt)) {
      return { ok: false, reason: "excerpt_not_at_pointer" };
    }
    return { ok: true };
  }

  // 2b. No pointer: the excerpt must occur somewhere in the payload.
  const candidates = collectPayloadStrings(input.payload);
  const wholePayload = normalizeSupport(JSON.stringify(input.payload) ?? "");
  if (!candidates.some((value) => normalizeSupport(value).includes(excerpt)) && !wholePayload.includes(excerpt)) {
    return { ok: false, reason: "excerpt_not_in_evidence" };
  }
  return { ok: true };
}

/** Data origins that come from external providers (need snapshot backing). */
export const EXTERNAL_PROVIDERS = ["google_places", "licensed_asset"] as const;

/** The set of external providers whose values appear (non-null) in the record. */
export function recordExternalProviders(record: unknown): string[] {
  return EXTERNAL_PROVIDERS.filter((provider) => recordHasProviderSource(record, provider));
}

/** True when the record carries at least one sourced value from the provider. */
export function recordHasProviderSource(record: unknown, provider: string): boolean {
  const seen = new Set<unknown>();
  const walk = (value: unknown, depth: number): boolean => {
    if (depth > 9 || value === null || typeof value !== "object" || seen.has(value)) return false;
    seen.add(value);
    if (Array.isArray(value)) return value.some((item) => walk(item, depth + 1));
    const node = value as Record<string, unknown>;
    if (typeof node.source === "string" && node.source === provider && "value" in node && node.value != null) {
      return true;
    }
    return Object.values(node).some((nested) => walk(nested, depth + 1));
  };
  return walk(record, 0);
}
