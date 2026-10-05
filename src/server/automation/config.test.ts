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

  it("keeps the per-domain limit high enough for a three-message campaign batch", () => {
    expect(resolveAutomationConfig({}, "development").perDomainDailyLimit).toBe(3);
    expect(
      resolveAutomationConfig({ OUTREACH_PER_DOMAIN_DAILY_LIMIT: "1" }, "production")
        .perDomainDailyLimit,
    ).toBe(3);
    expect(
      resolveAutomationConfig({ OUTREACH_PER_DOMAIN_DAILY_LIMIT: "7" }, "production")
        .perDomainDailyLimit,
    ).toBe(7);
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

  it("rejects unknown email providers; selects mock or emailjs exhaustively", () => {
    const unknown = resolveAutomationConfig({ OUTREACH_EMAIL_PROVIDER: "ses" }, "development");
    expect(unknown.productionProblems.join(" ")).toMatch(/unknown/);
    expect(resolveAutomationConfig({ OUTREACH_EMAIL_PROVIDER: "mock" }, "development").emailProvider).toBe("mock");
    expect(resolveAutomationConfig({ OUTREACH_EMAIL_PROVIDER: "emailjs" }, "development").emailProvider).toBe("emailjs");
    expect(resolveAutomationConfig({}, "development").emailProvider).toBe("mock");
  });

  it("mock fails closed in production when live sending is enabled", () => {
    const config = resolveAutomationConfig(
      {
        OUTREACH_SEND_ENABLED: "true",
        OUTREACH_EMAIL_PROVIDER: "mock",
        OUTREACH_SENDER_NAME: "S",
        OUTREACH_FROM_EMAIL: "s@example.com",
        OUTREACH_POSTAL_ADDRESS: "1 Way",
        CONTACT_DATA_ENCRYPTION_KEYS: `k:${KEY}`,
        CONTACT_DATA_ACTIVE_KEY_ID: "k",
      },
      "production",
    );
    expect(config.productionComplete).toBe(false);
    expect(config.productionProblems.join(" ")).toMatch(/mock.*fails closed in production/s);
  });

  it("incomplete EmailJS configuration fails closed when sending is enabled", () => {
    const base = {
      OUTREACH_SEND_ENABLED: "true",
      OUTREACH_EMAIL_PROVIDER: "emailjs",
      OUTREACH_SENDER_NAME: "S",
      OUTREACH_FROM_EMAIL: "s@example.com",
      OUTREACH_POSTAL_ADDRESS: "1 Way",
      CONTACT_DATA_ENCRYPTION_KEYS: `k:${KEY}`,
      CONTACT_DATA_ACTIVE_KEY_ID: "k",
      EMAILJS_SERVICE_ID: "service_x",
    };
    const missing = resolveAutomationConfig(base, "production");
    expect(missing.productionProblems.join(" ")).toMatch(/EmailJS configuration is incomplete/);
    const complete = resolveAutomationConfig(
      {
        ...base,
        EMAILJS_TEMPLATE_ID: "template_x",
        EMAILJS_PUBLIC_KEY: "pk",
        EMAILJS_PRIVATE_KEY: "priv",
      },
      "production",
    );
    expect(complete.productionProblems.join(" ")).not.toMatch(/EmailJS/);
  });

  it("EMAILJS_PRIVATE_KEY is required in production with live sending", () => {
    const config = resolveAutomationConfig(
      {
        OUTREACH_SEND_ENABLED: "true",
        OUTREACH_EMAIL_PROVIDER: "emailjs",
        EMAILJS_SERVICE_ID: "s",
        EMAILJS_TEMPLATE_ID: "t",
        EMAILJS_PUBLIC_KEY: "pk",
        OUTREACH_SENDER_NAME: "S",
        OUTREACH_FROM_EMAIL: "s@example.com",
        OUTREACH_POSTAL_ADDRESS: "1 Way",
        CONTACT_DATA_ENCRYPTION_KEYS: `k:${KEY}`,
        CONTACT_DATA_ACTIVE_KEY_ID: "k",
      },
      "production",
    );
    expect(config.productionProblems.join(" ")).toMatch(/EMAILJS_PRIVATE_KEY/);
  });

  it("EMAILJS_DRY_RUN defaults to true outside production and is honored explicitly", () => {
    expect(resolveAutomationConfig({}, "development").emailjsDryRun).toBe(true);
    expect(resolveAutomationConfig({}, "test").emailjsDryRun).toBe(true);
    expect(resolveAutomationConfig({}, "production").emailjsDryRun).toBe(false);
    expect(resolveAutomationConfig({ EMAILJS_DRY_RUN: "true" }, "production").emailjsDryRun).toBe(true);
    expect(resolveAutomationConfig({ EMAILJS_DRY_RUN: "false" }, "development").emailjsDryRun).toBe(false);
    expect(resolveAutomationConfig({ EMAILJS_REQUEST_TIMEOUT_MS: "2000" }, "development").emailjsRequestTimeoutMs).toBe(2000);
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
