import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { getAutomationConfig } from "@/server/automation/config";
import type { AutomationConfig } from "@/server/automation/config";
import { AUTOMATION_SCOPES } from "@/server/automation/registry";
import type { AutomationScope } from "@/server/automation/registry";

/**
 * Remote-MCP authentication.
 *
 * Production: OAuth 2.1 style bearer JWTs. The access token is validated
 * against the configured issuer and audience with keys from the configured
 * JWKS endpoint (an operator-configured URL — never caller-supplied), and
 * the operation scope must be present in the token's scope claim. Any
 * missing, expired, wrong-issuer, wrong-audience, or insufficient-scope
 * credential is rejected generically.
 *
 * Development only: a static bearer token, accepted ONLY when
 * ALLOW_DEV_MCP_BEARER=true AND NODE_ENV !== "production" (enforced here AND
 * in configuration resolution, so enabling it in production is structurally
 * impossible). Dev tokens grant every automation scope.
 */

export interface AuthenticatedPrincipal {
  principal: string;
  scopes: AutomationScope[];
}

export type AuthFailure =
  | { kind: "missing_credentials" }
  | { kind: "invalid_token" }
  | { kind: "insufficient_scopes"; required: AutomationScope[] };

export type McpAuthResult =
  | { ok: true; auth: AuthenticatedPrincipal }
  | { ok: false; status: 401 | 403; failure: AuthFailure };

function scopesFromToken(payload: { scope?: unknown }): string[] {
  if (typeof payload.scope === "string") return payload.scope.split(" ").filter(Boolean);
  if (Array.isArray(payload.scope)) return payload.scope.filter((s): s is string => typeof s === "string");
  return [];
}

/** Verifies an Authorization header value for the automation surface. */
export async function authenticateAutomationRequest(
  authorization: string | null,
  config: AutomationConfig = getAutomationConfig(),
): Promise<McpAuthResult> {
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return { ok: false, status: 401, failure: { kind: "missing_credentials" } };
  }
  const token = authorization.slice("Bearer ".length).trim();
  if (token.length === 0) {
    return { ok: false, status: 401, failure: { kind: "missing_credentials" } };
  }

  // Development-only static bearer. The production check is duplicated from
  // configuration resolution on purpose: even a future config regression
  // cannot enable this path in production.
  if (config.devBearerAllowed && !config.isProduction && config.devBearerToken) {
    const presented = createHash("sha256").update(token, "utf8").digest();
    const expected = createHash("sha256").update(config.devBearerToken, "utf8").digest();
    if (timingSafeEqual(presented, expected)) {
      return { ok: true, auth: { principal: "dev-bearer", scopes: [...AUTOMATION_SCOPES] } };
    }
    return { ok: false, status: 401, failure: { kind: "invalid_token" } };
  }

  // Production fail-closed: OAuth configuration must be complete.
  if (!config.mcpExpectedIssuer || !config.mcpExpectedAudience || !config.mcpJwksUrl) {
    return { ok: false, status: 401, failure: { kind: "invalid_token" } };
  }

  try {
    const JWKS = createRemoteJWKSet(new URL(config.mcpJwksUrl));
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: config.mcpExpectedIssuer,
      audience: config.mcpExpectedAudience,
      algorithms: ["RS256", "ES256", "ES384"],
      clockTolerance: 60,
      requiredClaims: ["iss", "aud", "exp", "iat", "sub"],
    });
    const tokenScopes = scopesFromToken(payload as { scope?: unknown });
    const granted = AUTOMATION_SCOPES.filter(
      (scope) => tokenScopes.includes(scope) || tokenScopes.includes("*"),
    );
    if (granted.length === 0) {
      return { ok: false, status: 403, failure: { kind: "insufficient_scopes", required: [...config.mcpRequiredScopes as AutomationScope[]] } };
    }
    const principal = typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : "unknown-principal";
    return { ok: true, auth: { principal: `jwt:${principal}`, scopes: granted } };
  } catch {
    // Wrong issuer/audience/expiry/signature all collapse to the same
    // generic rejection; details never leave the server.
    return { ok: false, status: 401, failure: { kind: "invalid_token" } };
  }
}

export function authFailureResponse(failure: AuthFailure): { status: number; body: Record<string, unknown> } {
  if (failure.kind === "missing_credentials") {
    return {
      status: 401,
      body: {
        error: "unauthorized",
        error_description: "A bearer access token is required.",
      },
    };
  }
  if (failure.kind === "insufficient_scopes") {
    return {
      status: 403,
      body: {
        error: "insufficient_scope",
        error_description: "The access token lacks a required scope.",
      },
    };
  }
  return { status: 401, body: { error: "invalid_token", error_description: "The access token is invalid or expired." } };
}
