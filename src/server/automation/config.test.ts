import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { resolveAutomationConfig } from "./config";

const KEY = randomBytes(32).toString("base64");

describe("automation configuration resolution", () => {
  it("defaults: automation on, sending off, emergency stop off", () => {
    const config = resolveAutomationConfig({}, "development");
    expect(config.automationEnabled).toBe(true);
    expect(config.sendingEnabled).toBe(false);
    expect(config.emergencyStop).toBe(false);
    expect(config.dailyLeadLimit).toBe(100);
    expect(config.maxFollowups).toBe(2);
  });

  it("parses flags and clamps numeric limits", () => {
    const config = resolveAutomationConfig(
      { AUTOMATION_ENABLED: "false", AUTOMATION_EMERGENCY_STOP: "true", OUTREACH_MAX_FOLLOWUPS: "9" },
      "development",
    );
    expect(config.automationEnabled).toBe(false);
    expect(config.emergencyStop).toBe(true);
    expect(config.maxFollowups).toBe(2); // hard cap: one initial + two follow-ups
  });

  it("rejects malformed contact keys (fail closed)", () => {
    const config = resolveAutomationConfig({ CONTACT_DATA_ENCRYPTION_KEYS: "bad" }, "production");
    expect(config.productionComplete).toBe(false);
    expect(config.productionProblems.join(" ")).toMatch(/CONTACT_DATA_ENCRYPTION_KEYS/);
  });

  it("requires the full sender set when sending is enabled", () => {
    const config = resolveAutomationConfig(
      { OUTREACH_SEND_ENABLED: "true", CONTACT_DATA_ENCRYPTION_KEYS: `k:${KEY}`, CONTACT_DATA_ACTIVE_KEY_ID: "k" },
      "production",
    );
    // Missing sender name / from email / postal address.
    expect(config.productionComplete).toBe(false);
    expect(config.productionProblems.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects unimplemented email providers", () => {
    const config = resolveAutomationConfig(
      { OUTREACH_SEND_ENABLED: "true", OUTREACH_EMAIL_PROVIDER: "ses" },
      "development",
    );
    expect(config.productionProblems.join(" ")).toMatch(/not implemented/);
  });

  it("production MCP requires complete OAuth configuration (fail closed)", () => {
    const none = resolveAutomationConfig({}, "production");
    expect(none.productionComplete).toBe(false);
    expect(none.productionProblems.join(" ")).toMatch(/MCP/);

    const complete = resolveAutomationConfig(
      {
        MCP_EXPECTED_ISSUER: "https://issuer.example",
        MCP_EXPECTED_AUDIENCE: "poc-gen",
        MCP_JWKS_URL: "https://issuer.example/jwks",
        MCP_REQUIRED_SCOPES: "poc:read poc:write",
      },
      "production",
    );
    expect(complete.productionProblems.join(" ")).not.toMatch(/MCP/);
  });

  it("structurally refuses the dev bearer in production", () => {
    const config = resolveAutomationConfig(
      { ALLOW_DEV_MCP_BEARER: "true", DEV_MCP_BEARER_TOKEN: "dev-token-123456" },
      "production",
    );
    expect(config.devBearerAllowed).toBe(false);
    expect(config.productionProblems.join(" ")).toMatch(/ALLOW_DEV_MCP_BEARER/);
  });

  it("allows the dev bearer outside production when explicitly enabled", () => {
    const config = resolveAutomationConfig(
      { ALLOW_DEV_MCP_BEARER: "true", DEV_MCP_BEARER_TOKEN: "dev-token-123456" },
      "development",
    );
    expect(config.devBearerAllowed).toBe(true);
  });

  it("accepts a complete production configuration", () => {
    const config = resolveAutomationConfig(
      {
        AUTH_SECRET: "x".repeat(48),
        MCP_EXPECTED_ISSUER: "https://issuer.example",
        MCP_EXPECTED_AUDIENCE: "poc-gen",
        MCP_JWKS_URL: "https://issuer.example/jwks",
        MCP_REQUIRED_SCOPES: "poc:read poc:write outreach:prepare outreach:send reports:read",
      },
      "production",
    );
    expect(config.productionComplete).toBe(true);
    expect(config.mcpRequiredScopes).toHaveLength(5);
  });
});
