import { describe, expect, it } from "vitest";
import {
  resolveDatabaseUrl,
  resolveIntegrationTestDatabaseUrl,
  UnsafeTestDatabaseError,
} from "./url";

describe("integration-test database safety gate", () => {
  const SAFE = "postgres://user:pass@localhost:5433/poc_gen_test";

  it("returns null when TEST_DATABASE_URL is unset (normal local skip)", () => {
    expect(resolveIntegrationTestDatabaseUrl({})).toBeNull();
    expect(resolveIntegrationTestDatabaseUrl({ DATABASE_URL: "postgres://u@h/prod" })).toBeNull();
  });

  it("accepts the dedicated test database names", () => {
    expect(resolveIntegrationTestDatabaseUrl({ TEST_DATABASE_URL: SAFE })).toBe(SAFE);
    expect(
      resolveIntegrationTestDatabaseUrl({ TEST_DATABASE_URL: "postgres://u@h:5432/poc_test" }),
    ).toBe("postgres://u@h:5432/poc_test");
    expect(
      resolveIntegrationTestDatabaseUrl({ TEST_DATABASE_URL: "postgres://u@h:5432/anything_test" }),
    ).toBe("postgres://u@h:5432/anything_test");
  });

  it("refuses TEST_DATABASE_URL identical to DATABASE_URL", () => {
    expect(() =>
      resolveIntegrationTestDatabaseUrl({ TEST_DATABASE_URL: SAFE, DATABASE_URL: SAFE }),
    ).toThrow(UnsafeTestDatabaseError);
    expect(() =>
      resolveIntegrationTestDatabaseUrl({ TEST_DATABASE_URL: SAFE, DATABASE_URL: SAFE }),
    ).toThrow(/must not equal DATABASE_URL/);
  });

  it("refuses database names that do not look like test databases", () => {
    for (const name of ["production", "poc", "customers", "postgres", "poc_test_live"]) {
      expect(
        () => resolveIntegrationTestDatabaseUrl({ TEST_DATABASE_URL: `postgres://u@h/${name}` }),
        name,
      ).toThrow(UnsafeTestDatabaseError);
    }
  });

  it("refuses unparsable URLs", () => {
    expect(() => resolveIntegrationTestDatabaseUrl({ TEST_DATABASE_URL: "not-a-url" })).toThrow(
      UnsafeTestDatabaseError,
    );
  });

  it("resolveDatabaseUrl keeps its documented behavior (no fallback change)", () => {
    // Test mode still PREFERS TEST_DATABASE_URL for ordinary app use; the
    // safety gate above is what protects destructive suites.
    expect(resolveDatabaseUrl({ TEST_DATABASE_URL: "a", DATABASE_URL: "b" }, "test")).toBe("a");
    expect(resolveDatabaseUrl({ DATABASE_URL: "b" }, "test")).toBe("b");
    expect(resolveDatabaseUrl({ TEST_DATABASE_URL: "a" }, "production")).toBeUndefined();
  });
});
