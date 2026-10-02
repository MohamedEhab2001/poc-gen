import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClosureBanner } from "@/components/poc/ClosureBanner";
import { getRecordDisposition } from "@/lib/poc/disposition";
import { normalizeRecord } from "@/lib/poc/normalize";
import { renderTheme } from "@/lib/poc/render";
import { getPocRepository } from "@/lib/poc/repository";
import { consumeShareLink, peekShareLink } from "@/server/share/service";
import { ShareStoreUnavailableError } from "@/server/share/store";

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
 * invalid, expired, revoked, view-capped, non-renderable records, and an
 * unavailable store all behave identically from the caller's perspective.
 * No provenance, warnings, or internal identifiers are ever exposed.
 *
 * Flow: inspect (peek) the token hash without mutation, load the record and
 * confirm it still renders, then ATOMICALLY consume one view — revocation,
 * expiry, and the view cap are re-checked by that single store operation, so
 * concurrent requests can never both spend the last allowed view. Rendering
 * is authorized only by a successful consumption.
 */
export default async function SharedPocPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) notFound();

  try {
    const peeked = await peekShareLink(token);
    if (!peeked) notFound();

    const raw = await getPocRepository().getBySlug(peeked.slug);
    if (!raw) notFound();

    // Request-time record checks: drafts, expired, archived, and permanently
    // closed records never render through a share link.
    if (getRecordDisposition(raw) !== "render") notFound();

    const consumed = await consumeShareLink(token);
    if (!consumed) notFound();

    const record = normalizeRecord(raw);

    return (
      <>
        <ClosureBanner record={record} />
        {await renderTheme(record)}
      </>
    );
  } catch (error) {
    if (error instanceof ShareStoreUnavailableError) {
      // Production without DATABASE_URL: fail closed without leaking storage
      // configuration. Every token behaves identically.
      console.error("[share] Share-link storage unavailable; failing closed.");
      notFound();
    }
    throw error;
  }
}
