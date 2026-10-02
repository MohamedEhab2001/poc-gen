"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ThemeId } from "@/lib/poc/schema";
import type { PlaceholderReport } from "@/lib/poc/placeholders";
import { buildPreviewQuery, parsePreviewQuery } from "@/lib/poc/preview-query";
import type { PreviewQueryState, PreviewViewport } from "@/lib/poc/preview-query";

type Viewport = PreviewViewport;

const VIEWPORTS: Array<{ id: Viewport; label: string }> = [
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
  { id: "mobile", label: "Mobile" },
];

/**
 * Internal-only preview chrome. Never rendered on /demo/[slug]. All state
 * lives in the URL (searchParams) so previews are shareable links, and each
 * control change merges into the CURRENT query so no setting (for example a
 * theme override) is lost when another control changes.
 */
export function PreviewToolbar({
  slug,
  activeTheme,
  themes,
  viewport,
  overlay,
  report,
  warnings,
}: {
  slug: string;
  activeTheme: ThemeId;
  themes: Array<{ id: ThemeId; name: string }>;
  viewport: Viewport;
  overlay: boolean;
  report: PlaceholderReport[];
  warnings: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(change: Partial<PreviewQueryState>) {
    const current = parsePreviewQuery(searchParams);
    const query = buildPreviewQuery(current, change);
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 text-zinc-200 backdrop-blur">
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          POC Preview · <span className="text-zinc-300">{slug}</span>
        </span>

        <label className="flex items-center gap-2 text-xs text-zinc-400">
          Theme
          <select
            value={activeTheme}
            onChange={(event) => navigate({ theme: event.target.value })}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
          >
            {themes.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1" role="group" aria-label="Viewport">
          {VIEWPORTS.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => navigate({ viewport: view.id })}
              aria-pressed={viewport === view.id}
              className={`rounded px-2.5 py-1 text-xs transition-colors ${
                viewport === view.id
                  ? "bg-zinc-200 font-semibold text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate({ overlay: !overlay })}
          aria-pressed={overlay}
          className={`rounded px-2.5 py-1 text-xs transition-colors ${
            overlay
              ? "bg-orange-500 font-semibold text-white"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          {overlay ? "Sources on" : "Sources off"}
        </button>

        <Link
          href={`/demo/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Open clean demo ↗
        </Link>

        <button
          type="button"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="rounded px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
        >
          Sign out
        </button>

        <details className="ml-auto text-xs text-zinc-400">
          <summary className="cursor-pointer select-none py-1 hover:text-zinc-100">
            Data quality ({report.length} notes
            {warnings.length > 0 ? `, ${warnings.length} warnings` : ""})
          </summary>
          <div className="absolute right-2 top-full mt-2 w-[26rem] max-w-[calc(100vw-1rem)] rounded-lg border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
            {report.length === 0 ? (
              <p className="text-zinc-500">No fallbacks or placeholders in this record.</p>
            ) : (
              <ul className="space-y-1.5">
                {report.map((item, index) => (
                  <li key={`${item.field}-${index}`} className="flex gap-2">
                    <span className="w-8 shrink-0 font-mono text-[10px] uppercase text-orange-400">
                      {item.outcome}
                    </span>
                    <span>
                      <span className="font-mono text-[11px] text-zinc-300">{item.field}</span>
                      {item.note ? <span className="text-zinc-500"> · {item.note}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {warnings.length > 0 ? (
              <div className="mt-3 border-t border-zinc-800 pt-3">
                <p className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  Warnings
                </p>
                <ul className="list-disc space-y-1 pl-4 text-zinc-400">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </details>
      </div>
    </header>
  );
}
