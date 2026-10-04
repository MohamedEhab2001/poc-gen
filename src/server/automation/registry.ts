import "server-only";

import type { ZodType } from "zod";
import { z } from "zod";
import {
  finishRunInputSchema,
  ingestLeadsInputSchema,
  interestedLeadsInputSchema,
  listDueFollowupsInputSchema,
  prepareOutreachInputSchema,
  publishPocInputSchema,
  recordReplyInputSchema,
  retryFailedLeadInputSchema,
  runQaInputSchema,
  runReportInputSchema,
  sendOutreachInputSchema,
  startRunInputSchema,
  suppressContactInputSchema,
  upsertPocInputSchema,
} from "@/lib/automation/schemas";
import { AutomationError, toStructuredFailure } from "@/lib/automation/outcomes";
import { isInfrastructureError } from "./db";
import type { CallAuth, CallContext } from "./context";
import { buildCallContext } from "./context";
import { acquireIdempotency, completeIdempotency } from "./support";
import { assertAutomationProductionConfig, getAutomationConfig } from "./config";
import { getDb } from "@/server/db/client";
import { finishAutomationRun, getRunReport, startAutomationRun } from "./operations/runs";
import { ingestLeads } from "./operations/ingest";
import { publishPoc, retryFailedLead, runPocQa, upsertPocRecord } from "./operations/poc";
import { listDueFollowups, prepareOutreach, sendOutreach } from "./operations/outreach";
import { getInterestedLeads, recordReplyOutcome, suppressContact } from "./operations/replies";

/**
 * The single operation registry. The MCP adapter and the internal HTTP
 * adapter are thin wrappers over dispatchOperation(); all business logic
 * lives in the operation modules. Read and mutation scopes are declared per
 * operation; every mutation requires an idempotency key, is audited, and is
 * replay-safe.
 */

export const AUTOMATION_SCOPES = [
  "poc:read",
  "poc:write",
  "outreach:prepare",
  "outreach:send",
  "reports:read",
] as const;

export type AutomationScope = (typeof AUTOMATION_SCOPES)[number];

type OperationHandler = (input: unknown, ctx: CallContext) => Promise<unknown>;

interface OperationDefinition {
  description: string;
  scope: AutomationScope;
  mutating: boolean;
  inputSchema: ZodType<unknown>;
  handler: OperationHandler;
  /** Extra stripping for results before idempotency storage (e.g. tokens). */
  sanitizeForStorage?: (result: Record<string, unknown>) => Record<string, unknown>;
}

async function healthHandler(): Promise<unknown> {
  const config = getAutomationConfig();
  return {
    service: "poc-gen-automation",
    version: "2a",
    automationEnabled: config.automationEnabled,
    emergencyStop: config.emergencyStop,
    sendingEnabled: config.sendingEnabled,
    databaseConfigured: Boolean(process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL),
    scopes: [...config.mcpRequiredScopes],
  };
}

