import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit configuration. `generate` is offline (the placeholder URL is
 * never contacted); `migrate` and `push` require a real DATABASE_URL.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema.ts",
  out: "./src/server/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder:placeholder@localhost:5432/placeholder",
  },
  strict: true,
  verbose: true,
});
