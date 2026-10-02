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
