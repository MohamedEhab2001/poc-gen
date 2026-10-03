/**
 * Automation outcome model. Every automated decision resolves to exactly one
 * of these outcomes; there is no manual review queue. Adapters (MCP, HTTP)
 * map these to structured errors; the external scheduler reads them and
 * decides the next tool call.
 */

export type OutcomeKind =
  | "PASS"
  | "RETRYABLE"
  | "SKIPPED"
  | "REJECTED"
  | "SUPPRESSED"
  | "QUARANTINED"
  | "FAILED";

/** Per-candidate/per-item outcome inside batch operations. */
export type ItemOutcome =
  | "created"
  | "matched_existing"
  | "conflict"
  | "rejected"
  | "invalid"
  | "skipped";

/**
 * Structured, safe error for every automation failure. `code` is a stable
 * machine-readable string the scheduler can branch on; `details` must
 * already be redacted (no addresses, tokens, bodies, or provider payloads).
 */
export class AutomationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly outcome: OutcomeKind = "FAILED",
    readonly retryAfterSeconds?: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AutomationError";
  }
}

/** Retryable infrastructure failure (database, transient provider error). */
export function retryableError(
  code: string,
  message: string,
  retryAfterSeconds = 30,
  details?: Record<string, unknown>,
): AutomationError {
  return new AutomationError(code, message, "RETRYABLE", retryAfterSeconds, details);
}

export function isAutomationError(error: unknown): error is AutomationError {
  return error instanceof AutomationError;
}

/** Response shape both MCP and HTTP adapters return for failed operations. */
export interface StructuredFailure {
  ok: false;
  code: string;
  outcome: OutcomeKind;
  message: string;
  retryAfterSeconds?: number;
  details?: Record<string, unknown>;
}

export function toStructuredFailure(error: unknown): StructuredFailure {
  if (isAutomationError(error)) {
    return {
      ok: false,
      code: error.code,
      outcome: error.outcome,
      message: error.message,
      ...(error.retryAfterSeconds !== undefined ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
      ...(error.details ? { details: error.details } : {}),
    };
  }
  // Unknown errors are deliberately opaque: no stack traces, no driver text.
  return {
    ok: false,
    code: "internal_error",
    outcome: "FAILED",
    message: "The operation failed.",
  };
}
