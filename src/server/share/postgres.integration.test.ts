import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { shareLinks } from "@/server/db/schema";
import { PostgresShareLinkStore } from "./store";
import type { ShareLinkRecord } from "./store";

/**
 * PostgreSQL integration coverage for share links. CONDITIONAL: runs only
 * when TEST_DATABASE_URL (or DATABASE_URL) is set, because it needs a real
 * database with the committed migrations applied:
 *
 *   TEST_DATABASE_URL=postgres://... npm run db:migrate   # against that db
 *   TEST_DATABASE_URL=postgres://... npx vitest run src/server/share/postgres.integration.test.ts
 *
 * Unit tests in store.test.ts cover the same semantics without a database
 * (in-memory and hardened JSON adapters); this file verifies the atomic
 * UPDATE semantics of the production adapter specifically.
 */
const dbUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

describe.skipIf(!dbUrl)("Postgres share-link store (integration)", () => {
  const store = new PostgresShareLinkStore();
  const TOKEN_HASH = "f".repeat(64);

  function link(overrides: Partial<ShareLinkRecord> = {}): ShareLinkRecord {
    return {
      id: `it-${Math.random().toString(36).slice(2, 10)}`,
      slug: "merchant-vine",
      tokenHash: TOKEN_HASH,
      scope: "poc:view",
      createdAt: new Date().toISOString(),
      expiresAt: null,
      revokedAt: null,
      lastUsedAt: null,
      viewCount: 0,
      maxViews: null,
      createdBy: "integration-test",
      ...overrides,
    };
  }

  it("maxViews=1: concurrent consumption yields exactly one success", async () => {
    const record = link({ maxViews: 1 });
    await store.create(record);
    try {
      const now = new Date();
      const results = await Promise.all(
        Array.from({ length: 8 }, () => store.consumeByTokenHash(TOKEN_HASH, now)),
      );
      expect(results.filter((r) => r !== null)).toHaveLength(1);
      const after = await store.findById(record.id);
      expect(after?.viewCount).toBe(1);
    } finally {
      await getDb().delete(shareLinks).where(eq(shareLinks.id, record.id));
    }
  });

  it("rejects the exact expiration boundary and revoked links", async () => {
    const now = new Date();
    const boundary = link({ expiresAt: new Date(now.getTime()).toISOString() });
    const revoked = link({ revokedAt: now.toISOString() });
    await store.create(boundary);
    await store.create(revoked);
    try {
      expect(await store.consumeByTokenHash(TOKEN_HASH, now)).toBeNull();
    } finally {
      await getDb().delete(shareLinks).where(eq(shareLinks.id, boundary.id));
      await getDb().delete(shareLinks).where(eq(shareLinks.id, revoked.id));
    }
  });
});
