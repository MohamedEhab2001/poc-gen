import "server-only";

import { promises as fs } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import { shareLinks } from "@/server/db/schema";
import type { ShareLinkRow } from "@/server/db/schema";
import { getDb } from "@/server/db/client";

/**
 * Share-link persistence.
 *
 * Production: PostgreSQL via Drizzle, with ATOMIC view consumption — the
 * peek/consume split means revocation, expiry, and max-views are re-checked
 * by a single conditional UPDATE, so concurrent requests can never both
 * consume the last allowed view.
 *
 * Local development without DATABASE_URL: a hardened single-process JSON
 * file (mutex-serialized read-modify-write, ENOENT-only empty state,
 * unique temp-file replacement, corruption surfaces as an error and is
 * never silently overwritten).
 *
 * Production without DATABASE_URL: an unavailable store that fails closed
 * (ShareStoreUnavailableError); callers translate that into a controlled
 * 503 with no configuration details.
 */

export interface ShareLinkRecord {
  id: string;
  slug: string;
  /** SHA-256 hex digest of the plaintext token. Never store the token. */
  tokenHash: string;
  scope: "poc:view";
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  viewCount: number;
  maxViews: number | null;
  createdBy: string;
}

export class ShareStoreUnavailableError extends Error {
  constructor() {
    super("Share-link storage is unavailable.");
    this.name = "ShareStoreUnavailableError";
  }
}

export class ShareStoreCorruptError extends Error {
  constructor(cause: unknown) {
    super("Share-link storage is corrupted.");
    this.name = "ShareStoreCorruptError";
    this.cause = cause;
  }
}

export interface ShareLinkStore {
  create(record: ShareLinkRecord): Promise<void>;
  findById(id: string): Promise<ShareLinkRecord | null>;
  /** Non-mutating inspection under the same validity conditions as consume. */
  peekByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null>;
  /**
   * Atomically consumes one view: increments view_count and stamps
   * last_used_at only when the link is not revoked, not expired, and under
   * its view cap. Returns the updated record, or null when the conditions
   * fail. This is the only authority for rendering.
   */
  consumeByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null>;
  /**
   * Atomically revokes: sets revoked_at only when it is still null. Never
   * writes stale copies of view_count, last_used_at, or any other column.
   */
  revokeById(id: string, now: Date): Promise<boolean>;
  listBySlug(slug: string): Promise<ShareLinkRecord[]>;
}

function isValid(record: ShareLinkRecord, now: Date): boolean {
  if (record.revokedAt) return false;
  if (record.expiresAt && new Date(record.expiresAt).getTime() <= now.getTime()) return false;
  if (record.maxViews !== null && record.viewCount >= record.maxViews) return false;
  return true;
}

// ---------------------------------------------------------------------------
// PostgreSQL production store
// ---------------------------------------------------------------------------

function rowToRecord(row: ShareLinkRow): ShareLinkRecord {
  return {
    id: row.id,
    slug: row.slug,
    tokenHash: row.tokenHash,
    scope: "poc:view",
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
    viewCount: row.viewCount,
    maxViews: row.maxViews,
    createdBy: row.createdBy,
  };
}

function recordToRow(record: ShareLinkRecord) {
  return {
    id: record.id,
    slug: record.slug,
    tokenHash: record.tokenHash,
    scope: record.scope,
    createdAt: new Date(record.createdAt),
    expiresAt: record.expiresAt ? new Date(record.expiresAt) : null,
    revokedAt: record.revokedAt ? new Date(record.revokedAt) : null,
    lastUsedAt: record.lastUsedAt ? new Date(record.lastUsedAt) : null,
    viewCount: record.viewCount,
    maxViews: record.maxViews,
    createdBy: record.createdBy,
  };
}

export class PostgresShareLinkStore implements ShareLinkStore {
  async create(record: ShareLinkRecord): Promise<void> {
    await getDb().insert(shareLinks).values(recordToRow(record));
  }

