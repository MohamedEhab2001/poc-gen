import "server-only";

import { randomUUID } from "node:crypto";
import { getRecordDisposition } from "@/lib/poc/disposition";
import type { BusinessPocRecord } from "@/lib/poc/schema";
import { getShareLinkStore, PostgresShareLinkStore } from "./store";
import type { ShareDbHandle, ShareLinkRecord } from "./store";
import { generateShareToken, hashShareToken, tokenHashMatches } from "./tokens";

export interface CreatedShareLink {
  id: string;
  token: string;
  slug: string;
  expiresAt: string | null;
  maxViews: number | null;
}

/**
 * Share-link service.
 *
 * Resolution flow (public /p/[token]):
 *   1. peekShareLink: hash the token and inspect validity conditions without
 *      mutating anything and without exposing existence (null for every
 *      failure).
 *   2. The route loads the POC record and confirms it is renderable.
 *   3. consumeShareLink: the store ATOMICALLY re-checks revocation, expiry,
 *      and the view cap while incrementing the view count. Rendering is
 *      authorized only by a successful consumption.
 *
 * All time-based rules are evaluated against an injectable clock.
 */

export async function createShareLink(input: {
  slug: string;
  createdBy: string;
  record: BusinessPocRecord;
  expiresInDays?: number | null;
  maxViews?: number | null;
}): Promise<CreatedShareLink | null> {
  return createShareLinkWithin(null, input);
}

/**
 * Transaction-aware creation. Pass an open transaction handle and the link
 * is inserted INSIDE it (atomic publication); pass null to use the globally
 * selected store (operator API, tests). The plaintext token exists only in
 * the returned object; only its hash is persisted.
 */
export async function createShareLinkWithin(
  db: ShareDbHandle | null,
  input: {
    slug: string;
    createdBy: string;
    record: BusinessPocRecord;
    expiresInDays?: number | null;
    maxViews?: number | null;
    now?: Date;
  },
): Promise<CreatedShareLink | null> {
  // Only records that currently render may be shared (revalidated here).
  if (getRecordDisposition(input.record, input.now ?? new Date()) !== "render") return null;

  const token = generateShareToken();
  const now = input.now ?? new Date();
  const record: ShareLinkRecord = {
    id: randomUUID(),
    slug: input.slug,
    tokenHash: hashShareToken(token),
    scope: "poc:view",
    createdAt: now.toISOString(),
    expiresAt:
      input.expiresInDays && input.expiresInDays > 0
        ? new Date(now.getTime() + input.expiresInDays * 86_400_000).toISOString()
        : null,
    revokedAt: null,
    lastUsedAt: null,
    viewCount: 0,
    maxViews: input.maxViews && input.maxViews > 0 ? input.maxViews : null,
    createdBy: input.createdBy,
  };
  if (db) {
    await new PostgresShareLinkStore().createWith(db, record);
  } else {
    await getShareLinkStore().create(record);
  }
  return {
    id: record.id,
    token,
    slug: record.slug,
    expiresAt: record.expiresAt,
    maxViews: record.maxViews,
  };
}

/** Step 1: non-mutating validity inspection by token. */
export async function peekShareLink(
  token: string,
  now: Date = new Date(),
): Promise<{ slug: string } | null> {
  const tokenHash = hashShareToken(token);
  const record = await getShareLinkStore().peekByTokenHash(tokenHash, now);
  if (!record) return null;
  if (!tokenHashMatches(record.tokenHash, tokenHash)) return null;
  return { slug: record.slug };
}

/** Step 3: atomic consumption; the only authorization to render. */
export async function consumeShareLink(
  token: string,
  now: Date = new Date(),
): Promise<{ slug: string } | null> {
  const tokenHash = hashShareToken(token);
  const record = await getShareLinkStore().consumeByTokenHash(tokenHash, now);
  if (!record) return null;
  if (!tokenHashMatches(record.tokenHash, tokenHash)) return null;
  return { slug: record.slug };
}

export async function revokeShareLink(id: string, now: Date = new Date()): Promise<boolean> {
  return getShareLinkStore().revokeById(id, now);
}

export async function listShareLinksForSlug(slug: string): Promise<ShareLinkRecord[]> {
  return getShareLinkStore().listBySlug(slug);
}
