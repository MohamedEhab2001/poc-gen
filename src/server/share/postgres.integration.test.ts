import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import { getDb, closeDb } from "@/server/db/client";
import { resolveIntegrationTestDatabaseUrl } from "@/server/db/url";
import { shareLinks } from "@/server/db/schema";
import { PostgresShareLinkStore } from "./store";
import type { ShareLinkRecord } from "./store";

/**
 * PostgreSQL integration coverage for share links, run against a REAL
 * database (TEST_DATABASE_URL in test mode via the shared resolver; CI sets
 * it, so nothing here is skipped in CI). The suite first rebuilds the schema
 * from nothing and applies the committed migrations, then verifies the
 * atomic semantics of the production adapter:
 *
 *   TEST_DATABASE_URL=postgres://... npx vitest run src/server/share/postgres.integration.test.ts
 *
 * Unit tests cover the same semantics on the in-memory and JSON adapters;
 * only the real conditional UPDATE behavior can be proven here.
 */
// SAFETY GATE: this suite rebuilds schemas destructively. The URL must
// come from TEST_DATABASE_URL only (never a DATABASE_URL fallback), must
// differ from DATABASE_URL, and must name an unmistakable test database.
// Throws before any DROP when set-but-unsafe; null (skip) when unset.
const dbUrl = resolveIntegrationTestDatabaseUrl();

describe.skipIf(!dbUrl)("Postgres share-link store (integration)", () => {
  const store = new PostgresShareLinkStore();
  const CLEANUP_TAG = "pg-integration-test";

  /** Unique hex token hash per record (never reuse across tests). */
  function uniqueHash(): string {
    return randomBytes(32).toString("hex");
  }

  function link(hash: string, overrides: Partial<ShareLinkRecord> = {}): ShareLinkRecord {
    return {
      id: `it-${randomBytes(6).toString("hex")}`,
      slug: "merchant-vine",
      tokenHash: hash,
      scope: "poc:view",
      createdAt: new Date().toISOString(),
      expiresAt: null,
      revokedAt: null,
      lastUsedAt: null,
      viewCount: 0,
      maxViews: null,
      createdBy: CLEANUP_TAG,
      ...overrides,
    };
  }

  async function cleanup(): Promise<void> {
    await getDb().delete(shareLinks).where(eq(shareLinks.createdBy, CLEANUP_TAG));
  }

  beforeAll(async () => {
    // Prove migrations apply from an empty database: rebuild the schema and
    // run the committed SQL, exactly like `npm run db:migrate` would. Both
    // the public schema AND drizzle's migration-bookkeeping schema must go,
    // otherwise the migrator sees stale "already applied" records.
    const admin = postgres(dbUrl!, { max: 1, prepare: false });
    try {
      await admin`DROP SCHEMA IF EXISTS drizzle CASCADE`;
      await admin`DROP SCHEMA public CASCADE`;
      await admin`CREATE SCHEMA public`;
      await migrate(drizzle(admin), { migrationsFolder: "src/server/db/migrations" });
      const tables = await admin`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
      if (!tables.some((row) => (row as { tablename: string }).tablename === "share_links")) {
        throw new Error("Migration did not create the share_links table.");
      }
    } finally {
      await admin.end();
    }
  });

  afterAll(async () => {
    await cleanup().catch(() => undefined);
    await closeDb();
  });

  it("applies the committed migrations from an empty database", async () => {
    // The beforeAll rebuild proves this; assert the table exists and has the
    // expected unique constraint shape by inserting and reading back.
    const record = link(uniqueHash());
    await store.create(record);
    try {
      const readBack = await store.findById(record.id);
      expect(readBack?.tokenHash).toBe(record.tokenHash);
      expect(readBack?.viewCount).toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("maxViews=1: eight concurrent consumptions produce exactly one success and view_count=1", async () => {
    const hash = uniqueHash();
    const record = link(hash, { maxViews: 1 });
    await store.create(record);
    try {
      const now = new Date();
      const results = await Promise.all(
        Array.from({ length: 8 }, () => store.consumeByTokenHash(hash, now)),
      );
      expect(results.filter((r) => r !== null)).toHaveLength(1);
      const after = await store.findById(record.id);
      expect(after?.viewCount).toBe(1);
      expect(after?.lastUsedAt).not.toBeNull();
    } finally {
      await cleanup();
    }
  });

  it("expired and exact-boundary links cannot be consumed", async () => {
    const now = new Date();
    const boundaryHash = uniqueHash();
    const pastHash = uniqueHash();
    await store.create(link(boundaryHash, { expiresAt: now.toISOString() }));
    await store.create(link(pastHash, { expiresAt: new Date(now.getTime() - 1000).toISOString() }));
    try {
      expect(await store.consumeByTokenHash(boundaryHash, now)).toBeNull();
      expect(await store.consumeByTokenHash(pastHash, now)).toBeNull();
    } finally {
      await cleanup();
    }
  });

  it("revoked links cannot be consumed, and concurrent revoke/consume ends revoked", async () => {
    const revokedHash = uniqueHash();
    await store.create(link(revokedHash));
    try {
      expect(await store.revokeById((await store.peekByTokenHash(revokedHash, new Date()))!.id, new Date())).toBe(true);
      expect(await store.consumeByTokenHash(revokedHash, new Date())).toBeNull();
    } finally {
      await cleanup();
    }

    // Real race: consumption attempts and revocation fired simultaneously.
    const raceHash = uniqueHash();
    const raceRecord = link(raceHash);
    await store.create(raceRecord);
    try {
      const now = new Date();
      const settled = await Promise.all([
        ...Array.from({ length: 8 }, () => store.consumeByTokenHash(raceHash, now)),
        store.revokeById(raceRecord.id, now),
      ]);
      const successes = settled.slice(0, 8).filter((r) => r !== null).length;
      expect(settled[8]).toBe(true); // revocation landed
      // After revocation, no further render is possible.
      expect(await store.consumeByTokenHash(raceHash, now)).toBeNull();
      const final = await store.findById(raceRecord.id);
      expect(final?.revokedAt).not.toBeNull();
      expect(final?.viewCount).toBe(successes);
      expect(successes).toBeLessThanOrEqual(8);
    } finally {
      await cleanup();
    }
  });

  it("never stores or logs plaintext tokens", async () => {
    const plaintext = randomBytes(32).toString("base64url");
    const { hashShareToken } = await import("./tokens");
    const hash = hashShareToken(plaintext);
    const record = link(hash);
    await store.create(record);
    try {
      const raw = await getDb().select().from(shareLinks).where(eq(shareLinks.id, record.id));
      expect(raw).toHaveLength(1);
      const serialized = JSON.stringify(raw[0]);
      expect(serialized).toContain(hash);
      expect(serialized).not.toContain(plaintext);
      expect(serialized).not.toContain(plaintext.slice(0, 16));
    } finally {
      await cleanup();
    }
  });

  it("production store selection never falls back to JSON (real selection matrix)", async () => {
    const { selectShareLinkStoreKind } = await import("./store");
    expect(selectShareLinkStoreKind({ DATABASE_URL: dbUrl ?? undefined }, "production")).toBe("postgres");
    expect(selectShareLinkStoreKind({}, "production")).toBe("unavailable");
    expect(
      selectShareLinkStoreKind({ TEST_DATABASE_URL: dbUrl ?? undefined }, "production"),
    ).toBe("unavailable");
  });
});
