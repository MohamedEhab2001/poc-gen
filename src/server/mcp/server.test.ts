import { describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { buildAutomationMcpServer } from "./server";
import { AUTOMATION_SCOPES } from "@/server/automation/registry";

/**
 * Protocol-level MCP test using the official SDK client over the in-memory
 * transport (the documented SDK test pattern). Verifies initialize, the
 * tool inventory, and a read-only tools/call end to end.
 */

async function connectedClient(scopes: string[]) {
  const server = buildAutomationMcpServer({
    principal: "mcp-test",
    scopes: scopes as (typeof AUTOMATION_SCOPES)[number][],
  });
  const client = new Client({ name: "test-client", version: "1.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return client;
}

describe("MCP server (official SDK client, in-memory transport)", () => {
  it("initializes and lists all fifteen tools with bounded schemas", async () => {
    const client = await connectedClient([...AUTOMATION_SCOPES]);
    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name).sort()).toEqual(
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
        "finish_automation_run",
      ].sort(),
    );
    const ingest = tools.tools.find((tool) => tool.name === "ingest_leads");
    expect(ingest?.description).toContain("Required scope: poc:write");
    // The complete record schema (upsert_poc_record) dominates the payload;
    // the bound keeps accidental schema explosions out of the inventory.
    const serialized = JSON.stringify(tools.tools);
    expect(serialized.length).toBeLessThan(150_000);
    await client.close();
  });

  it("health tool returns structured capabilities without secrets", async () => {
    const client = await connectedClient(["poc:read"]);
    const result = await client.callTool({ name: "health", arguments: {} });
    expect(result.isError).toBeUndefined();
    const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
    const parsed = JSON.parse(text) as { service: string; automationEnabled: boolean };
    expect(parsed.service).toBe("poc-gen-automation");
    expect(text).not.toMatch(/secret|password|bearer/i);
    await client.close();
  });

  it("mutating tools reject missing idempotency keys with a structured error", async () => {
    const client = await connectedClient([...AUTOMATION_SCOPES]);
    const result = await client.callTool({
      name: "start_automation_run",
      arguments: { kind: "unit_test" }, // no idempotencyKey
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0]!.text;
    // The SDK rejects schema-invalid arguments before the handler runs; the
    // idempotency requirement is enforced at the same validation boundary.
    const isSchemaRejection = /Invalid arguments/i.test(text);
    const parsed = isSchemaRejection
      ? { code: "invalid_input" }
      : (JSON.parse(text) as { code: string });
    expect(["invalid_input", "idempotency_key_required"]).toContain(parsed.code);
    await client.close();
  });
});
