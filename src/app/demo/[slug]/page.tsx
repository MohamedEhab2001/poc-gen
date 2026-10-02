import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClosureBanner } from "@/components/poc/ClosureBanner";
import { ExpiredState, PermanentlyClosedState } from "@/components/poc/states/RecordStates";
import { getRecordDisposition } from "@/lib/poc/disposition";
import { requireOperator } from "@/server/auth/authorize";
import { buildPocMetadata } from "@/lib/poc/metadata";
import { normalizeRecord } from "@/lib/poc/normalize";
import { renderTheme } from "@/lib/poc/render";
import { getPocRepository } from "@/lib/poc/repository";

type PageProps = { params: Promise<{ slug: string }> };

const GENERIC_NOINDEX_METADATA: Metadata = {
  title: "Website concept",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Operator-only fixture demo route. The customer-facing surface is /p/[token];
 * this route exists for internal inspection of records by slug and shares the
 * same operator authentication as /themes and /preview (middleware plus a
 * server-boundary re-check, never middleware alone). Authorization happens
 * before any record lookup, so unauthenticated requests never learn whether
 * a slug exists.
 *
 * Unindexed by default, record-driven metadata, and safe states for draft,
 * archived, expired, and permanently closed records. A permanently closed
 * business never renders a sales POC.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const record = await getPocRepository().getBySlug(slug);
  if (!record) return GENERIC_NOINDEX_METADATA;
  if (getRecordDisposition(record) !== "render") return GENERIC_NOINDEX_METADATA;
  return buildPocMetadata(normalizeRecord(record));
}

export default async function DemoPage({ params }: PageProps) {
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
