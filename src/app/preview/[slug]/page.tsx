import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ClosureBanner } from "@/components/poc/ClosureBanner";
import { PreviewToolbar } from "@/components/poc/preview-toolbar/PreviewToolbar";
import { ExpiredState, PermanentlyClosedState } from "@/components/poc/states/RecordStates";
import { listUnresolved } from "@/lib/poc/placeholders";
import { normalizeRecord } from "@/lib/poc/normalize";
import { renderTheme } from "@/lib/poc/render";
import { getPocRepository } from "@/lib/poc/repository";
import { themeIds } from "@/lib/poc/schema";
import type { BusinessPocRecord } from "@/lib/poc/schema";
import { themeMeta } from "@/lib/poc/theme-meta";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ theme?: string; viewport?: string; overlay?: string }>;
};

/**
 * Internal preview route. Compact toolbar with theme override, viewport
 * frames, source/provenance overlay, and the unresolved-placeholder report.
 * Every state is inspectable here, including drafts and expired records.
 */
export default async function PreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const raw = await getPocRepository().getBySlug(slug);
  if (!raw) notFound();

  const themeOverride = query.theme && (themeIds as readonly string[]).includes(query.theme)
    ? query.theme
    : null;
  const themed: BusinessPocRecord = themeOverride ? { ...raw, themeId: themeOverride } : raw;
  const record = normalizeRecord(themed);

  const viewport =
    query.viewport === "mobile" || query.viewport === "tablet" ? query.viewport : "desktop";
  const overlay = query.overlay === "source";

  const report = listUnresolved(record);

  return (
    <div className="preview-shell">
      <PreviewToolbar
        slug={slug}
        activeTheme={record.themeId}
        themes={themeIds.map((id) => ({ id, name: themeMeta[id].name }))}
        viewport={viewport}
        overlay={overlay}
        report={report}
        warnings={record.warnings}
      />
      <div className={`preview-frame preview-frame--${viewport} pt-[52px]`}>
        <div className={overlay ? "show-provenance" : undefined}>
          {record.status === "expired" ? (
            <ExpiredState conceptLabel={record.poc.conceptLabel} />
          ) : record.identity.businessStatus === "permanently_closed" ? (
            <PermanentlyClosedState
              businessName={record.identity.name}
              address={record.location?.formattedAddress ?? null}
            />
          ) : (
            <>
              <ClosureBanner record={record} />
              {await renderTheme(record)}
            </>
          )}
        </div>
      </div>
      <p className="pb-6 pt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-zinc-600">
        Internal preview · unindexed ·{" "}
        <Link href="/themes" className="underline underline-offset-4 hover:text-zinc-300">
          theme showroom
        </Link>
      </p>
    </div>
  );
}
