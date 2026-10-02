import { NextResponse } from "next/server";
import { z } from "zod";
import { getPocRepository } from "@/lib/poc/repository";
import { getOperator } from "@/server/auth/authorize";
import { createShareLink, listShareLinksForSlug } from "@/server/share/service";

const createSchema = z.object({
  slug: z.string().min(1).max(96).regex(/^[a-z0-9-]+$/),
  expiresInDays: z.number().int().min(1).max(365).nullable().optional(),
  maxViews: z.number().int().min(1).max(100_000).nullable().optional(),
});

/**
 * Operator-only share-link creation. Returns the plaintext token exactly
 * once; only its SHA-256 hash is persisted. Requires an authenticated,
 * allowlisted operator session.
 */
export async function POST(request: Request) {
  const operator = await getOperator();
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const record = await getPocRepository().getBySlug(parsed.data.slug);
  if (!record) {
    // Generic: do not confirm whether the record exists.
    return NextResponse.json({ error: "Cannot create a link for this record." }, { status: 404 });
  }

  const created = await createShareLink({
    slug: parsed.data.slug,
    createdBy: operator.email,
    record,
    expiresInDays: parsed.data.expiresInDays ?? null,
    maxViews: parsed.data.maxViews ?? null,
  });
  if (!created) {
    return NextResponse.json({ error: "This record cannot be shared." }, { status: 409 });
  }

  const origin =
    process.env.SHARE_LINK_BASE_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;

  return NextResponse.json({
    id: created.id,
    url: `${origin}/p/${created.token}`,
    expiresAt: created.expiresAt,
    maxViews: created.maxViews,
  });
}

/** Lists share links for a slug (hashes only, never tokens). */
export async function GET(request: Request) {
  const operator = await getOperator();
  if (!operator) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const slug = new URL(request.url).searchParams.get("slug") ?? "";
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: "Invalid slug." }, { status: 400 });
  }
  const links = await listShareLinksForSlug(slug);
  const now = Date.now();
  return NextResponse.json({
    links: links.map((link) => ({
      id: link.id,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      revokedAt: link.revokedAt,
      lastUsedAt: link.lastUsedAt,
      viewCount: link.viewCount,
      maxViews: link.maxViews,
      status: link.revokedAt
        ? "revoked"
        : link.expiresAt && new Date(link.expiresAt).getTime() <= now
          ? "expired"
          : link.maxViews !== null && link.viewCount >= link.maxViews
            ? "exhausted"
            : "active",
    })),
  });
}
