import type { Metadata } from "next";
import Link from "next/link";
import { themeMetaList } from "@/lib/poc/theme-meta";
import type { ThemeMeta } from "@/lib/poc/theme-meta";
import type { ThemePalette } from "@/lib/poc/types";
import { requireOperator } from "@/server/auth/authorize";

export const metadata: Metadata = {
  title: "Theme showroom · POC Gen",
  robots: { index: false, follow: false },
};

const DISPLAY_KIND: Record<ThemeMeta["id"], "serif" | "sans" | "mono"> = {
  "heritage-bistro": "serif",
  "neon-night": "sans",
  "minimal-japanese": "serif",
  "mediterranean-sun": "serif",
  "coffee-editorial": "serif",
  "american-diner": "serif",
  "luxury-fine-dining": "serif",
  "street-food-poster": "sans",
  "botanical-brunch": "serif",
  "modern-industrial": "sans",
  "deco-supper-club": "sans",
  "atelier-lookbook": "serif",
  "memphis-play": "sans",
};

/** Abstract live miniature drawn from the theme palette and layout family. */
function ThemeThumb({ meta }: { meta: ThemeMeta }) {
  const p = meta.defaultPalette;
  const bar = (color: string, className = "") => (
    <div className={`h-1.5 rounded-full ${className}`} style={{ background: color }} />
  );
  return (
    <div
      aria-hidden="true"
      className="relative flex h-40 w-full flex-col gap-2 overflow-hidden rounded-lg border border-zinc-800 p-3"
      style={{ background: p.background }}
    >
      {meta.thumbFamily === "split-classic" && (
        <>
          <div className="mx-auto w-1/2">{bar(p.primary)}</div>
          <div className="flex flex-1 gap-2">
            <div className="w-1/2 border-2 p-1" style={{ borderColor: p.accent }}>
              <div className="h-full w-full" style={{ background: p.secondary, opacity: 0.35 }} />
            </div>
            <div className="flex w-1/2 flex-col justify-center gap-1.5">
              {bar(p.text, "w-4/5")}
              {bar(p.text, "w-3/5")}
              {bar(p.text, "w-2/3")}
              <div className="mt-1 h-3 w-10" style={{ background: p.primary }} />
            </div>
          </div>
        </>
      )}
      {meta.thumbFamily === "asymmetric-dark" && (
        <>
          <div className="flex justify-between">
            {bar(p.primary, "w-6")}
            {bar(p.secondary, "w-6")}
          </div>
          <div className="relative flex-1">
            <div className="absolute right-0 top-0 h-full w-[45%]" style={{ background: p.primary, opacity: 0.3, clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }} />
            <div className="absolute left-0 top-2 h-6 w-[70%]" style={{ background: p.text, opacity: 0.85 }} />
            <div className="absolute left-0 top-10 h-3 w-[55%]" style={{ background: p.accent }} />
            <div className="absolute bottom-2 left-0 h-3 w-14 border" style={{ borderColor: p.accent }} />
          </div>
        </>
      )}
      {meta.thumbFamily === "ledger-minimal" && (
        <>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3" style={{ background: p.text }} />
            {bar(p.border, "flex-1")}
          </div>
          <div className="flex-1 border-t pt-2" style={{ borderColor: p.border }}>
            <div className="mb-3 h-10 w-10 rounded-full border-[5px]" style={{ borderColor: p.accent }} />
            {bar(p.text, "w-3/4")}
            {bar(p.border, "w-full")}
            {bar(p.border, "w-full")}
          </div>
        </>
      )}
      {meta.thumbFamily === "arch-coastal" && (
        <>
          <div className="flex flex-1 items-end gap-2">
            <div className="h-[80%] w-1/3 rounded-t-full" style={{ background: p.primary }} />
            <div className="flex flex-1 flex-col gap-1.5 pb-1">
              {bar(p.secondary, "w-4/5")}
              {bar(p.text, "w-3/5")}
              <div className="mt-1 h-4 w-8 rounded-full" style={{ background: p.accent }} />
            </div>
            <div className="h-[50%] w-1/4 rounded-t-full" style={{ background: p.secondary, opacity: 0.5 }} />
          </div>
        </>
      )}
      {meta.thumbFamily === "magazine-cover" && (
        <>
          {bar(p.text, "w-1/3 border-0")}
          <div className="h-4 w-[80%]" style={{ background: p.text }} />
          <div className="h-2.5 w-[60%]" style={{ background: p.text }} />
          <div className="mt-1 flex-1" style={{ background: p.primary }} />
          <div className="h-2 w-full" style={{ background: p.secondary }} />
        </>
      )}
      {meta.thumbFamily === "signboard-retro" && (
        <>
          <div className="h-4 w-full" style={{ background: p.primary }} />
          <div className="h-1.5 w-full" style={{ background: `repeating-linear-gradient(90deg, ${p.background} 0 8px, ${p.primary} 8px 16px)` }} />
          <div className="flex flex-1 items-center justify-center">
            <div className="flex h-14 w-2/3 items-center justify-center border-2" style={{ borderColor: p.secondary }}>
              <div className="h-4 w-4 rounded-full border-2" style={{ borderColor: p.accent }} />
            </div>
          </div>
          <div className="h-4 w-full" style={{ background: p.secondary }} />
        </>
      )}
      {meta.thumbFamily === "cinematic-luxury" && (
        <div className="flex flex-1 items-center justify-center" style={{ background: p.background }}>
          <div className="flex flex-col items-center gap-2 border p-4" style={{ borderColor: p.primary }}>
            <div className="h-2 w-12" style={{ background: p.text, opacity: 0.9 }} />
            <div className="h-1 w-8" style={{ background: p.primary }} />
          </div>
        </div>
      )}
      {meta.thumbFamily === "poster-collage" && (
        <>
          <div className="flex flex-1 gap-1.5">
            <div className="w-[55%] -rotate-1" style={{ background: p.primary }} />
            <div className="flex flex-1 rotate-1 flex-col gap-1.5">
              <div className="flex-1" style={{ background: p.secondary }} />
              <div className="h-5 rounded-full" style={{ background: p.accent }} />
            </div>
          </div>
          <div className="h-2 w-2/3" style={{ background: p.text }} />
        </>
      )}
      {meta.thumbFamily === "soft-botanical" && (
        <>
          <div className="flex flex-1 gap-2">
            <div className="h-[85%] w-1/3 self-end rounded-t-full" style={{ background: p.primary, opacity: 0.75 }} />
            <div className="h-[60%] w-1/4 self-end rounded-t-full" style={{ background: p.secondary, opacity: 0.4 }} />
            <div className="flex flex-1 flex-col justify-center gap-1.5">
              {bar(p.text, "w-4/5")}
              {bar(p.text, "w-3/5")}
              <div className="mt-1 h-3 w-10 rounded-full" style={{ background: p.secondary }} />
            </div>
          </div>
        </>
      )}
      {meta.thumbFamily === "grid-industrial" && (
        <div className="flex flex-1 gap-1.5">
          <div className="grid flex-1 grid-cols-2 gap-1.5">
            <div className="col-span-1 row-span-2 border" style={{ borderColor: p.text, background: p.text }} />
            <div className="border" style={{ borderColor: p.border }} />
            <div className="flex items-center justify-center border" style={{ borderColor: p.border }}>
              <div className="h-2.5 w-2.5" style={{ background: p.accent }} />
            </div>
          </div>
        </div>
      )}
      {meta.thumbFamily === "deco-ornament" && (
        <>
          <div className="flex justify-center gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="w-[3px]" style={{ height: i === 0 || i === 5 ? 10 : 16, background: p.primary }} />
            ))}
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-2">
            <div className="h-2.5 w-2.5 rotate-45 border" style={{ borderColor: p.primary }} />
            <div className="w-[70%]" style={{ height: 2, background: p.primary }} />
            <div className="flex-1 border p-1.5" style={{ borderColor: p.primary }}>
              <div className="h-full w-full" style={{ background: p.secondary, opacity: 0.4 }} />
            </div>
            <div className="w-[70%]" style={{ height: 2, background: p.primary }} />
          </div>
        </>
      )}
      {meta.thumbFamily === "fashion-spread" && (
        <>
          <div className="flex items-baseline gap-2">
            {bar(p.secondary, "w-10")}
            {bar(p.border, "flex-1")}
          </div>
          <div className="flex flex-1 gap-2">
            <div className="flex w-1/2 flex-col justify-center gap-2">
              <div className="h-5 w-full" style={{ background: p.text }} />
              <div className="h-3.5 w-3/4" style={{ background: p.text }} />
              {bar(p.border, "w-2/3")}
              {bar(p.border, "w-1/2")}
            </div>
            <div className="w-1/2" style={{ background: p.text, opacity: 0.92 }} />
          </div>
        </>
      )}
      {meta.thumbFamily === "memphis-play" && (
        <div className="relative flex flex-1 items-center justify-center">
          <div className="absolute left-2 top-2 h-6 w-6 rounded-full border-[4px]" style={{ borderColor: p.secondary }} />
          <div
            className="h-[65%] w-[55%] border-2"
            style={{ borderColor: p.text, background: p.accent, borderRadius: "44% 56% 52% 48% / 54% 46% 56% 44%" }}
          />
          <svg viewBox="0 0 90 26" width="60" height="18" className="absolute bottom-3 right-3">
            <path d="M2 22 L16 6 L30 22 L44 6 L58 22 L72 6 L86 22" fill="none" stroke={p.primary} strokeWidth="6" strokeLinecap="round" />
          </svg>
          <div className="absolute right-4 top-4 h-3 w-3 rounded-full" style={{ background: p.primary }} />
        </div>
      )}
    </div>
  );
}