const registry: Record<string, OperationDefinition> = {
  health: {
    description:
      "Read-only service capabilities: enabled flags, emergency stop, configured scopes. Reveals no secrets.",
    scope: "poc:read",
    mutating: false,
    inputSchema: z.object({}),
    handler: healthHandler,
  },
  start_automation_run: {
    description:
      "Start an automation run (idempotent). Returns the run id, status, and counters used to correlate later steps.",
    scope: "poc:write",
    mutating: true,
    inputSchema: startRunInputSchema,
    handler: (input, ctx) => startAutomationRun(input as never, ctx),
  },
  ingest_leads: {
    description:
      "Ingest up to 10 researched lead candidates with evidence snapshots. Deduplicates transactionally; returns created / matched_existing / conflict / rejected / invalid per candidate.",
    scope: "poc:write",
    mutating: true,
    inputSchema: ingestLeadsInputSchema,
    handler: (input, ctx) => ingestLeads(input as never, ctx),
  },
  upsert_poc_record: {
    description:
      "Store or update the complete BusinessPocRecord for one lead (schema-validated, evidence-backed, theme checked). Writes the previous version to immutable revisions.",
    scope: "poc:write",
    mutating: true,
    inputSchema: upsertPocInputSchema,
    handler: (input, ctx) => upsertPocRecord(input as never, ctx),
  },
  run_poc_qa: {
    description:
      "Run the deterministic QA gates over the lead's stored record. Any blocking failure rejects or quarantines the lead automatically; no override exists.",
    scope: "poc:write",
    mutating: true,
    inputSchema: runQaInputSchema,
    handler: (input, ctx) => runPocQa(input as never, ctx),
  },
  publish_poc: {
    description:
      "Publish a QA-passed POC and create a secure share link. The plaintext link URL is returned exactly once (replays return the token-redacted result).",
    scope: "poc:write",
    mutating: true,
    inputSchema: publishPocInputSchema,
    handler: (input, ctx) => publishPoc(input as never, ctx),
    sanitizeForStorage: (result) => ({ ...result, shareLinkUrl: null }),
  },
  prepare_outreach: {
    description:
      "Validate and store an outreach draft (subject, body with the {{poc_link}} placeholder, evidence references). Enforces non-deceptive subjects and the compliance footer.",
    scope: "outreach:prepare",
    mutating: true,
    inputSchema: prepareOutreachInputSchema,
    handler: (input, ctx) => prepareOutreach(input as never, ctx),
  },
  send_outreach: {
    description:
      "Send a prepared message through the configured provider. Requires OUTREACH_SEND_ENABLED; enforces suppression checks, rate limits, and reservation before the provider call.",
    scope: "outreach:send",
    mutating: true,
    inputSchema: sendOutreachInputSchema,
    handler: (input, ctx) => sendOutreach(input as never, ctx),
  },
  list_due_followups: {
    description:
      "List leads whose next follow-up is due and still eligible (no reply, suppression, bounce, terminal state, expired POC, or revoked link). Bounded result.",
    scope: "outreach:prepare",
    mutating: false,
    inputSchema: listDueFollowupsInputSchema,
    handler: (input, ctx) => listDueFollowups(input as never, ctx),
  },
  record_reply_outcome: {
    description:
      "Record an externally classified reply (INTERESTED, QUESTION, NOT_INTERESTED, UNSUBSCRIBE, OUT_OF_OFFICE, BOUNCE, AMBIGUOUS). Applies the deterministic stop/suppress/defer actions.",
    scope: "outreach:prepare",
    mutating: true,
    inputSchema: recordReplyInputSchema,
    handler: (input, ctx) => recordReplyOutcome(input as never, ctx),
  },
  suppress_contact: {
    description: "Create a permanent suppression entry for a contact address or a lead's contacts.",
    scope: "outreach:prepare",
    mutating: true,
    inputSchema: suppressContactInputSchema,
    handler: (input, ctx) => suppressContact(input as never, ctx),
  },
  get_run_report: {
    description:
      "STRICTLY read-only bounded report for one automation run: status, counters, redacted steps, and ambiguous-reply exceptions. Mutates nothing. Close a run with finish_automation_run.",
    scope: "reports:read",
    mutating: false,
    inputSchema: runReportInputSchema,
    handler: (input) => getRunReport(input as never),
  },
  finish_automation_run: {
    description:
      "Close a running automation run with a status derived from its steps (failed / completed_with_skips / completed). Idempotent; audited; requires poc:write.",
    scope: "poc:write",
    mutating: true,
    inputSchema: finishRunInputSchema,
    handler: (input, ctx) => finishAutomationRun(input as never, ctx),
  },
  get_interested_leads: {
    description:
      "Leads marked INTERESTED with safe summaries and share-link view counts.",
    scope: "reports:read",
    mutating: false,
    inputSchema: interestedLeadsInputSchema,
    handler: (input) => getInterestedLeads(input as never),
  },
  retry_failed_lead: {
    description:
      "Explicitly retry a technically FAILED lead by restoring its pre-failure status. Audited; never bypasses policy gates.",
    scope: "poc:write",
    mutating: true,
    inputSchema: retryFailedLeadInputSchema,
    handler: (input, ctx) => retryFailedLead(input as never, ctx),
  },
};

export function listAutomationOperations(): Array<{
  name: string;
  description: string;
  scope: AutomationScope;
  mutating: boolean;
}> {
  return Object.entries(registry).map(([name, op]) => ({
    name,
    description: op.description,
    scope: op.scope,
    mutating: op.mutating,
  }));
}

export function getOperationInputSchema(name: string): ZodType<unknown> | null {
  return registry[name]?.inputSchema ?? null;
}

export interface DispatchSuccess {
  ok: true;
  result: unknown;
}

