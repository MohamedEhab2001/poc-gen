/**
 * Database URL resolution shared by the app client, the migration script,
 * and integration tests. Not server-only so CLI tooling can import it.
 *
 * - Test mode (NODE_ENV=test, set by Vitest): TEST_DATABASE_URL takes
 *   precedence, so integration tests can never accidentally point at a real
 *   database through DATABASE_URL.
 * - Outside tests: only DATABASE_URL is honored — a production runtime can
 *   never consume TEST_DATABASE_URL.
 */
export function resolveDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string | undefined {
  if (nodeEnv === "test") {
    return env.TEST_DATABASE_URL ?? env.DATABASE_URL;
  }
  return env.DATABASE_URL;
}

// ---------------------------------------------------------------------------
// Integration-test database safety
// ---------------------------------------------------------------------------

/** Database names that are unmistakably disposable test databases. */
const EXPLICIT_TEST_DATABASE_NAMES = new Set(["poc_test", "poc_gen_test"]);

export class UnsafeTestDatabaseError extends Error {
  constructor(reason: string) {
    super(`Refusing to run destructive integration tests: ${reason}`);
    this.name = "UnsafeTestDatabaseError";
  }
}

function databaseNameFromUrl(url: string): string | null {
  try {
    const name = new URL(url).pathname.replace(/^\//, "").trim();
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

/**
 * Safety gate for DESTRUCTIVE integration tests (schema rebuilds). Destructive
 * suites must resolve their database through THIS function, never through
 * resolveDatabaseUrl() (which may fall back to DATABASE_URL in test mode).
 *
 * Returns the URL only when every check passes:
 *  1. TEST_DATABASE_URL is set;
 *  2. it is not identical to DATABASE_URL (when DATABASE_URL is set);
 *  3. its database name is unmistakably a test database: "poc_test",
 *     "poc_gen_test", or any name ending in "_test".
 *
 * Returns null when TEST_DATABASE_URL is simply unset (ordinary local unit
 * runs keep skipping integration suites). Throws UnsafeTestDatabaseError when
 * it is set but unsafe — before any DROP/truncate could run.
 */
export function resolveIntegrationTestDatabaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const testUrl = env.TEST_DATABASE_URL;
  if (!testUrl) return null;

  if (env.DATABASE_URL && testUrl === env.DATABASE_URL) {
    throw new UnsafeTestDatabaseError(
      "TEST_DATABASE_URL must not equal DATABASE_URL (integration tests rebuild the schema).",
    );
  }

  const name = databaseNameFromUrl(testUrl);
  if (!name) {
    throw new UnsafeTestDatabaseError("TEST_DATABASE_URL is not a parsable postgres URL.");
  }
  const isTestName =
    EXPLICIT_TEST_DATABASE_NAMES.has(name) || (/^[a-z0-9_]+$/.test(name) && name.endsWith("_test"));
  if (!isTestName) {
    throw new UnsafeTestDatabaseError(
      `TEST_DATABASE_URL database "${name}" does not look like a test database ` +
        '(expected "poc_test", "poc_gen_test", or a name ending in "_test").',
    );
  }

  return testUrl;
}
