import "server-only";

import { randomUUID } from "node:crypto";
import { getRecordDisposition } from "@/lib/poc/disposition";
import type { BusinessPocRecord } from "@/lib/poc/schema";
import { getShareLinkStore } from "./store";
import type { ShareLinkRecord } from "./store";
import { generateShareToken, hashShareToken, tokenHashMatches } from "./tokens";

export interface CreatedShareLink {
  id: string;
  token: string;
  slug: string;
  expiresAt: string | null;
  maxViews: number | null;
}

export interface ResolvedShareLink {
  record: ShareLinkRecord;
  slug: string;
}

/**
 * Share-link service. Validation happens at request time: revocation,
 * expiry, and view caps are enforced synchronously, never by a background
 * job. Records that should not render (draft, expired, archived, closed)
 * fail resolution generically.
 */

export async function createShareLink(input: {
  slug: string;
  createdBy: string;
  record: BusinessPocRecord;
  expiresInDays?: number | null;
  maxViews?: number | null;
}): Promise<CreatedShareLink | null> {
  // Only records that currently render may be shared.
  if (getRecordDisposition(input.record) !== "render") return null;

  const token = generateShareToken();
  const now = new Date();
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
  await getShareLinkStore().create(record);
  return {
    id: record.id,
    token,
    slug: record.slug,
    expiresAt: record.expiresAt,
    maxViews: record.maxViews,
  };
}

export async function resolveShareLink(
  token: string,
  now: Date = new Date(),
): Promise<ResolvedShareLink | null> {
  const tokenHash = hashShareToken(token);
  const record = await getShareLinkStore().findByTokenHash(tokenHash);
  if (!record) return null;
  if (!tokenHashMatches(record.tokenHash, tokenHash)) return null;
  if (record.revokedAt) return null;
  if (record.expiresAt && new Date(record.expiresAt).getTime() <= now.getTime()) return null;
  if (record.maxViews !== null && record.viewCount >= record.maxViews) return null;

  return { record, slug: record.slug };
}

/** Marks a use (view) on a resolved link; caps are re-checked. */
export async function recordShareLinkUse(
  link: ResolvedShareLink,
  now: Date = new Date(),
): Promise<boolean> {
  const { record } = link;
  if (record.maxViews !== null && record.viewCount + 1 > record.maxViews) return false;
  record.viewCount += 1;
  record.lastUsedAt = now.toISOString();
  await getShareLinkStore().update(record);
  return true;
}

export async function revokeShareLink(id: string, now: Date = new Date()): Promise<boolean> {
  const store = getShareLinkStore();
  const record = await store.findById(id);
  if (!record || record.revokedAt) return false;
  record.revokedAt = now.toISOString();
  await store.update(record);
  return true;
}

export async function listShareLinksForSlug(slug: string): Promise<ShareLinkRecord[]> {
  return getShareLinkStore().listBySlug(slug);
}