  async findById(id: string): Promise<ShareLinkRecord | null> {
    const rows = await getDb().select().from(shareLinks).where(eq(shareLinks.id, id)).limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async peekByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null> {
    const rows = await getDb()
      .select()
      .from(shareLinks)
      .where(
        and(
          eq(shareLinks.tokenHash, tokenHash),
          isNull(shareLinks.revokedAt),
          or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, now)),
          or(isNull(shareLinks.maxViews), lt(shareLinks.viewCount, shareLinks.maxViews)),
        ),
      )
      .limit(1);
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async consumeByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null> {
    const rows = await getDb()
      .update(shareLinks)
      .set({
        viewCount: sql`${shareLinks.viewCount} + 1`,
        lastUsedAt: now,
      })
      .where(
        and(
          eq(shareLinks.tokenHash, tokenHash),
          isNull(shareLinks.revokedAt),
          or(isNull(shareLinks.expiresAt), gt(shareLinks.expiresAt, now)),
          or(isNull(shareLinks.maxViews), lt(shareLinks.viewCount, shareLinks.maxViews)),
        ),
      )
      .returning();
    return rows[0] ? rowToRecord(rows[0]) : null;
  }

  async revokeById(id: string, now: Date): Promise<boolean> {
    const rows = await getDb()
      .update(shareLinks)
      .set({ revokedAt: now })
      .where(and(eq(shareLinks.id, id), isNull(shareLinks.revokedAt)))
      .returning({ id: shareLinks.id });
    return rows.length > 0;
  }

  async listBySlug(slug: string): Promise<ShareLinkRecord[]> {
    const rows = await getDb().select().from(shareLinks).where(eq(shareLinks.slug, slug));
    return rows.map(rowToRecord);
  }
}

// ---------------------------------------------------------------------------
// Hardened JSON store (local development and tests, single process only)
// ---------------------------------------------------------------------------

/** Promise-chain mutex: serializes complete read-modify-write cycles. */
class Mutex {
  private tail: Promise<unknown> = Promise.resolve();

  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn, fn);
    this.tail = next.catch(() => undefined);
    return next;
  }
}

interface FileShape {
  version: 1;
  links: ShareLinkRecord[];
}

/** Factory: every empty read returns a fresh object. Never share mutable state. */
function emptyStore(): FileShape {
  return { version: 1, links: [] };
}

export class JsonFileShareLinkStore implements ShareLinkStore {
  private mutex = new Mutex();

  constructor(private filePath: string) {}

  private async read(): Promise<FileShape> {
    let raw: string;
    try {
      raw = await fs.readFile(this.filePath, "utf8");
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      // Only a missing file is an empty store. Permission errors, EISDIR, and
      // anything else surface as real errors and never silently reset data.
      if (code === "ENOENT") return emptyStore();
      throw error;
    }
    try {
      const parsed = JSON.parse(raw) as FileShape;
      if (parsed.version !== 1 || !Array.isArray(parsed.links)) {
        throw new Error("unexpected shape");
      }
      return parsed;
    } catch (error) {
      // Corrupted files are reported, never overwritten by later writes.
      throw new ShareStoreCorruptError(error);
    }
  }

  private async write(data: FileShape): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${randomBytes(8).toString("hex")}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { encoding: "utf8" });
    await fs.rename(tmp, this.filePath);
  }

  private async withLock<T>(fn: (data: FileShape) => Promise<T> | T): Promise<T> {
    return this.mutex.run(async () => fn(await this.read()));
  }

  async create(record: ShareLinkRecord): Promise<void> {
    await this.withLock(async (data) => {
      data.links.push(record);
      await this.write(data);
    });
  }

  async findById(id: string): Promise<ShareLinkRecord | null> {
    return this.withLock((data) => data.links.find((link) => link.id === id) ?? null);
  }

  async peekByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null> {
    return this.withLock((data) => {
      const record = data.links.find((link) => link.tokenHash === tokenHash);
      return record && isValid(record, now) ? record : null;
    });
  }

  async consumeByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null> {
    return this.withLock(async (data) => {
      const record = data.links.find((link) => link.tokenHash === tokenHash);
      if (!record || !isValid(record, now)) return null;
      record.viewCount += 1;
      record.lastUsedAt = now.toISOString();
      await this.write(data);
      return record;
    });
  }

  async revokeById(id: string, now: Date): Promise<boolean> {
    return this.withLock(async (data) => {
      const record = data.links.find((link) => link.id === id);
      if (!record || record.revokedAt) return false;
      record.revokedAt = now.toISOString();
      await this.write(data);
      return true;
    });
  }

  async listBySlug(slug: string): Promise<ShareLinkRecord[]> {
    return this.withLock((data) => data.links.filter((link) => link.slug === slug));
  }
}

