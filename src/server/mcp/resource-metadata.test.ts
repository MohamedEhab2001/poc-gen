import { describe, expect, it } from "vitest";
import { resolveAutomationConfig } from "@/server/automation/config";
import {
  getMcpProtectedResourceMetadata,
  getMcpResourceMetadataUrl,
  getMcpResourceUrl,
  getMcpWwwAuthenticate,
} from "./resource-metadata";

function config(baseUrl?: string) {
  return resolveAutomationConfig(
    {
      MCP_PUBLIC_BASE_URL: baseUrl,
      MCP_EXPECTED_ISSUER: "https://issuer.example/",
      MCP_EXPECTED_AUDIENCE: "https://poc.example/api/mcp",
      MCP_JWKS_URL: "https://issuer.example/.well-known/jwks.json",
      MCP_REQUIRED_SCOPES: "poc:read poc:write",
    },
    "production",
  );
}

describe("MCP protected resource discovery", () => {
  it("advertises the exact MCP endpoint as the canonical resource", () => {
    const resolved = config("https://poc.example/");
    expect(getMcpResourceUrl(resolved, "https://internal.invalid/api/mcp")).toBe(
      "https://poc.example/api/mcp",
    );
    expect(getMcpProtectedResourceMetadata(resolved, "https://internal.invalid/api/mcp")).toEqual({
      resource: "https://poc.example/api/mcp",
      authorization_servers: ["https://issuer.example/"],
      scopes_supported: ["poc:read", "poc:write"],
    });
  });

  it("falls back to the request origin and advertises RFC 9728 metadata on 401", () => {
    const resolved = config();
    const requestUrl = "https://poc.example/api/mcp";
    expect(getMcpResourceMetadataUrl(resolved, requestUrl)).toBe(
      "https://poc.example/.well-known/oauth-protected-resource",
    );
    expect(getMcpWwwAuthenticate(resolved, requestUrl)).toContain(
      'resource_metadata="https://poc.example/.well-known/oauth-protected-resource"',
    );
  });
});
