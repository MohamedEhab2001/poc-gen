import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Lazy database access. The client is created on first query, never at
 * import time, so `next build` performs no database connection and the
 * production build succeeds without DATABASE_URL. DATABASE_URL is
 * server-only by construction (this module is server-only).
 */

let client: postgres.Sql | null = null;

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not configured.");
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
