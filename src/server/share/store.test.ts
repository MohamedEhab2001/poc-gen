import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  InMemoryShareLinkStore,
  JsonFileShareLinkStore,
  ShareStoreCorruptError,
  ShareStoreUnavailableError,
  UnavailableShareLinkStore,
  selectShareLinkStoreKind,
} from "./store";
import type { ShareLinkRecord } from "./store";

function makeLink(overrides: Partial<ShareLinkRecord> = {}): ShareLinkRecord {
  return {
    id: "link-1",
    slug: "merchant-vine",
    tokenHash: "a".repeat(64),
    scope: "poc:view",
    createdAt: "2026-10-03T10:00:00Z",
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    viewCount: 0,
    maxViews: null,
    createdBy: "op@example.com",
    ...overrides,
  };
}

function tempFilePath(): string {
  return path.join(tmpdir(), `poc-share-test-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
}

describe("atomic view consumption", () => {
  it("maxViews=1: two concurrent consumption attempts yield exactly one success (json store)", async () => {
    const store = new JsonFileShareLinkStore(tempFilePath());
    await store.create(makeLink({ maxViews: 1 }));
    const now = new Date();
    const results = await Promise.all([
      store.consumeByTokenHash("a".repeat(64), now),
      store.consumeByTokenHash("a".repeat(64), now),
    ]);
    expect(results.filter((r) => r !== null)).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(1);
    const final = await store.findById("link-1");
    expect(final?.viewCount).toBe(1);
  });

  it("maxViews=1: exactly one success across concurrent attempts (memory store)", async () => {
    const store = new InMemoryShareLinkStore();
    await store.create(makeLink({ maxViews: 1 }));
    const now = new Date();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => store.consumeByTokenHash("a".repeat(64), now)),
    );
    expect(results.filter((r) => r !== null)).toHaveLength(1);
  });

  it("revocation racing consumption cannot produce an unauthorized render", async () => {
    const store = new JsonFileShareLinkStore(tempFilePath());
    await store.create(makeLink());
    const now = new Date();
    // Revoke first, then attempt consumption (the race window after peek).
    await store.update(makeLink({ revokedAt: now.toISOString() }));
    expect(await store.consumeByTokenHash("a".repeat(64), now)).toBeNull();
  });

  it("expired links cannot be consumed, including the exact boundary", async () => {
    const store = new InMemoryShareLinkStore();
    const now = new Date("2026-10-03T12:00:00Z");
    await store.create(makeLink({ expiresAt: "2026-10-03T12:00:00Z" })); // boundary
    expect(await store.consumeByTokenHash("a".repeat(64), now)).toBeNull();
    await store.create(makeLink({ id: "link-2", tokenHash: "b".repeat(64), expiresAt: "2026-10-03T11:59:59Z" }));
    expect(await store.consumeByTokenHash("b".repeat(64), now)).toBeNull();
  });
});

describe("hardened JSON store", () => {
  let filePath: string;

  beforeEach(() => {
    filePath = tempFilePath();
  });
  afterEach(async () => {
    await fs.rm(filePath, { force: true });
  });

  it("treats a missing file as empty (ENOENT only)", async () => {
    const store = new JsonFileShareLinkStore(filePath);
    expect(await store.listBySlug("anything")).toEqual([]);
  });

  it("corrupted JSON throws and is never overwritten", async () => {
    await fs.writeFile(filePath, "{ not valid json !!", "utf8");
    const store = new JsonFileShareLinkStore(filePath);
    await expect(store.listBySlug("x")).rejects.toBeInstanceOf(ShareStoreCorruptError);
    // A later create must not silently replace the corrupted file.
    await expect(store.create(makeLink())).rejects.toBeInstanceOf(ShareStoreCorruptError);
    expect(await fs.readFile(filePath, "utf8")).toBe("{ not valid json !!");
  });

  it("wrong-shape JSON is treated as corruption", async () => {
    await fs.writeFile(filePath, JSON.stringify({ version: 2, links: [] }), "utf8");
    const store = new JsonFileShareLinkStore(filePath);
    await expect(store.listBySlug("x")).rejects.toBeInstanceOf(ShareStoreCorruptError);
  });

  it("non-ENOENT read failures are not swallowed", async () => {
    await fs.writeFile(filePath, JSON.stringify({ version: 1, links: [] }), "utf8");
    await fs.chmod(filePath, 0o000);
    try {
      const store = new JsonFileShareLinkStore(filePath);
      await expect(store.listBySlug("x")).rejects.not.toBeInstanceOf(ShareStoreCorruptError);
    } finally {
      await fs.chmod(filePath, 0o644).catch(() => undefined);
    }
  });
});

describe("store selection", () => {
  it("production never selects the JSON adapter", () => {
    expect(selectShareLinkStoreKind({ DATABASE_URL: "postgres://x" }, "production")).toBe("postgres");
    expect(selectShareLinkStoreKind({}, "production")).toBe("unavailable");
    expect(
      selectShareLinkStoreKind({ ALLOW_DEV_LOGIN: "true", POC_JSON_STORE: "1" }, "production"),
    ).toBe("unavailable");
  });

  it("development prefers the database when configured, JSON otherwise", () => {
    expect(selectShareLinkStoreKind({ DATABASE_URL: "postgres://x" }, "development")).toBe("postgres");
    expect(selectShareLinkStoreKind({}, "development")).toBe("json");
    expect(selectShareLinkStoreKind({}, "test")).toBe("json");
  });

  it("the unavailable store fails closed on every operation", async () => {
    const store = new UnavailableShareLinkStore();
    await expect(store.create(makeLink())).rejects.toBeInstanceOf(ShareStoreUnavailableError);
    await expect(store.consumeByTokenHash("a".repeat(64), new Date())).rejects.toBeInstanceOf(
      ShareStoreUnavailableError,
    );
    await expect(store.listBySlug("x")).rejects.toBeInstanceOf(ShareStoreUnavailableError);
  });
});
