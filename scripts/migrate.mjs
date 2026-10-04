/**
 * Plain-JS migration runner for the Docker image (no TypeScript toolchain
 * at runtime; drizzle-orm and postgres are already traced into the
 * standalone node_modules). Applies the committed SQL migrations
 * idempotently, exactly like `npm run db:migrate` does locally.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is required.");
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });
try {
  await migrate(drizzle(client), { migrationsFolder: "migrations" });
  console.log("[migrate] Migrations applied.");
} catch (error) {
  console.error("[migrate] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
