import { Phone, Star } from "lucide-react";
import type { ThemeProps } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";
import { BusinessEssentials } from "@/components/poc/BusinessEssentials";
import { AttributionLine } from "@/components/poc/attribution/AttributionLine";
import { ConceptNotice } from "@/components/poc/ConceptNotice";
import { HoursList } from "@/components/poc/HoursList";
import { MobileActionBar } from "@/components/poc/MobileActionBar";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { MapSection } from "@/components/poc/map/MapSection";
import { display, body } from "./fonts";

/**
 * Modern Industrial: brewery or urban coffee lab. Visible structural grid,
 * monospace micro-labels used only as data labels, bold grotesk headlines,
 * a hero with technical annotations, spec-sheet menu with index numbers,
 * icon-plus-data service rows, and a coordinate-panel map frame. Sharp
 * corners, safety orange accents, crisp interactions.
 */
export default function ModernIndustrialTheme({ record }: ThemeProps) {
  const p = record.palette;
  const style = {
    "--bg": p.background,
    "--surface": p.surface,
    "--text": p.text,
    "--muted": p.muted,
    "--primary": p.primary,
    "--secondary": p.secondary,
    "--accent": p.accent,
    "--border": p.border,
    "--on-primary": p.onPrimary,
    "--on-secondary": p.onSecondary,
    "--on-accent": p.onAccent,
    "--radius": "0px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const densityPad = record.density === "compact" ? "py-12 md:py-16" : "py-16 md:py-24";
  const coords =
    record.location?.latitude != null && record.location?.longitude != null
      ? `${record.location.latitude.toFixed(4)}, ${record.location.longitude.toFixed(4)}`
      : null;

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      {/* Header inside the grid */}
      <header className="border-b border-[var(--text)]">
        <div className="poc-container grid h-[72px] grid-cols-[auto_1fr_auto] items-center gap-6">
          <a href="#hero" className="font-display text-xl font-bold tracking-tight">
            {record.wordmark.text.toUpperCase()}
          </a>
          <nav aria-label="Primary" className="hidden justify-center gap-8 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)] md:flex">
            {record.menu ? <a href="#menu" className="hover:text-[var(--accent)]">Menu</a> : null}
            {record.about ? <a href="#spec" className="hover:text-[var(--accent)]">Spec</a> : null}
            <a href="#location" className="hover:text-[var(--accent)]">Location</a>
          </nav>
          {record.hours ? (
            <p className="border border-[var(--text)] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em]">
              <span className={record.hours.openNow ? "text-[var(--accent)]" : "text-[var(--muted)]"}>
                {record.hours.openNow ? "● OPEN" : "○ CLOSED"}
              </span>
            </p>
          ) : null}
        </div>
      </header>

      {/* Hero: structural lines + technical annotations */}
      <section id="hero" aria-labelledby="hero-heading" className="border-b border-[var(--text)]">
        <div className="poc-container grid lg:grid-cols-12">
          <div className="flex flex-col justify-center border-b border-[var(--border)] py-14 lg:col-span-7 lg:border-b-0 lg:border-r lg:py-20 lg:pr-14">
            {record.hero.eyebrow ? (
              <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {record.hero.eyebrow}
              </p>
            ) : null}
            <h1 id="hero-heading" className="max-w-[16ch] font-display text-4xl font-bold leading-[1.04] tracking-tight md:text-[3.6rem] fx-rise">
              {record.hero.headline}
            </h1>
            {record.hero.subheadline ? (
              <p className="mt-6 max-w-[52ch] text-[13.5px] leading-relaxed text-[var(--muted)]">
                {record.hero.subheadline}
              </p>
            ) : null}
            <div className="mt-9 flex flex-wrap items-center gap-4">
              {record.cta.primary ? (
                <ActionLink
                  cta={record.cta.primary}
                  className="bg-[var(--accent)] px-7 py-3.5 font-display text-[15px] font-bold uppercase tracking-[0.04em] text-[var(--on-accent)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
                />
              ) : null}
              {record.cta.secondary[0] ? (
                <ActionLink
                  cta={record.cta.secondary[0]}
                  className="border border-[var(--text)] px-6 py-3 font-mono text-[12px] uppercase tracking-[0.12em] text-[var(--text)] transition-colors hover:bg-[var(--text)] hover:text-[var(--bg)]"
                />
              ) : null}
            </div>
            {record.reputation ? (
              <p className="mt-8 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[var(--muted)]">
                <Star size={13} strokeWidth={1.5} className="text-[var(--accent)]" aria-hidden="true" />
                {record.reputation.rating.toFixed(1)} / {record.reputation.reviewCount.toLocaleString("en-US")} reviews
              </p>
            ) : null}
          </div>
          <div className="relative min-h-[320px] lg:col-span-5">
            {record.hero.image ? (
              <SmartImage
                image={record.hero.image}
                priority
                fill
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="h-full w-full object-cover"
              />
            ) : null}
            {/* technical annotation frame */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-4 border border-white/50 mix-blend-difference">
              <span className="absolute -left-px -top-px h-3 w-3 border-l-2 border-t-2 border-white" />
              <span className="absolute -right-px -top-px h-3 w-3 border-r-2 border-t-2 border-white" />
              <span className="absolute -bottom-px -left-px h-3 w-3 border-b-2 border-l-2 border-white" />
              <span className="absolute -bottom-px -right-px h-3 w-3 border-b-2 border-r-2 border-white" />
            </div>
            {coords ? (
              <p className="absolute bottom-5 left-5 bg-[var(--text)] px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--accent)]">
                LAT/LON {coords}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Services: icon-plus-data rows */}
      {record.services.length + record.amenities.length > 0 ? (
        <section aria-label="Services and amenities" className={`border-b border-[var(--text)] ${densityPad}`}>
          <div className="poc-container grid gap-px sm:grid-cols-2 lg:grid-cols-4">
            {[...record.services, ...record.amenities].slice(0, 8).map((item, index) => (
              <div key={item.key + item.label} className="flex items-baseline gap-3 border-t border-[var(--border)] py-4 sm:border-t-0">
                <span className="font-mono text-[10.5px] text-[var(--accent)]">{String(index + 1).padStart(2, "0")}</span>
                <span className="text-[13.5px] font-medium text-[var(--text)]">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className={`border-b border-[var(--text)] ${densityPad}`}>
          <div className="poc-container">
            <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4 border-b-2 border-[var(--text)] pb-5">
              <h2 id="menu-heading" className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">
                Menu / Spec
              </h2>
              {record.menu.notice ? (
                <p className="max-w-sm font-mono text-[11px] uppercase leading-relaxed tracking-[0.08em] text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                  {record.menu.notice}
                </p>
              ) : null}
            </div>
            <div className="grid gap-x-12 gap-y-12 lg:grid-cols-2">
              {record.menu.sections.map((section) => (
                <div key={section.id}>
                  <div className="mb-5 flex items-center gap-4">
                    <span className="h-2.5 w-2.5 bg-[var(--accent)]" aria-hidden="true" />
                    <h3 className="font-display text-xl font-bold uppercase tracking-tight">{section.name}</h3>
                    {section.description ? (
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[var(--muted)]">
                        {section.description}
                      </span>
                    ) : null}
                  </div>
                  <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                    {section.items.map((item, index) => (
                      <li key={item.id} className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-x-4 py-3.5">
                        <span className="font-mono text-[10.5px] text-[var(--muted)]">{String(index + 1).padStart(2, "0")}</span>
                        <div>
                          <p className="text-[14.5px] font-medium">{item.name}</p>
                          {item.description ? (
                            <p className="mt-0.5 max-w-[46ch] text-[12.5px] leading-snug text-[var(--muted)]">{item.description}</p>
                          ) : null}
                          {item.tags.length > 0 ? (
                            <p className="mt-1.5 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--accent)]">
                              {item.tags.map((tag) => (
                                <span key={tag} className="border border-[var(--accent)]/50 px-1.5 py-0.5">{tag}</span>
                              ))}
                            </p>
                          ) : null}
                        </div>
                        {item.price ? (
                          <p className="font-mono text-[14px] tabular-nums">{item.price}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {record.about ? (
        <section id="spec" aria-labelledby="spec-heading" className={`border-b border-[var(--text)] bg-[var(--text)] text-[var(--bg)] ${densityPad}`}>
          <div className="poc-container grid gap-10 lg:grid-cols-[240px_1fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">Specification</p>
              <h2 id="spec-heading" className="mt-3 font-display text-2xl font-bold uppercase leading-tight tracking-tight">
                {record.about.title}
              </h2>
            </div>
            <p className="max-w-[68ch] text-[14px] leading-[1.9] text-[#c9cbce]">{record.about.body}</p>
          </div>
        </section>
      ) : null}

      {record.gallery ? (
        <section aria-labelledby="gallery-heading" className={`border-b border-[var(--text)] ${densityPad}`}>
          <div className="poc-container">
            <h2 id="gallery-heading" className="mb-8 font-display text-3xl font-bold uppercase tracking-tight">
              {record.gallery.title ?? "The lab"}
            </h2>
            <ul className="grid grid-cols-2 gap-px border border-[var(--border)] bg-[var(--border)] lg:grid-cols-4">
              {record.gallery.images.slice(0, 4).map((image) => (
                <li key={image.url} className="bg-[var(--bg)]">
                  <SmartImage
                    image={image}
                    width={600}
                    height={500}
                    sizes="(min-width: 1024px) 24vw, 48vw"
                    className="h-auto w-full object-cover transition-opacity duration-300 hover:opacity-90"
                    attributionClassName="p-2 text-[10px] uppercase tracking-wide text-[var(--muted)]"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className={`border-b border-[var(--text)] ${densityPad}`}>
          <div className="poc-container grid gap-px md:grid-cols-3">
            {record.reputation.reviews.slice(0, 3).map((review) => (
              <figure key={review.id} className="border-l-2 border-[var(--accent)] pl-5">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {review.rating.toFixed(1)} / 5.0
                </p>
                <blockquote className="mt-3 text-[14px] leading-relaxed text-[var(--text)]">
                  &ldquo;{review.text}&rdquo;
                </blockquote>
                <figcaption className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">
                  {review.authorName}
                </figcaption>
                {review.attribution ? (
                  <AttributionLine attribution={review.attribution} className="mt-1 font-mono text-[10px] uppercase text-[var(--muted)]" />
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {/* Location: plan / coordinate panel */}
      <section id="location" aria-labelledby="location-heading" className={densityPad}>
        <div className="poc-container grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="location-heading" className="font-display text-3xl font-bold uppercase tracking-tight">
              Location
            </h2>
            <dl className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)] text-[13px]">
              {record.hours ? (
                <div className="grid grid-cols-[92px_1fr] gap-4 py-3.5">
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">Hours</dt>
                  <dd>
                    <HoursList hours={record.hours} className="space-y-1 font-mono text-[12px]" />
                  </dd>
                </div>
              ) : null}
              {record.location?.formattedAddress || record.location?.shortAddress ? (
                <div className="grid grid-cols-[92px_1fr] gap-4 py-3.5">
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">Address</dt>
                  <dd className="text-[13px]">{record.location.formattedAddress ?? record.location.shortAddress}</dd>
                </div>
              ) : null}
              {coords ? (
                <div className="grid grid-cols-[92px_1fr] gap-4 py-3.5">
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">Coords</dt>
                  <dd className="font-mono text-[12px] text-[var(--accent)]">{coords}</dd>
                </div>
              ) : null}
              {record.contact.phone ? (
                <div className="grid grid-cols-[92px_1fr] gap-4 py-3.5">
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">Phone</dt>
                  <dd className="flex items-center gap-2">
                    <Phone size={13} strokeWidth={1.5} aria-hidden="true" />
                    <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--accent)]">
                      {record.contact.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {record.contact.socials.length > 0 ? (
                <div className="grid grid-cols-[92px_1fr] gap-4 py-3.5">
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">Social</dt>
                  <dd className="flex gap-4">
                    {record.contact.socials.map((social) => (
                      <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-[var(--accent)] hover:underline">
                        {social.label ?? social.platform}
                      </a>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          {record.location ? (
            <MapSection
              location={record.location}
              businessName={record.identity.name}
              directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
              embedClassName="h-[360px] w-full border border-[var(--text)]"
              cardClassName="border border-[var(--text)] p-6"
              addressClassName="font-mono text-[12px] uppercase tracking-[0.08em]"
              buttonClassName="mt-3 inline-block border border-[var(--accent)] bg-[var(--accent)] px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--on-accent)]"
              iframeTitle={`Site plan map for ${record.identity.name}`}
            />
          ) : null}
        </div>
      </section>

      <BusinessEssentials record={record} />

      <footer className="border-t-2 border-[var(--text)]">
        <div className="poc-container flex flex-col justify-between gap-6 py-10 md:flex-row md:items-center">
          <div>
            <p className="font-display text-xl font-bold uppercase tracking-tight">{record.wordmark.text.toUpperCase()}</p>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">
              {record.identity.primaryCategory} {coords ? `· ${coords}` : ""}
            </p>
          </div>
          <ConceptNotice
            record={record}
            labelClassName="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]"
            bodyClassName="mt-2 max-w-md font-mono text-[11px] leading-relaxed text-[var(--muted)]"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