function Swatches({ palette }: { palette: ThemePalette }) {
  const dots = [
    palette.background,
    palette.primary,
    palette.secondary,
    palette.accent,
    palette.text,
  ];
  return (
    <ul className="flex items-center gap-1.5" aria-label="Theme palette">
      {dots.map((color) => (
        <li
          key={color}
          className="h-5 w-5 rounded-full border border-zinc-700"
          style={{ background: color }}
          title={color}
        />
      ))}
    </ul>
  );
}

export default async function ThemesPage() {
  await requireOperator("/themes");
  return (
    <main className="min-h-[100dvh] bg-[#101013] px-6 py-14 text-zinc-200">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12">
          <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
            POC Gen · internal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
            Thirteen themes, one record schema.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400">
            Each theme is a different composition, not a color swap: layout
            architecture, section order, type pairing, CTA shape, and motion all
            change. Themes eleven through thirteen add a Motion-powered
            animation layer (parallax, springs, drawn lines). Open a theme to
            inspect it against complete, partial, and minimal fixtures.
          </p>
        </header>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {themeMetaList.map((meta) => (
            <li
              key={meta.id}
              className="group rounded-xl border border-zinc-800 bg-zinc-950/60 p-5 transition-colors hover:border-zinc-600"
            >
              <ThemeThumb meta={meta} />
              <div className="mt-5 flex items-start justify-between gap-4">
                <div className="flex items-baseline gap-3">
                  <span
                    aria-hidden="true"
                    className={`text-3xl leading-none ${
                      DISPLAY_KIND[meta.id] === "serif"
                        ? "font-serif text-white"
                        : "text-xl font-bold text-white"
                    }`}
                  >
                    Aa
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{meta.name}</h2>
                    <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-zinc-500">
                      {meta.typePairing.display} · {meta.typePairing.body}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] ${
                    meta.motion === "energetic"
                      ? "bg-orange-500/15 text-orange-300"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {meta.motion} motion
                </span>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">{meta.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <Swatches palette={meta.defaultPalette} />
                <Link
                  href={`/themes/${meta.id}`}
                  className="rounded-md border border-zinc-700 px-3.5 py-1.5 text-[12.5px] text-zinc-300 transition-colors group-hover:border-zinc-500 group-hover:text-white"
                >
                  Open demo →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
