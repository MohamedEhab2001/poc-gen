import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Share-link persistence. Phase 1 ships a durable single-writer JSON file
 * (fine for one operator); Phase 2 swaps in the PostgreSQL adapter behind
 * the same interface.
 */

export interface ShareLinkRecord {
  id: string;
  /** POC slug the link unlocks. */
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

export interface ShareLinkStore {
  create(record: ShareLinkRecord): Promise<void>;
  findById(id: string): Promise<ShareLinkRecord | null>;
  findByTokenHash(tokenHash: string): Promise<ShareLinkRecord | null>;
  listBySlug(slug: string): Promise<ShareLinkRecord[]>;
  update(record: ShareLinkRecord): Promise<void>;
}

export class InMemoryShareLinkStore implements ShareLinkStore {
  private records = new Map<string, ShareLinkRecord>();

  async create(record: ShareLinkRecord): Promise<void> {
    this.records.set(record.id, record);
  }

  async findById(id: string): Promise<ShareLinkRecord | null> {
    return this.records.get(id) ?? null;
  }

  async findByTokenHash(tokenHash: string): Promise<ShareLinkRecord | null> {
    for (const record of this.records.values()) {
      if (record.tokenHash === tokenHash) return record;
    }
    return null;
  }

  async listBySlug(slug: string): Promise<ShareLinkRecord[]> {
    return [...this.records.values()].filter((record) => record.slug === slug);
  }

  async update(record: ShareLinkRecord): Promise<void> {
    this.records.set(record.id, record);
  }
}

interface FileShape {
  version: 1;
  links: ShareLinkRecord[];
}

const EMPTY: FileShape = { version: 1, links: [] };

export class JsonFileShareLinkStore implements ShareLinkStore {
  constructor(private filePath: string) {}

  private async read(): Promise<FileShape> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as FileShape;
      return parsed.version === 1 ? parsed : EMPTY;
    } catch {
      return EMPTY;
    }
  }

  private async write(data: FileShape): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), { encoding: "utf8" });
    await fs.rename(tmp, this.filePath);
  }

  async create(record: ShareLinkRecord): Promise<void> {
    const data = await this.read();
    data.links.push(record);
    await this.write(data);
  }

  async findById(id: string): Promise<ShareLinkRecord | null> {
    const data = await this.read();
    return data.links.find((link) => link.id === id) ?? null;
  }

  async findByTokenHash(tokenHash: string): Promise<ShareLinkRecord | null> {
    const data = await this.read();
    return data.links.find((link) => link.tokenHash === tokenHash) ?? null;
  }

  async listBySlug(slug: string): Promise<ShareLinkRecord[]> {
    const data = await this.read();
    return data.links.filter((link) => link.slug === slug);
  }

  async update(record: ShareLinkRecord): Promise<void> {
    const data = await this.read();
    const index = data.links.findIndex((link) => link.id === record.id);
    if (index >= 0) {
      data.links[index] = record;
      await this.write(data);
    }
  }
}

let active: ShareLinkStore | null = null;

/** Active store: JSON file in local development and self-hosted single-node deploys. */
export function getShareLinkStore(): ShareLinkStore {
  if (!active) {
    active = new JsonFileShareLinkStore(path.join(process.cwd(), ".data", "share-links.json"));
  }
  return active;
}

/** Test seam. */
export function setShareLinkStore(store: ShareLinkStore): void {
  active = store;
}
