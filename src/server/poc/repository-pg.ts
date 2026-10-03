import "server-only";

import { desc, eq } from "drizzle-orm";
import { pocRecords } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { recordSchema } from "@/lib/poc/schema";
import type { BusinessPocRecord } from "@/lib/poc/schema";
import type { BusinessPocRepository } from "@/lib/poc/repository";

/**
 * PostgreSQL-backed POC repository. Records are JSON documents validated by
 * the shared Zod recordSchema on every read; invalid stored JSON fails
 * closed (structured server log, null to the caller) and never renders.
 *
 * Never imported from React components — the app resolves repositories
 * through getPocRepository() in lib/poc/repository.ts, which selects the
 * fixture adapter (development default) or this adapter (production / any
 * deliberate persistent-record mode).
 */

export class PostgresBusinessPocRepository implements BusinessPocRepository {
  async getBySlug(slug: string): Promise<BusinessPocRecord | null> {
    const rows = await getDb()
      .select({ record: pocRecords.record })
      .from(pocRecords)
      .where(eq(pocRecords.slug, slug))
      .limit(1);
    return validateRow(slug, rows[0]?.record);
  }

  /**
   * Customer-path resolution: the row must additionally be in the published
   * state and not past its expiration stamp. Used by /p/[token] alongside
   * the existing share-link validity checks.
   */
  async getPublishedBySlug(slug: string, now: Date = new Date()): Promise<BusinessPocRecord | null> {
    const rows = await getDb()
      .select({ record: pocRecords.record, state: pocRecords.state, expiresAt: pocRecords.expiresAt })
      .from(pocRecords)
      .where(eq(pocRecords.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (row.state !== "published") return null;
    if (row.expiresAt && row.expiresAt.getTime() <= now.getTime()) return null;
    return validateRow(slug, row.record);
  }

  async listAll(): Promise<BusinessPocRecord[]> {
    const rows = await getDb()
      .select({ record: pocRecords.record })
      .from(pocRecords)
      .orderBy(desc(pocRecords.updatedAt))
      .limit(500);
    const parsed: BusinessPocRecord[] = [];
    for (const row of rows) {
      const record = validateRow("(listed)", row.record);
      if (record) parsed.push(record);
    }
    return parsed;
  }
}

function validateRow(slug: string, raw: unknown): BusinessPocRecord | null {
  const result = recordSchema.safeParse(raw);
  if (!result.success) {
    console.error(
      `[poc] Stored record failed schema validation (slug=${slug}); failing closed.`,
      { issues: result.error.issues.slice(0, 5).map((issue) => `${issue.path.join(".")}: ${issue.code}`) },
    );
    return null;
  }
  return result.data;
}

/** Fail-closed repository for production without database configuration. */
export class UnavailableBusinessPocRepository implements BusinessPocRepository {
  private fail(): never {
    console.error("[poc] Persistent repository selected without DATABASE_URL; failing closed.");
    throw new PocRepositoryUnavailableError();
  }
  async getBySlug(): Promise<BusinessPocRecord | null> {
    this.fail();
  }
  async listAll(): Promise<BusinessPocRecord[]> {
    this.fail();
  }
}

export class PocRepositoryUnavailableError extends Error {
  constructor() {
    super("The persistent POC repository is unavailable.");
    this.name = "PocRepositoryUnavailableError";
  }
}

export type PocRepositoryKind = "fixtures" | "postgres" | "unavailable";

/**
 * Pure selection rule:
 * - POC_REPOSITORY_MODE=postgres forces the persistent adapter (requires a
 *   database URL in every environment, else fail closed).
 * - POC_REPOSITORY_MODE=fixtures forces fixtures; IMPOSSIBLE in production
 *   (synthetic businesses must never render for customers in production).
 * - auto: production uses PostgreSQL when configured and fails closed
 *   without it; development and tests keep the deterministic fixtures.
 */
export function selectPocRepositoryKind(
  env: Record<string, string | undefined>,
  nodeEnv: string | undefined,
): PocRepositoryKind {
  const hasDb = Boolean(nodeEnv === "test" ? env.TEST_DATABASE_URL ?? env.DATABASE_URL : env.DATABASE_URL);
  const mode = env.POC_REPOSITORY_MODE;
  if (mode === "postgres") return hasDb ? "postgres" : "unavailable";
  if (mode === "fixtures") return nodeEnv === "production" ? "unavailable" : "fixtures";
  if (nodeEnv === "production") return hasDb ? "postgres" : "unavailable";
  return "fixtures";
}
