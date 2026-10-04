import type { AutomationConfig } from "@/server/automation/config";

function publicBaseUrl(config: AutomationConfig, requestUrl: string): string {
  return (config.mcpPublicBaseUrl ?? new URL(requestUrl).origin).replace(/\/$/, "");
}

/** Canonical OAuth resource/audience for the remote MCP endpoint. */
export function getMcpResourceUrl(config: AutomationConfig, requestUrl: string): string {
  return `${publicBaseUrl(config, requestUrl)}/api/mcp`;
}

/** RFC 9728 metadata URL advertised from 401 responses. */
export function getMcpResourceMetadataUrl(config: AutomationConfig, requestUrl: string): string {
  return `${publicBaseUrl(config, requestUrl)}/.well-known/oauth-protected-resource`;
}

export function getMcpProtectedResourceMetadata(
  config: AutomationConfig,
  requestUrl: string,
): Record<string, unknown> {
  return {
    resource: getMcpResourceUrl(config, requestUrl),
    authorization_servers: config.mcpExpectedIssuer ? [config.mcpExpectedIssuer] : [],
    scopes_supported: config.mcpRequiredScopes,
  };
}

export function getMcpWwwAuthenticate(config: AutomationConfig, requestUrl: string): string {
  return `Bearer realm="poc-gen-mcp", resource_metadata="${getMcpResourceMetadataUrl(config, requestUrl)}", error="invalid_token"`;
}
