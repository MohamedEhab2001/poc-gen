import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClosureBanner } from "@/components/poc/ClosureBanner";
import { ExpiredState, PermanentlyClosedState } from "@/components/poc/states/RecordStates";
import { getRecordDisposition } from "@/lib/poc/disposition";
import { buildPocMetadata } from "@/lib/poc/metadata";
import { normalizeRecord } from "@/lib/poc/normalize";
import { renderTheme } from "@/lib/poc/render";
import { getPocRepository } from "@/lib/poc/repository";

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Customer-facing POC route. Unindexed by default, record-driven metadata,
 * and safe states for draft, archived, expired, and permanently closed
 * records. A permanently closed business never renders a sales POC.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const record = await getPocRepository().getBySlug(slug);
  if (!record) return { title: "Not found", robots: { index: false, follow: false } };
  return buildPocMetadata(normalizeRecord(record));
}

export default async function DemoPage({ params }: PageProps) {
  const { slug } = await params;
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
