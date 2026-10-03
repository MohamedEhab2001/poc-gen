/**
 * Log and metadata redaction. Everything the automation layer writes to
 * audit metadata, idempotency results, run-step summaries, structured
 * errors, and server logs passes through here first. Raw tokens,
 * authorization headers, email addresses, encrypted values, full message
 * bodies, and unbounded provider payloads must never survive.
 */

const SENSITIVE_KEY_PATTERN =
  /(token|secret|key|password|authorization|cookie|bearer|credential|body|html|address|email|subject|payload|headers)/i;

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BASE64URL_LONG = /[A-Za-z0-9_-]{28,}/g;

const MAX_STRING_LENGTH = 280;
const MAX_ARRAY_ITEMS = 25;
const MAX_DEPTH = 6;

/** Masks emails and long high-entropy strings inside free text. */
export function redactString(value: string): string {
  let out = value.replace(EMAIL_PATTERN, "[email]");
  out = out.replace(BASE64URL_LONG, (match, offset: number) => {
    // Keep normal words/sentences intact; only mask standalone token-like runs.
    const before = out[offset - 1] ?? " ";
    const after = out[offset + match.length] ?? " ";
    const beforeOk = /[\s(["{,:;]/.test(before);
    const afterOk = /[\s)}"',:;.]/.test(after);
    return beforeOk && afterOk ? "[redacted]" : match;
  });
  if (out.length > MAX_STRING_LENGTH) out = `${out.slice(0, MAX_STRING_LENGTH)}…[truncated]`;
  return out;
}

/**
 * Deep structural redaction: sensitive keys become "[redacted]", strings are
 * masked and bounded, arrays and depth are capped. Returns a fresh value;
 * never mutates the input.
 */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint" || typeof value === "symbol" || typeof value === "function") {
    return "[unsupported]";
  }
  if (depth >= MAX_DEPTH) return "[depth-limit]";
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => redactForLog(item, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) items.push(`[${value.length - MAX_ARRAY_ITEMS} more]`);
    return items;
  }
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return { name: value.name, message: redactString(value.message) };
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : redactForLog(nested, depth + 1);
  }
  return out;
}

/** JSON-serializable, redacted snapshot for audit metadata columns. */
export function redactedMetadata(value: unknown): Record<string, unknown> {
  const redacted = redactForLog(value);
  return (typeof redacted === "object" && redacted !== null && !Array.isArray(redacted)
    ? redacted
    : { value: redacted }) as Record<string, unknown>;
}

/**
 * Removes a known plaintext secret from a string (used by smoke output that
 * legitimately prints a customer URL once, then never again).
 */
export function stripSecret(value: string, secret: string): string {
  if (!secret) return value;
  return value.split(secret).join("[redacted]");
}