export type DispatchResult =
  | DispatchSuccess
  | { ok: false; failure: ReturnType<typeof toStructuredFailure> };

/**
 * Single entry point for adapters. Checks the scope, validates input,
 * enforces the idempotency contract for mutations, executes, audits, and
 * normalizes every failure into a structured, redacted shape.
 */
export async function dispatchOperation(
  name: string,
  rawInput: unknown,
  auth: CallAuth,
): Promise<DispatchResult> {
  const config = getAutomationConfig();
  assertAutomationProductionConfig(config);
  const operation = registry[name];
  if (!operation) {
    return {
      ok: false,
      failure: { ok: false, code: "unknown_operation", outcome: "REJECTED", message: "No such operation." },
    };
  }
  if (!auth.scopes.includes(operation.scope)) {
    return {
      ok: false,
      failure: {
        ok: false,
        code: "insufficient_scope",
        outcome: "REJECTED",
        message: `This operation requires the "${operation.scope}" scope.`,
        details: { requiredScope: operation.scope },
      },
    };
  }
  if (operation.mutating && !config.automationEnabled) {
    return {
      ok: false,
      failure: {
        ok: false,
        code: "automation_disabled",
        outcome: "REJECTED",
        message: "Automation is disabled on this deployment.",
      },
    };
  }

  const parsed = operation.inputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      failure: {
        ok: false,
        code: "invalid_input",
        outcome: "REJECTED",
        message: "The operation input failed validation.",
        details: {
          issues: parsed.error.issues.slice(0, 10).map((issue) => ({
            path: issue.path.join("."),
            code: issue.code,
          })),
        },
      },
    };
  }
  const input = parsed.data as Record<string, unknown>;

  try {
    if (!operation.mutating) {
      const ctx = buildCallContext(auth, "");
      const result = await operation.handler(input, ctx);
      return { ok: true, result };
    }

    // Mutating path: idempotency is mandatory.
    const idempotencyKey = String(input.idempotencyKey ?? "");
    if (idempotencyKey.length === 0) {
      throw new AutomationError(
        "idempotency_key_required",
        "Mutating operations require an idempotency key.",
        "REJECTED",
      );
    }
    const ctx = buildCallContext(auth, idempotencyKey);
    ctx.runId = typeof input.runId === "string" ? input.runId : null;

    const acquisition = await acquireIdempotency({
      db: getDb(),
      operation: name,
      principal: auth.principal,
      idempotencyKey,
      request: input,
      now: ctx.now,
    });
    if (acquisition.kind === "replay") {
      const saved = (acquisition.result as { value?: unknown } | null)?.value ?? acquisition.result;
      return { ok: true, result: { ...(saved as Record<string, unknown>), replayed: true } };
    }
    if (acquisition.kind === "in_progress") {
      throw new AutomationError(
        "idempotency_in_progress",
        "The same idempotency key is still executing.",
        "RETRYABLE",
        acquisition.retryAfterSeconds,
      );
    }

    const result = await operation.handler(input, ctx);
    // Fresh executions report replayed:false symmetrically with replays.
    if (typeof (result as Record<string, unknown> | null)?.replayed === "undefined") {
      (result as Record<string, unknown>).replayed = false;
    }
    const stored = operation.sanitizeForStorage
      ? operation.sanitizeForStorage(result as Record<string, unknown>)
      : (result as Record<string, unknown>);
    await completeIdempotency({
      db: getDb(),
      operation: name,
      principal: auth.principal,
      idempotencyKey,
      status: "completed",
      result: stored,
    });
    // Auditing: every mutating operation writes its own specific, audited
    // entry inside its transaction (see the operation modules); the
    // dispatcher deliberately does not add a second generic row.
    return { ok: true, result };
  } catch (error) {
    if (operation.mutating) {
      const idempotencyKey = String(input?.idempotencyKey ?? "");
      if (idempotencyKey) {
        await completeIdempotency({
          db: getDb(),
          operation: name,
          principal: auth.principal,
          idempotencyKey,
          status: "failed",
          result: toStructuredFailure(error),
        }).catch(() => undefined);
      }
    }
    if (isInfrastructureError(error)) {
      return {
        ok: false,
        failure: {
          ok: false,
          code: "database_error",
          outcome: "RETRYABLE",
          message: "The operation could not be completed.",
          retryAfterSeconds: 30,
        },
      };
    }
    return { ok: false, failure: toStructuredFailure(error) };
  }
}
