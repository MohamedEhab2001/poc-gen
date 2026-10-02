import { ArrowRight, AtSign, Clock, Phone, Star } from "lucide-react";
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
 * Heritage Bistro: established neighborhood restaurant. Classic masthead,
 * framed split hero with an hours card, printed-menu typography with Roman
 * numerals, newspaper pull quotes, paper grain. Calm motion only.
 */
export default function HeritageBistroTheme({ record }: ThemeProps) {
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
    "--on-primary": "#fff8ee",
    "--radius": "4px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const nav = [
    record.menu ? { href: "#menu", label: "Menu" } : null,
    record.about ? { href: "#story", label: "Our story" } : null,
    record.gallery ? { href: "#gallery", label: "The room" } : null,
    { href: "#visit", label: "Visit" },
  ].filter((item): item is { href: string; label: string } => item !== null);

  const initials = record.identity.name
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("");

  return (
    <div
      id="main"
      style={style}
      className={`${display.variable} ${body.variable} theme-root`}
    >
      <div className="grain-overlay" aria-hidden="true" />

      <header className="border-b-[3px] border-double border-[var(--primary)]">
        <div className="poc-container flex h-[76px] items-center justify-between gap-6">
          <a href="#top" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--primary)] font-display text-lg font-semibold text-[var(--primary)]">
              {initials}
            </span>
            <span className="font-display text-2xl font-semibold leading-none text-[var(--text)]">
              {record.wordmark.text}
            </span>
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[13px] uppercase tracking-[0.14em] text-[var(--muted)] transition-colors hover:text-[var(--primary)]"
              >
                {item.label}
              </a>
            ))}
          </nav>
          {record.hours?.statusLabel ? (
            <p className="hidden items-center gap-2 text-[13px] text-[var(--muted)] lg:flex">
              <Clock size={15} strokeWidth={1.5} aria-hidden="true" />
              {record.hours.statusLabel}
            </p>
          ) : null}
        </div>
      </header>

      {/* Split hero: framed image + copy + hours card */}
      <section aria-labelledby="hero-heading" className="poc-container grid gap-10 py-14 md:grid-cols-2 md:items-center md:py-20">
        <div className="relative fx-rise">
          <div aria-hidden="true" className="absolute -left-3 -top-3 h-full w-full border border-[var(--accent)]" />
          {record.hero.image ? (
            <SmartImage
              image={record.hero.image}
              priority
              width={1200}
              height={1000}
              sizes="(min-width: 768px) 46vw, 100vw"
              className="relative h-auto w-full border-4 border-[var(--surface)] object-cover shadow-[0_18px_40px_-18px_rgba(42,33,24,0.45)]"
              attributionClassName="mt-2 text-right text-[11px] italic text-[var(--muted)]"
            />
          ) : null}
        </div>
        <div className="fx-rise">
          {record.hero.eyebrow ? (
            <p className="mb-4 text-[12px] uppercase tracking-[0.22em] text-[var(--accent)]">
              {record.hero.eyebrow}
            </p>
          ) : null}
          <h1
            id="hero-heading"
            className="font-display text-4xl font-semibold leading-[1.08] text-[var(--text)] md:text-[3.4rem]"
          >
            {record.hero.headline}
          </h1>
          {record.hero.subheadline ? (
            <p className="mt-5 max-w-[46ch] text-[15px] leading-relaxed text-[var(--muted)]">
              {record.hero.subheadline}
            </p>
          ) : null}
          {record.reputation ? (
            <p className="mt-5 flex items-center gap-2 text-sm text-[var(--muted)]">
              <Star size={15} strokeWidth={1.5} className="text-[var(--accent)]" aria-hidden="true" />
              <span>
                {record.reputation.rating.toFixed(1)} from {record.reputation.reviewCount.toLocaleString("en-US")} reviews
              </span>
            </p>
          ) : null}
          {record.cta.primary || record.cta.secondary[0] ? (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {record.cta.primary ? (
                <ActionLink
                  cta={record.cta.primary}
                  className="rounded-[var(--radius)] bg-[var(--primary)] px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--on-primary)] transition-opacity hover:opacity-90 active:translate-y-[1px]"
                />
              ) : null}
              {record.cta.secondary[0] ? (
                <ActionLink
                  cta={record.cta.secondary[0]}
                  className="rounded-[var(--radius)] border border-[var(--primary)] px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--on-primary)]"
                />
              ) : null}
            </div>
          ) : null}
          {record.hours ? (
            <div className="mt-9 border-t border-[var(--border)] pt-5">
              <HoursList
                hours={record.hours}
                labelClassName="text-sm text-[var(--muted)]"
                className="grid max-w-md grid-cols-1 gap-x-8 text-[13px] text-[var(--muted)] sm:grid-cols-2"
              />
            </div>
          ) : null}
        </div>
      </section>

      {record.about || record.services.length + record.amenities.length > 0 ? (
        <section id="story" aria-labelledby="story-heading" className="border-y border-[var(--border)] bg-[var(--surface)] fx-reveal">
          <div className="poc-container max-w-3xl py-16 text-center md:py-20">
            <p className="mb-3 text-[12px] uppercase tracking-[0.24em] text-[var(--accent)]">Our story</p>
            <h2 id="story-heading" className="font-display text-3xl font-semibold text-[var(--text)] md:text-4xl">
              {record.about?.title ?? `About ${record.identity.shortName}`}
            </h2>
            {record.about ? (
              <p className="mt-6 text-[15px] leading-[1.85] text-[var(--muted)]">{record.about.body}</p>
            ) : null}
            {record.services.length + record.amenities.length > 0 ? (
              <p className={`text-[13px] uppercase tracking-[0.12em] text-[var(--muted)] ${record.about ? "mt-7" : "mt-6"}`}>
                {[...record.services, ...record.amenities].slice(0, 6).map((item) => item.label).join("  ·  ")}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="poc-container py-16 fx-reveal md:py-24">
          <div className="mb-10 text-center">
            <h2 id="menu-heading" className="font-display text-4xl font-semibold text-[var(--text)]">
              The Menu
            </h2>
            <div aria-hidden="true" className="mx-auto mt-4 h-px w-24 bg-[var(--accent)]" />
            {record.menu.notice ? (
              <p className="mx-auto mt-4 max-w-md text-[13px] italic text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                {record.menu.notice}
              </p>
            ) : null}
          </div>
          <div className="grid gap-x-14 gap-y-12 md:grid-cols-2">
            {record.menu.sections.map((section, index) => (
              <div key={section.id}>
                <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-[var(--border)] pb-2">
                  <h3 className="font-display text-2xl font-semibold text-[var(--text)]">
                    <span className="mr-3 text-base text-[var(--accent)]">{roman(index + 1)}.</span>
                    {section.name}
                  </h3>
                  {record.offering.priceRange && index === 0 ? (
                    <span className="text-[12px] uppercase tracking-[0.14em] text-[var(--muted)]">
                      {record.offering.priceRange}
                    </span>
                  ) : null}
                </div>
                {section.description ? (
                  <p className="mb-4 font-display text-[15px] italic text-[var(--muted)]">{section.description}</p>
                ) : null}
                <ul className="space-y-4">
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <div className="flex items-baseline gap-3">
                        <span className="font-display text-[17px] font-semibold text-[var(--text)]">
                          {item.name}
                        </span>
                        <span aria-hidden="true" className="flex-1 border-b border-dotted border-[var(--border)]" />
                        {item.price ? (
                          <span className="font-display text-[17px] text-[var(--primary)]">{item.price}</span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="mt-1 max-w-[52ch] text-[13.5px] leading-relaxed text-[var(--muted)]">
                          {item.description}
                          {item.tags.length > 0 ? ` (${item.tags.join(", ")})` : ""}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {record.gallery ? (
        <section id="gallery" aria-labelledby="gallery-heading" className="bg-[var(--surface)] py-16 fx-reveal">
          <div className="poc-container">
            <h2 id="gallery-heading" className="mb-8 text-center font-display text-3xl font-semibold text-[var(--text)]">
              {record.gallery.title ?? "The room"}
            </h2>
            <ul className="grid grid-cols-2 gap-5 lg:grid-cols-4">
              {record.gallery.images.slice(0, 4).map((image) => (
                <li key={image.url} className="bg-[var(--bg)] p-2.5 shadow-[0_10px_28px_-16px_rgba(42,33,24,0.4)]">
                  <SmartImage
                    image={image}
                    width={600}
                    height={520}
                    sizes="(min-width: 1024px) 22vw, 46vw"
                    className="h-auto w-full object-cover"
                    attributionClassName="mt-2 text-[10.5px] text-[var(--muted)]"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="poc-container py-16 fx-reveal md:py-24">
          <h2 id="reviews-heading" className="mb-10 text-center font-display text-3xl font-semibold text-[var(--text)]">
            What guests write
          </h2>
          <div className="grid gap-10 md:grid-cols-3 md:gap-0">
            {record.reputation.reviews.slice(0, 3).map((review, index) => (
              <figure
                key={review.id}
                className={`px-0 md:px-8 ${index > 0 ? "md:border-l md:border-[var(--border)]" : ""}`}
              >
                <blockquote className="font-display text-[19px] font-medium italic leading-[1.5] text-[var(--text)]">
                  &ldquo;{review.text}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-[12px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  {review.authorName}, {review.publishedAt ? new Date(review.publishedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "recently"}
                </figcaption>
                {review.attribution ? (
                  <AttributionLine attribution={review.attribution} className="mt-1 text-[11px] text-[var(--muted)]" />
                ) : null}
              </figure>
            ))}
          </div>
          {record.reputation.reviewsUrl ? (
            <p className="mt-10 text-center">
              <a
                href={record.reputation.reviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-[var(--primary)] hover:underline"
              >
                Read more reviews <ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </a>
            </p>
          ) : null}
        </section>
      ) : null}

      <section id="visit" aria-labelledby="visit-heading" className="border-t border-[var(--border)] bg-[var(--surface)] py-16 fx-reveal md:py-24">
        <div className="poc-container grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 id="visit-heading" className="font-display text-3xl font-semibold text-[var(--text)]">
              Visit us
            </h2>
            {record.hours ? (
              <div className="mt-6">
                <h3 className="mb-3 text-[12px] uppercase tracking-[0.2em] text-[var(--accent)]">Hours</h3>
                <HoursList hours={record.hours} className="space-y-1.5 text-[14px] text-[var(--muted)]" />
              </div>
            ) : null}
            <div className="mt-8 space-y-2 text-[14px] text-[var(--muted)]">
              {record.contact.phone ? (
                <p className="flex items-center gap-2.5">
                  <Phone size={15} strokeWidth={1.5} aria-hidden="true" /> {record.contact.phone}
                </p>
              ) : null}
              {record.contact.socials.length > 0 ? (
                <p className="flex items-center gap-2.5">
                  <AtSign size={15} strokeWidth={1.5} aria-hidden="true" />
                  {record.contact.socials.map((social, index) => (
                    <span key={social.url}>
                      <a href={social.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)] hover:underline">
                        {social.label ?? social.platform}
                      </a>
                      {index < record.contact.socials.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          </div>
          {record.location ? (
            <MapSection
              location={record.location}
              businessName={record.identity.name}
              directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
              embedClassName="h-[360px] w-full border border-[var(--border)]"
              cardClassName="border border-[var(--border)] bg-[var(--bg)] p-8"
              addressClassName="text-[15px] text-[var(--text)]"
              buttonClassName="inline-flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--primary)] hover:underline"
            />
          ) : null}
        </div>
      </section>

      <footer className="bg-[var(--text)] px-6 py-12 text-[#e8ddc8]">
        <div className="poc-container flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <p className="font-display text-2xl">{record.wordmark.text}</p>
          <ConceptNotice
            record={record}
            labelClassName="text-[11px] uppercase tracking-[0.22em] text-[#b3a488]"
            bodyClassName="mt-2 max-w-md text-[12.5px] leading-relaxed text-[#8f836b]"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}

function roman(n: number): string {
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return numerals[n - 1] ?? String(n);
}
