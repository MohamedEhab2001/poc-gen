import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { normalizeRecord } from "@/lib/poc/normalize";
import { renderTheme } from "@/lib/poc/render";
import { getPocRepository } from "@/lib/poc/repository";
import { themeIds } from "@/lib/poc/schema";
import type { BusinessPocRecord, ThemeId } from "@/lib/poc/schema";
import { themeMeta } from "@/lib/poc/theme-meta";
import { requireOperator } from "@/server/auth/authorize";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ themeId: string }>;
  searchParams: Promise<{ data?: string }>;
};

const EDGE_SLUGS = new Set([
  "fjord-coffee",
  "corner-pho",
  "dockside-provisions",
  "old-mill-cantina",
  "sunset-ramen",
]);

const DATA_OPTIONS = [
  { id: "complete", label: "Complete data" },
  { id: "partial", label: "Partial data" },
  { id: "minimal", label: "Minimal data" },
] as const;

type DataMode = (typeof DATA_OPTIONS)[number]["id"];

/**
 * Theme detail: renders one canonical sample business in the selected theme,
 * with a fixture-quality switcher so fallback behavior can be inspected
 * against complete, partial, and minimal records.
 */
export default async function ThemeDetailPage({ params, searchParams }: PageProps) {
  const { themeId } = await params;
  const { data } = await searchParams;

  await requireOperator(`/themes/${themeId}`);
  if (!(themeIds as readonly string[]).includes(themeId)) notFound();
  const id = themeId as ThemeId;
  const mode: DataMode = data === "partial" || data === "minimal" ? data : "complete";

  const all = await getPocRepository().listAll();
  const canonical = all.find((record) => record.themeId === id && !EDGE_SLUGS.has(record.slug));
  const partial = all.find((record) => record.slug === "fjord-coffee");
  const minimal = all.find((record) => record.slug === "corner-pho");

  const base =
    mode === "complete" ? canonical : mode === "partial" ? partial : minimal;
  if (!base) notFound();

  const themed: BusinessPocRecord = base.themeId === id ? base : { ...base, themeId: id };
  const record = normalizeRecord(themed);

  return (
    <div className="bg-[#101013]">
      <div className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
          <Link
            href="/themes"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400 hover:text-zinc-100"
          >
            ← All themes
          </Link>
          <span className="text-sm font-semibold text-white">{themeMeta[id].name}</span>
          <div className="flex items-center gap-1" role="group" aria-label="Fixture quality">
            {DATA_OPTIONS.map((option) => (
              <Link
                key={option.id}
                href={`/themes/${id}${option.id === "complete" ? "" : `?data=${option.id}`}`}
                aria-current={mode === option.id ? "true" : undefined}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  mode === option.id
                    ? "bg-zinc-200 font-semibold text-zinc-900"
                    : "text-zinc-400 hover:text-zinc-100"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
          {canonical ? (
            <Link
              href={`/preview/${canonical.slug}?theme=${id}`}
              className="ml-auto rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
            >
              Open in preview tool ↗
            </Link>
          ) : null}
        </div>
        {mode !== "complete" ? (
          <p className="px-4 pb-2 text-[11px] text-zinc-500">
            Showing a {mode}-data fixture re-themed to {themeMeta[id].name} so fallback
            behavior is visible in this composition.
          </p>
        ) : null}
      </div>
      {await renderTheme(record)}
    </div>
  );
}
