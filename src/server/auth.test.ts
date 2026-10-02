import { describe, expect, it } from "vitest";
import { isAllowedOperator, resolveAuthConfig, toPublicAuthUiConfig } from "./auth/config";

const SECRET = "x".repeat(48);

describe("auth configuration (pure resolver)", () => {
  it("allows passwordless dev login only outside production", () => {
    const dev = resolveAuthConfig({}, "development");
    expect(dev.devLoginAllowed).toBe(true);

    const prod = resolveAuthConfig({}, "production");
    expect(prod.devLoginAllowed).toBe(false);
  });

  it("rejects passwordless production login even with ALLOW_DEV_LOGIN=true", () => {
    const config = resolveAuthConfig(
      { ALLOW_DEV_LOGIN: "true", ADMIN_EMAILS: "operator@example.com" },
      "production",
    );
    expect(config.devLoginAllowed).toBe(false);
    expect(config.productionAuthComplete).toBe(false);
  });

  it("requires AUTH_SECRET, ADMIN_EMAILS, and a login method in production", () => {
    expect(
      resolveAuthConfig(
        { AUTH_SECRET: SECRET, ADMIN_EMAILS: "op@example.com", OPERATOR_PASSWORD: "p" },
        "production",
      ).productionAuthComplete,
    ).toBe(true);
    expect(
      resolveAuthConfig(
        { AUTH_SECRET: SECRET, ADMIN_EMAILS: "op@example.com", AUTH_GOOGLE_ID: "a", AUTH_GOOGLE_SECRET: "b" },
        "production",
      ).productionAuthComplete,
    ).toBe(true);

    // Missing secret.
    expect(
      resolveAuthConfig({ ADMIN_EMAILS: "op@example.com", OPERATOR_PASSWORD: "p" }, "production")
        .productionAuthComplete,
    ).toBe(false);
    // Short secret.
    expect(
      resolveAuthConfig(
        { AUTH_SECRET: "short", ADMIN_EMAILS: "op@example.com", OPERATOR_PASSWORD: "p" },
        "production",
      ).productionAuthComplete,
    ).toBe(false);
    // Missing allowlist.
    expect(
      resolveAuthConfig({ AUTH_SECRET: SECRET, OPERATOR_PASSWORD: "p" }, "production")
        .productionAuthComplete,
    ).toBe(false);
    // No login method.
    expect(
      resolveAuthConfig({ AUTH_SECRET: SECRET, ADMIN_EMAILS: "op@example.com" }, "production")
        .productionAuthComplete,
    ).toBe(false);
  });

  it("keeps OAuth and password methods configured as expected", () => {
    const config = resolveAuthConfig(
      { AUTH_GOOGLE_ID: "a", AUTH_GOOGLE_SECRET: "b", OPERATOR_PASSWORD: "p" },
      "development",
    );
    expect(config.googleConfigured).toBe(true);
    expect(config.passwordConfigured).toBe(true);
    // A configured stronger method disables passwordless dev login.
    expect(config.devLoginAllowed).toBe(false);
  });

  it("allows only allowlisted operators, and the dev default only in dev", () => {
    const withList = resolveAuthConfig({ ADMIN_EMAILS: "op@example.com" }, "production");
    expect(isAllowedOperator("op@example.com", withList)).toBe(true);
    expect(isAllowedOperator("attacker@evil.example", withList)).toBe(false);
    expect(isAllowedOperator("OP@EXAMPLE.COM", withList)).toBe(true);

    const noListProd = resolveAuthConfig({}, "production");
    expect(isAllowedOperator("operator@poc-gen.local", noListProd)).toBe(false);

    const noListDev = resolveAuthConfig({}, "development");
    expect(isAllowedOperator("operator@poc-gen.local", noListDev)).toBe(true);
    expect(isAllowedOperator("someone-else@example.com", noListDev)).toBe(false);
  });

  it("never serializes operator emails or secret state into the public UI config", () => {
    const config = resolveAuthConfig(
      {
        ADMIN_EMAILS: "secret-operator@example.com,another@example.com",
        AUTH_SECRET: "super-secret-value-0123456789abcdef",
        OPERATOR_PASSWORD: "hunter2-hunter2",
        AUTH_GOOGLE_ID: "google-client-id",
        AUTH_GOOGLE_SECRET: "google-client-secret",
      },
      "production",
    );
    const serialized = JSON.stringify(toPublicAuthUiConfig(config));

    expect(serialized).not.toContain("secret-operator@example.com");
    expect(serialized).not.toContain("another@example.com");
    expect(serialized).not.toContain("super-secret-value");
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("google-client");
    expect(serialized).not.toContain("adminEmails");
    expect(serialized).not.toContain("secretConfigured");
    expect(serialized).not.toContain("productionAuthComplete");

    const publicConfig = toPublicAuthUiConfig(config);
    const keys = Object.keys(publicConfig).sort();
    expect(keys).toEqual(["devLoginEnabled", "googleEnabled", "isProduction", "passwordEnabled", "signInAvailable"]);
  });
});