// ---------------------------------------------------------------------------
// In-memory store (unit tests)
// ---------------------------------------------------------------------------

export class InMemoryShareLinkStore implements ShareLinkStore {
  private records = new Map<string, ShareLinkRecord>();

  async create(record: ShareLinkRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async findById(id: string): Promise<ShareLinkRecord | null> {
    return this.records.get(id) ?? null;
  }

  async peekByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null> {
    for (const record of this.records.values()) {
      if (record.tokenHash === tokenHash) return isValid(record, now) ? record : null;
    }
    return null;
  }

  async consumeByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null> {
    for (const record of this.records.values()) {
      if (record.tokenHash === tokenHash) {
        if (!isValid(record, now)) return null;
        record.viewCount += 1;
        record.lastUsedAt = now.toISOString();
        return record;
      }
    }
    return null;
  }

  async revokeById(id: string, now: Date): Promise<boolean> {
    const record = this.records.get(id);
    if (!record || record.revokedAt) return false;
    record.revokedAt = now.toISOString();
    return true;
  }

  async listBySlug(slug: string): Promise<ShareLinkRecord[]> {
    return [...this.records.values()].filter((record) => record.slug === slug);
  }
}

// ---------------------------------------------------------------------------
// Unavailable store (production without DATABASE_URL: fail closed)
// ---------------------------------------------------------------------------

export class UnavailableShareLinkStore implements ShareLinkStore {
  private fail(): never {
    throw new ShareStoreUnavailableError();
  }

  async create(record: ShareLinkRecord): Promise<void> {
    void record;
    this.fail();
  }

  async findById(id: string): Promise<ShareLinkRecord | null> {
    void id;
    this.fail();
  }

  async peekByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null> {
    void tokenHash;
    void now;
    this.fail();
  }

  async consumeByTokenHash(tokenHash: string, now: Date): Promise<ShareLinkRecord | null> {
    void tokenHash;
    void now;
    this.fail();
  }

  async revokeById(id: string, now: Date): Promise<boolean> {
    void id;
    void now;
    this.fail();
  }

  async listBySlug(slug: string): Promise<ShareLinkRecord[]> {
    void slug;
    this.fail();
  }
}

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

export type ShareStoreKind = "postgres" | "json" | "unavailable";

/**
 * Pure selection rule: production NEVER falls back to JSON. Uses the shared
 * database URL resolver (test mode prefers TEST_DATABASE_URL). Unit tested.
 */
export function selectShareLinkStoreKind(
  env: Record<string, string | undefined>,
  nodeEnv: string | undefined,
): ShareStoreKind {
  const hasDb = Boolean(
    nodeEnv === "test" ? env.TEST_DATABASE_URL ?? env.DATABASE_URL : env.DATABASE_URL,
  );
  if (nodeEnv === "production") {
    return hasDb ? "postgres" : "unavailable";
  }
  return hasDb ? "postgres" : "json";
}

let active: ShareLinkStore | null = null;

export function getShareLinkStore(): ShareLinkStore {
  if (!active) {
    const kind = selectShareLinkStoreKind(process.env, process.env.NODE_ENV);
    if (kind === "postgres") {
      active = new PostgresShareLinkStore();
    } else if (kind === "json") {
      active = new JsonFileShareLinkStore(path.join(process.cwd(), ".data", "share-links.json"));
    } else {
      active = new UnavailableShareLinkStore();
    }
  }
  return active;
}

/** Test seam. */
export function setShareLinkStore(store: ShareLinkStore): void {
  active = store;
}
