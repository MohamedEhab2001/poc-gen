import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClosureBanner } from "@/components/poc/ClosureBanner";
import { getRecordDisposition } from "@/lib/poc/disposition";
import { normalizeRecord } from "@/lib/poc/normalize";
import { renderTheme } from "@/lib/poc/render";
import { getPocRepository } from "@/lib/poc/repository";
import { recordShareLinkUse, resolveShareLink } from "@/server/share/service";

export const metadata: Metadata = {
  title: "Website concept",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

/**
 * Customer share route. Everything about resolution is generic on failure:
 * invalid, expired, revoked, view-capped, and non-renderable records all
 * return the same 404. No provenance, warnings, or internal identifiers are
 * ever exposed here. Validation is request-time synchronous.
 */
export default async function SharedPocPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) notFound();

  const resolved = await resolveShareLink(token);
  if (!resolved) notFound();

  const raw = await getPocRepository().getBySlug(resolved.slug);
  if (!raw) notFound();

  // Request-time record checks: drafts, expired, archived, and permanently
  // closed records never render through a share link.
  if (getRecordDisposition(raw) !== "render") notFound();

  const used = await recordShareLinkUse(resolved);
  if (!used) notFound();

  const record = normalizeRecord(raw);

  return (
    <>
      <ClosureBanner record={record} />
      {await renderTheme(record)}
    </>
  );
}
