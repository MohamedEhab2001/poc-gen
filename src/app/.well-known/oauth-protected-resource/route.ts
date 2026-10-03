import { NextResponse } from "next/server";
import { getAutomationConfig } from "@/server/automation/config";

/**
 * RFC 9728 protected resource metadata for the remote MCP server, telling
 * OAuth-capable MCP clients which authorization server to use. Only
 * operator-configured values are emitted; nothing here is caller-supplied.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = getAutomationConfig();
  const resource =
    config.mcpPublicBaseUrl ?? new URL(request.url).origin;

  if (!config.mcpExpectedIssuer) {
    // No authorization server configured: advertise an empty list rather
    // than fabricating one.
    return NextResponse.json(
      { resource, authorization_servers: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      resource,
      authorization_servers: [config.mcpExpectedIssuer],
      scopes_supported: config.mcpRequiredScopes,
      resource_documentation: config.mcpPublicBaseUrl ? `${config.mcpPublicBaseUrl}/docs/automation-bridge.md` : undefined,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
