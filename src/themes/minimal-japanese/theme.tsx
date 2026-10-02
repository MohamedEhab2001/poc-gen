import { Phone, Star } from "lucide-react";
import type { ThemeProps } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";
import { AttributionLine } from "@/components/poc/attribution/AttributionLine";
import { ConceptNotice } from "@/components/poc/ConceptNotice";
import { HoursList } from "@/components/poc/HoursList";
import { MobileActionBar } from "@/components/poc/MobileActionBar";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { MapSection } from "@/components/poc/map/MapSection";
import { display, body } from "./fonts";

/**
 * Minimal Japanese: quiet, precise premium minimalism. Hairline borders,
 * disciplined grid, one carefully cropped hero image, a two-column
 * typographic menu, and hours/location rendered as an information ledger.
 * Almost no shadow, no radius, very subtle motion.
 */
export default function MinimalJapaneseTheme({ record }: ThemeProps) {
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
    "--on-primary": "#faf9f5",
    "--radius": "0px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      <header className="border-b border-[var(--border)]">
        <div className="poc-container flex h-16 items-center justify-between">
          <a href="#hero" className="font-display text-lg font-semibold tracking-[0.28em] text-[var(--text)]">
            {record.wordmark.text.toUpperCase()}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-8 text-[13px] tracking-[0.08em] text-[var(--muted)] md:flex">
            {record.menu ? <a href="#menu" className="hover:text-[var(--accent)]">Menu</a> : null}
            {record.gallery ? <a href="#space" className="hover:text-[var(--accent)]">Space</a> : null}
            <a href="#visit" className="hover:text-[var(--accent)]">Visit</a>
          </nav>
          {record.hours ? (
            <p className="text-[12px] tracking-[0.08em] text-[var(--muted)]">
              {record.hours.openNow === true ? "Open now" : record.hours.statusLabel ?? "Hours vary"}
            </p>
          ) : null}
        </div>
      </header>

      {/* Hero: one image, restrained copy, vertical accent */}
      <section id="hero" aria-labelledby="hero-heading" className="relative">
        {record.hero.image ? (
          <div className="relative h-[54vh] min-h-[380px] w-full lg:h-[68vh]">
            <SmartImage
              image={record.hero.image}
              priority
              fill
              sizes="100vw"
              className="h-full w-full object-cover"
            />
          </div>
        ) : null}
        <div className="poc-container relative -mt-20 lg:-mt-28">
          <div className="relative max-w-2xl bg-[var(--bg)] px-2 py-10 lg:pl-16 lg:pr-10">
            <p
              aria-hidden="true"
              className="absolute -left-10 top-8 hidden text-[11px] uppercase tracking-[0.4em] text-[var(--accent)] lg:block"
              style={{ writingMode: "vertical-rl" }}
            >
              {record.identity.primaryCategory}
            </p>
            {record.hero.eyebrow ? (
              <p className="mb-4 text-[11.5px] uppercase tracking-[0.32em] text-[var(--muted)]">
                {record.hero.eyebrow}
              </p>
            ) : null}
            <h1 id="hero-heading" className="font-display text-4xl font-semibold leading-[1.15] text-[var(--text)] md:text-5xl">
              {record.hero.headline}
            </h1>
            {record.hero.subheadline ? (
              <p className="mt-5 max-w-[48ch] text-[14.5px] leading-[1.9] text-[var(--muted)]">
                {record.hero.subheadline}
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              {record.cta.primary ? (
                <ActionLink
                  cta={record.cta.primary}
                  className="border-b border-[var(--accent)] pb-1 text-[13px] font-medium tracking-[0.1em] text-[var(--text)] transition-colors hover:text-[var(--accent)]"
                />
              ) : null}
              {record.cta.secondary[0] ? (
                <ActionLink
                  cta={record.cta.secondary[0]}
                  className="text-[13px] tracking-[0.1em] text-[var(--muted)] underline-offset-4 hover:text-[var(--text)] hover:underline"
                />
              ) : null}
              {record.reputation ? (
                <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                  <Star size={13} strokeWidth={1.5} className="text-[var(--accent)]" aria-hidden="true" />
                  {record.reputation.rating.toFixed(1)} ({record.reputation.reviewCount})
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {record.about ? (
        <section aria-labelledby="about-heading" className="poc-container border-t border-[var(--border)] pt-16 md:mt-24 fx-reveal">
          <div className="grid gap-10 md:grid-cols-[200px_1fr]">
            <h2 id="about-heading" className="font-display text-xl font-semibold text-[var(--text)]">
              {record.about.title}
            </h2>
            <p className="max-w-[62ch] text-[14.5px] leading-[2] text-[var(--muted)]">{record.about.body}</p>
          </div>
        </section>
      ) : null}

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="poc-container py-20 fx-reveal md:py-28">
          <div className="mb-12 flex items-baseline justify-between border-b border-[var(--text)] pb-4">
            <h2 id="menu-heading" className="font-display text-2xl font-semibold tracking-[0.12em] text-[var(--text)]">
              MENU
            </h2>
            {record.offering.priceRange ? (
              <p className="text-[12px] tracking-[0.1em] text-[var(--muted)]">{record.offering.priceRange}</p>
            ) : null}
          </div>
          {record.menu.notice ? (
            <p className="mb-10 border-l-2 border-[var(--accent)] pl-4 text-[13px] leading-relaxed text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
              {record.menu.notice}
            </p>
          ) : null}
          <div className="grid gap-x-16 gap-y-14 md:grid-cols-2">
            {record.menu.sections.map((section) => (
              <div key={section.id}>
                <h3 className="mb-1 font-display text-lg font-medium text-[var(--text)]">{section.name}</h3>
                {section.description ? (
                  <p className="mb-6 text-[12px] tracking-[0.06em] text-[var(--muted)]">{section.description}</p>
                ) : (
                  <div aria-hidden="true" className="mb-6 h-px bg-[var(--border)]" />
                )}
                <dl className="space-y-5">
                  {section.items.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-6">
                      <dt className="text-[14.5px] font-medium text-[var(--text)]">
                        {item.name}
                        {item.tags.length > 0 ? (
                          <span className="ml-2 align-middle text-[10.5px] uppercase tracking-[0.08em] text-[var(--accent)]">
                            {item.tags.join(" · ")}
                          </span>
                        ) : null}
                        {item.description ? (
                          <span className="mt-1 block max-w-[42ch] text-[12.5px] font-normal leading-relaxed text-[var(--muted)]">
                            {item.description}
                          </span>
                        ) : null}
                      </dt>
                      <dd className="text-[14.5px] tabular-nums text-[var(--text)]">{item.price ?? ""}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {record.gallery ? (
        <section id="space" aria-labelledby="space-heading" className="poc-container pb-20 fx-reveal md:pb-28">
          <h2 id="space-heading" className="sr-only">
            {record.gallery.title ?? "The space"}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {record.gallery.images.slice(0, 3).map((image, index) => (
              <div key={image.url} className={index === 0 ? "md:col-span-2" : ""}>
                <SmartImage
                  image={image}
                  width={900}
                  height={index === 0 ? 620 : 760}
                  sizes="(min-width: 768px) 33vw, 100vw"
                  className="h-auto w-full object-cover"
                  attributionClassName="mt-2 text-[11px] tracking-[0.06em] text-[var(--muted)]"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="bg-[var(--surface)] px-0 py-20">
          <div className="poc-container">
            <h2 id="reviews-heading" className="mb-12 font-display text-2xl font-semibold tracking-[0.12em] text-[var(--text)]">
              GUEST BOOK
            </h2>
            <div className="grid gap-12 md:grid-cols-2">
              {record.reputation.reviews.slice(0, 2).map((review) => (
                <figure key={review.id}>
                  <blockquote className="font-display text-xl font-medium leading-[1.7] text-[var(--text)]">
                    {review.text}
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3 text-[12px] tracking-[0.1em] text-[var(--muted)]">
                    <span aria-hidden="true" className="h-px w-8 bg-[var(--accent)]" />
                    {review.authorName}
                  </figcaption>
                  {review.attribution ? (
                    <AttributionLine attribution={review.attribution} className="mt-1 text-[11px] text-[var(--muted)]" />
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Ledger: hours, location, contact */}
      <section id="visit" aria-labelledby="visit-heading" className="poc-container py-20 fx-reveal md:py-28">
        <h2 id="visit-heading" className="mb-12 font-display text-2xl font-semibold tracking-[0.12em] text-[var(--text)]">
          VISIT
        </h2>
        <div className="grid gap-14 lg:grid-cols-2">
          <dl className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
            {record.hours ? (
              <div className="grid grid-cols-[110px_1fr] gap-6 py-4">
                <dt className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Hours</dt>
                <dd className="text-[13.5px] leading-loose text-[var(--text)]">
                  <HoursList hours={record.hours} className="space-y-1" />
                </dd>
              </div>
            ) : null}
            {record.location?.formattedAddress || record.location?.shortAddress ? (
              <div className="grid grid-cols-[110px_1fr] gap-6 py-4">
                <dt className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Address</dt>
                <dd className="text-[13.5px] leading-relaxed text-[var(--text)]">
                  {record.location.formattedAddress ?? record.location.shortAddress}
                </dd>
              </div>
            ) : null}
            {record.contact.phone ? (
              <div className="grid grid-cols-[110px_1fr] gap-6 py-4">
                <dt className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Telephone</dt>
                <dd className="flex items-center gap-2 text-[13.5px] text-[var(--text)]">
                  <Phone size={13} strokeWidth={1.5} aria-hidden="true" />
                  <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--accent)]">
                    {record.contact.phone}
                  </a>
                </dd>
              </div>
            ) : null}
            {record.services.length + record.amenities.length > 0 ? (
              <div className="grid grid-cols-[110px_1fr] gap-6 py-4">
                <dt className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Services</dt>
                <dd className="text-[13.5px] leading-relaxed text-[var(--text)]">
                  {[...record.services, ...record.amenities].slice(0, 5).map((item) => item.label).join(" · ")}
                </dd>
              </div>
            ) : null}
            {record.contact.socials.length > 0 ? (
              <div className="grid grid-cols-[110px_1fr] gap-6 py-4">
                <dt className="text-[12px] uppercase tracking-[0.18em] text-[var(--muted)]">Social</dt>
                <dd className="flex gap-5 text-[13.5px] text-[var(--text)]">
                  {record.contact.socials.map((social) => (
                    <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:text-[var(--accent)] hover:underline">
                      {social.label ?? social.platform}
                    </a>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
          {record.location ? (
            <MapSection
              location={record.location}
              businessName={record.identity.name}
              directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
              embedClassName="h-[320px] w-full border border-[var(--border)]"
              cardClassName="border border-[var(--border)] p-8"
              addressClassName="sr-only"
              buttonClassName="inline-flex items-center gap-3 border border-[var(--text)] px-6 py-3 text-[12.5px] tracking-[0.14em] text-[var(--text)] transition-colors hover:bg-[var(--text)] hover:text-[var(--bg)]"
            />
          ) : null}
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="poc-container flex flex-col justify-between gap-6 py-10 md:flex-row md:items-end">
          <p className="font-display text-base font-semibold tracking-[0.28em] text-[var(--text)]">
            {record.wordmark.text.toUpperCase()}
          </p>
          <ConceptNotice
            record={record}
            labelClassName="text-[10.5px] uppercase tracking-[0.3em] text-[var(--muted)]"
            bodyClassName="mt-2 max-w-sm text-[11.5px] leading-relaxed text-[var(--muted)]"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
