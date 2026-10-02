import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { resolveDatabaseUrl } from "./url";

/**
 * Lazy database access. The client is created on first query, never at
 * import time, so `next build` performs no database connection and the
 * production build succeeds without DATABASE_URL. The resolved URL is
 * server-only by construction (this module is server-only).
 */

let client: postgres.Sql | null = null;

export { resolveDatabaseUrl };

export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!client) {
    const url = resolveDatabaseUrl();
    if (!url) {
      throw new Error("No database URL is configured.");
    }
    client = postgres(url, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      // Prepared statements break with some poolers (PgBouncer transaction mode).
      prepare: false,
    });
  }
  return drizzle(client);
}

/** Closes pooled connections (graceful shutdown hook for Phase 5). */
export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
  }
}
