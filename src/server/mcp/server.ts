import "server-only";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { dispatchOperation, listAutomationOperations } from "@/server/automation/registry";
import {
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
import { sha256Hex } from "@/lib/automation/canonical";
import type { AuthenticatedPrincipal } from "./auth";

/**
 * MCP server factory. Every tool is a thin wrapper over the shared
 * automation registry: the input schema IS the operation's Zod schema (the
 * SDK consumes the raw shape), the handler dispatches through the same
 * idempotency/audit pipeline as the internal HTTP adapter, and results are
 * bounded, redacted structured JSON. No business logic lives here.
 */

const INPUT_SHAPES: Record<string, Record<string, z.ZodTypeAny>> = {
  health: {},
  start_automation_run: startRunInputSchema.shape,
  ingest_leads: ingestLeadsInputSchema.shape,
  upsert_poc_record: upsertPocInputSchema.shape,
  run_poc_qa: runQaInputSchema.shape,
  publish_poc: publishPocInputSchema.shape,
  prepare_outreach: prepareOutreachInputSchema.shape,
  send_outreach: sendOutreachInputSchema.shape,
  list_due_followups: listDueFollowupsInputSchema.shape,
  record_reply_outcome: recordReplyInputSchema.shape,
  suppress_contact: suppressContactInputSchema.shape,
  get_run_report: runReportInputSchema.shape,
  get_interested_leads: interestedLeadsInputSchema.shape,
  retry_failed_lead: retryFailedLeadInputSchema.shape,
};

export function buildAutomationMcpServer(principal: AuthenticatedPrincipal): McpServer {
  const server = new McpServer(
    { name: "poc-gen-automation", version: "2a" },
    {
      instructions:
        "Autonomous lead-to-POC automation bridge. Every mutating tool requires an idempotencyKey; replays with the same key and request return the saved result. Failed operations return structured { ok:false, code, outcome, message } objects; outcome RETRYABLE carries retryAfterSeconds.",
    },
  );

  for (const operation of listAutomationOperations()) {
    const shape = INPUT_SHAPES[operation.name];
    if (!shape) continue;
    const description = `${operation.description}${operation.mutating ? " [mutating: requires idempotencyKey]" : " [read-only]"} Required scope: ${operation.scope}.`;
    server.tool(operation.name, description, shape, async (input) => {
      const result = await dispatchOperation(operation.name, input, {
        principal: principal.principal,
        scopes: principal.scopes,
      });
      if (!result.ok) {
        return { isError: true, content: [{ type: "text" as const, text: safeJson(result.failure) }] };
      }
      return { content: [{ type: "text" as const, text: safeJson(result.result) }] };
    });
  }

  return server;
}

/** Bounded, redacted serialization for tool results. */
function safeJson(value: unknown): string {
  const serialized = JSON.stringify(value ?? {});
  return serialized.length > 60_000
    ? JSON.stringify({
        ok: false,
        code: "result_too_large",
        outcome: "FAILED",
        message: "The result exceeded the transport bound.",
      })
    : serialized;
}

/** Stable, non-reversible correlation id for request logging. */
export function correlationId(seed: string): string {
  return sha256Hex(seed).slice(0, 16);
}
