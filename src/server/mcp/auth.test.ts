import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { authenticateAutomationRequest } from "./auth";
import type { AutomationConfig } from "@/server/automation/config";
import { resolveAutomationConfig } from "@/server/automation/config";

/**
 * JWT validation against a REAL local JWKS endpoint (ephemeral port). The
 * JWKS URL is operator configuration here, exactly as in production — never
 * caller-supplied.
 */

let server: Server;
let jwksUrl = "";
const kid = "test-key-1";
let privateKey: CryptoKey;
let publicKeyJwk: JsonWebKey;

beforeAll(async () => {
  const { publicKey, privateKey: priv } = await generateKeyPair("RS256");
  privateKey = priv;
  publicKeyJwk = await exportJWK(publicKey);
  server = createServer((req, res) => {
    if (req.url?.startsWith("/jwks")) {
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ keys: [{ ...publicKeyJwk, kid, alg: "RS256", use: "sig" }] }));
    } else {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (typeof address === "object" && address) {
    jwksUrl = `http://127.0.0.1:${address.port}/jwks`;
  }
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function productionConfig(): AutomationConfig {
  return resolveAutomationConfig(
    {
      MCP_EXPECTED_ISSUER: "https://issuer.example",
      MCP_EXPECTED_AUDIENCE: "poc-gen",
      MCP_JWKS_URL: jwksUrl,
      MCP_REQUIRED_SCOPES: "poc:read poc:write outreach:prepare outreach:send reports:read",
    },
    "production",
  );
}

async function mintToken(claims: {
  subject?: string;
  issuer?: string;
  audience?: string | string[];
  scope?: string | string[];
  expiresIn?: string;
  expired?: boolean;
}): Promise<string> {
  return new SignJWT({
    ...(claims.scope !== undefined ? { scope: claims.scope } : {}),
  })
    .setProtectedHeader({ alg: "RS256", kid })
    .setSubject(claims.subject ?? "chatgpt-scheduler")
    .setIssuer(claims.issuer ?? "https://issuer.example")
    .setAudience(claims.audience ?? "poc-gen")
    .setIssuedAt()
    .setExpirationTime(
      claims.expired ? Math.floor(Date.now() / 1000) - 3600 : (claims.expiresIn ?? "15m"),
    )
    .sign(privateKey);
}

describe("MCP bearer authentication", () => {
  it("rejects missing credentials generically", async () => {
    const result = await authenticateAutomationRequest(null, productionConfig());
    expect(result).toEqual({ ok: false, status: 401, failure: { kind: "missing_credentials" } });
  });

  it("accepts a valid JWT and grants only the token's scopes", async () => {
    const token = await mintToken({ scope: "poc:read reports:read" });
    const result = await authenticateAutomationRequest(`Bearer ${token}`, productionConfig());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.auth.principal).toBe("jwt:chatgpt-scheduler");
      expect(result.auth.scopes).toEqual(["poc:read", "reports:read"]);
    }
  });

  it("supports wildcard scope grants", async () => {
    const token = await mintToken({ scope: "*" });
    const result = await authenticateAutomationRequest(`Bearer ${token}`, productionConfig());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.auth.scopes.length).toBe(5);
  });

  it("rejects expired, wrong-issuer, wrong-audience, and garbage tokens identically", async () => {
    const config = productionConfig();
    const expired = await authenticateAutomationRequest(`Bearer ${await mintToken({ expired: true })}`, config);
    const wrongIssuer = await authenticateAutomationRequest(
      `Bearer ${await mintToken({ issuer: "https://evil.example" })}`,
      config,
    );
    const wrongAudience = await authenticateAutomationRequest(
      `Bearer ${await mintToken({ audience: "other-api" })}`,
      config,
    );
    const garbage = await authenticateAutomationRequest("Bearer not-a-jwt", config);
    for (const result of [expired, wrongIssuer, wrongAudience, garbage]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.status).toBe(401);
        expect(result.failure.kind).toBe("invalid_token");
      }
    }
  });

  it("a token with no recognizable scopes is rejected with insufficient_scopes", async () => {
    const token = await mintToken({ scope: "unrelated:scope" });
    const result = await authenticateAutomationRequest(`Bearer ${token}`, productionConfig());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
      expect(result.failure.kind).toBe("insufficient_scopes");
    }
  });

  it("production config without OAuth stays fail-closed even with a token", async () => {
    const incomplete = resolveAutomationConfig({}, "production");
    const token = await mintToken({ scope: "poc:read" });
    const result = await authenticateAutomationRequest(`Bearer ${token}`, incomplete);
    expect(result.ok).toBe(false);
  });

  it("dev bearer: constant-time static token, only outside production", async () => {
    const devConfig = resolveAutomationConfig(
      { ALLOW_DEV_MCP_BEARER: "true", DEV_MCP_BEARER_TOKEN: "dev-token-123456" },
      "development",
    );
    const ok = await authenticateAutomationRequest("Bearer dev-token-123456", devConfig);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.auth.scopes.length).toBe(5);

    const wrong = await authenticateAutomationRequest("Bearer wrong-token", devConfig);
    expect(wrong.ok).toBe(false);

    // The same config shape in production is structurally disabled.
    const prodShaped = resolveAutomationConfig(
      { ALLOW_DEV_MCP_BEARER: "true", DEV_MCP_BEARER_TOKEN: "dev-token-123456" },
      "production",
    );
    const refused = await authenticateAutomationRequest("Bearer dev-token-123456", prodShaped);
    expect(refused.ok).toBe(false);
  });
});
