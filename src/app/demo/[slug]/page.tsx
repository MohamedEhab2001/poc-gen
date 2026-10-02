import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClosureBanner } from "@/components/poc/ClosureBanner";
import { ExpiredState, PermanentlyClosedState } from "@/components/poc/states/RecordStates";
import { getRecordDisposition } from "@/lib/poc/disposition";
import { normalizeRecord } from "@/lib/poc/normalize";
import { renderTheme } from "@/lib/poc/render";
import { getPocRepository } from "@/lib/poc/repository";
import { requireOperator } from "@/server/auth/authorize";

/**
 * Static generic metadata: /demo performs no record lookup at metadata time
 * at all, so nothing about a record — its existence, name, or state — can
 * leak through metadata, prefetching, or partially authorized sessions
 * (including an operator removed from ADMIN_EMAILS whose signed cookie is
 * still valid).
 */
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
 * Operator-only fixture demo route. The customer-facing surface is /p/[token];
 * this route exists for internal inspection of records by slug and shares the
 * same operator authentication as /themes and /preview (middleware plus a
 * server-boundary re-check, never middleware alone). Authorization happens
 * before any record lookup, so unauthenticated requests never learn whether
 * a slug exists.
 */
export default async function DemoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireOperator(`/demo/${slug}`);
  const raw = await getPocRepository().getBySlug(slug);
  if (!raw) notFound();

  const disposition = getRecordDisposition(raw);
  if (disposition === "not_found") notFound();

  const record = normalizeRecord(raw);

  if (disposition === "expired") {
    return <ExpiredState conceptLabel={record.poc.conceptLabel} />;
  }

  if (disposition === "permanently_closed") {
    return (
      <PermanentlyClosedState
        businessName={record.identity.name}
        address={record.location?.formattedAddress ?? null}
      />
    );
  }

  return (
    <>
      <ClosureBanner record={record} />
      {await renderTheme(record)}
    </>
  );
}
