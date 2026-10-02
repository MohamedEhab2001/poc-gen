import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { resolveDatabaseUrl } from "./url";

/**
 * Applies the committed SQL migrations in src/server/db/migrations.
 * Run with: npm run db:migrate (requires DATABASE_URL; in test mode the
 * shared resolver prefers TEST_DATABASE_URL, matching the integration tests).
 */
async function main() {
  const url = resolveDatabaseUrl();
  if (!url) {
    console.error("DATABASE_URL is required to run migrations.");
    process.exit(1);
  }
  const client = postgres(url, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: "src/server/db/migrations" });
    console.log("Migrations applied.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
