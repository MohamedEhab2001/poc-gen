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

/** Isolated temporary directory per test; removed by afterEach. */
async function tempDir(): Promise<string> {
  return fs.mkdtemp(path.join(tmpdir(), "poc-share-test-"));
}

describe("atomic view consumption", () => {
  it("maxViews=1: two concurrent consumption attempts yield exactly one success (json store)", async () => {
    const dir = await tempDir();
    try {
      const store = new JsonFileShareLinkStore(path.join(dir, "links.json"));
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
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
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

  it("a revoke racing consumption cannot authorize a render after revocation lands", async () => {
    const store = new InMemoryShareLinkStore();
    await store.create(makeLink());
    const now = new Date();
    // Fire consumption attempts and revocation simultaneously.
    const settled = await Promise.all([
      ...Array.from({ length: 6 }, () => store.consumeByTokenHash("a".repeat(64), now)),
      store.revokeById("link-1", now),
    ]);
    const successes = settled.slice(0, 6).filter((r) => r !== null).length;
    const revoked = settled[6] === true;
    expect(revoked).toBe(true);
    // Post-revocation, no further consumption is possible.
    expect(await store.consumeByTokenHash("a".repeat(64), now)).toBeNull();
    expect(successes).toBeLessThanOrEqual(6);
  });

  it("expired links cannot be consumed, including the exact boundary", async () => {
    const store = new InMemoryShareLinkStore();
    const now = new Date("2026-10-03T12:00:00Z");
    await store.create(makeLink({ expiresAt: "2026-10-03T12:00:00Z" })); // boundary
    expect(await store.consumeByTokenHash("a".repeat(64), now)).toBeNull();
    await store.create(makeLink({ id: "link-2", tokenHash: "b".repeat(64), expiresAt: "2026-10-03T11:59:59Z" }));
    expect(await store.consumeByTokenHash("b".repeat(64), now)).toBeNull();
  });

  it("revokeById is atomic: concurrent revokes yield exactly one success", async () => {
    const dir = await tempDir();
    try {
      const store = new JsonFileShareLinkStore(path.join(dir, "links.json"));
      await store.create(makeLink());
      const now = new Date();
      const results = await Promise.all([
        store.revokeById("link-1", now),
        store.revokeById("link-1", now),
      ]);
      expect(results.filter(Boolean)).toHaveLength(1);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});

describe("hardened JSON store", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await tempDir();
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("treats a missing file as empty (ENOENT only)", async () => {
    const store = new JsonFileShareLinkStore(path.join(dir, "links.json"));
    expect(await store.listBySlug("anything")).toEqual([]);
  });

  it("does not share mutable empty state between stores on different files", async () => {
    const storeA = new JsonFileShareLinkStore(path.join(dir, "a.json"));
    const storeB = new JsonFileShareLinkStore(path.join(dir, "b.json"));
    await storeA.create(makeLink());
    expect(await storeB.listBySlug("merchant-vine")).toEqual([]);
    expect(await storeA.listBySlug("merchant-vine")).toHaveLength(1);
  });

  it("corrupted JSON throws and is never overwritten", async () => {
    const file = path.join(dir, "links.json");
    await fs.writeFile(file, "{ not valid json !!", "utf8");
    const store = new JsonFileShareLinkStore(file);
    await expect(store.listBySlug("x")).rejects.toBeInstanceOf(ShareStoreCorruptError);
    // A later create must not silently replace the corrupted file.
    await expect(store.create(makeLink())).rejects.toBeInstanceOf(ShareStoreCorruptError);
    expect(await fs.readFile(file, "utf8")).toBe("{ not valid json !!");
  });

  it("wrong-shape JSON is treated as corruption", async () => {
    const file = path.join(dir, "links.json");
    await fs.writeFile(file, JSON.stringify({ version: 2, links: [] }), "utf8");
    const store = new JsonFileShareLinkStore(file);
    await expect(store.listBySlug("x")).rejects.toBeInstanceOf(ShareStoreCorruptError);
  });

  it("non-ENOENT read failures are not swallowed (deterministic EISDIR)", async () => {
    // Reading a directory as a file fails with EISDIR on every platform and
    // regardless of privileges — unlike permission-bit tests under root.
    const store = new JsonFileShareLinkStore(dir);
    await expect(store.listBySlug("x")).rejects.not.toBeInstanceOf(ShareStoreCorruptError);
  });

  it("leaves no stray temp files after writes", async () => {
    const file = path.join(dir, "links.json");
    const store = new JsonFileShareLinkStore(file);
    await store.create(makeLink());
    const entries = await fs.readdir(dir);
    expect(entries).toEqual(["links.json"]);
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

  it("prefers TEST_DATABASE_URL in test mode only", () => {
    expect(selectShareLinkStoreKind({ TEST_DATABASE_URL: "postgres://t" }, "test")).toBe("postgres");
    expect(selectShareLinkStoreKind({ TEST_DATABASE_URL: "postgres://t" }, "development")).toBe("json");
    expect(selectShareLinkStoreKind({ TEST_DATABASE_URL: "postgres://t" }, "production")).toBe("unavailable");
    expect(selectShareLinkStoreKind({}, "development")).toBe("json");
  });

  it("the unavailable store fails closed on every operation", async () => {
    const store = new UnavailableShareLinkStore();
    await expect(store.create(makeLink())).rejects.toBeInstanceOf(ShareStoreUnavailableError);
    await expect(store.consumeByTokenHash("a".repeat(64), new Date())).rejects.toBeInstanceOf(
      ShareStoreUnavailableError,
    );
    await expect(store.revokeById("link-1", new Date())).rejects.toBeInstanceOf(
      ShareStoreUnavailableError,
    );
    await expect(store.listBySlug("x")).rejects.toBeInstanceOf(ShareStoreUnavailableError);
  });
});
