import { Star } from "lucide-react";
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
 * Luxury Fine Dining: cinematic and restrained. Full-bleed hero with a dark
 * scrim and minimal centered copy, discreet small-caps navigation, a
 * reservation-first CTA, spacious course layout, single elegant quotes, and
 * slow fades. Flat muted gold, never gradient.
 */
export default function LuxuryFineDiningTheme({ record }: ThemeProps) {
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
    "--on-primary": "#111110",
    "--radius": "0px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const primary =
    record.cta.primary ??
    (record.cta.secondary[0] ?? null);

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      {/* Discreet nav over the hero */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#111110]/55 backdrop-blur-sm">
        <div className="poc-container flex h-[64px] items-center justify-between">
          <a href="#hero" className="text-[15px] uppercase tracking-[0.34em] text-[var(--text)]">
            {record.wordmark.text}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-9 text-[11.5px] uppercase tracking-[0.22em] text-[var(--muted)] md:flex">
            {record.menu ? <a href="#menu" className="hover:text-[var(--accent)]">Menu</a> : null}
            {record.gallery ? <a href="#rooms" className="hover:text-[var(--accent)]">The room</a> : null}
            <a href="#visit" className="hover:text-[var(--accent)]">Visit</a>
          </nav>
          {primary ? (
            <ActionLink
              cta={primary}
              className="border border-[var(--accent)]/70 px-5 py-2 text-[11px] uppercase tracking-[0.22em] text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--on-primary)]"
            />
          ) : null}
        </div>
      </header>

      {/* Cinematic hero */}
      <section id="hero" aria-labelledby="hero-heading" className="relative min-h-[100dvh]">
        {record.hero.image ? (
          <div className="absolute inset-0">
            <SmartImage
              image={record.hero.image}
              priority
              fill
              sizes="100vw"
              className="h-full w-full object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-[#111110]/70 via-[#111110]/35 to-[#111110]/85" />
          </div>
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-[var(--bg)]" />
        )}
        <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
          {record.hero.eyebrow ? (
            <p className="mb-6 text-[11px] uppercase tracking-[0.42em] text-[var(--accent)] fx-fade">
              {record.hero.eyebrow}
            </p>
          ) : null}
          <h1
            id="hero-heading"
            className="max-w-3xl font-display text-4xl leading-[1.2] text-[#f3efe6] md:text-6xl fx-rise"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {record.hero.headline}
          </h1>
          {record.hero.subheadline ? (
            <p className="mt-7 max-w-md text-[14px] font-light leading-[2] tracking-[0.04em] text-[#d8d2c4]">
              {record.hero.subheadline}
            </p>
          ) : null}
          {record.offering.priceRange ? (
            <p className="mt-6 text-[11.5px] uppercase tracking-[0.3em] text-[var(--muted)]">
              {record.offering.priceRange}
            </p>
          ) : null}
          {primary ? (
            <ActionLink
              cta={primary}
              className="mt-10 border border-[var(--accent)] px-10 py-4 text-[11.5px] uppercase tracking-[0.3em] text-[var(--accent)] transition-all duration-500 hover:bg-[var(--accent)] hover:text-[var(--on-primary)]"
            />
          ) : null}
          {record.reputation ? (
            <p className="mt-9 flex items-center gap-2.5 text-[12px] tracking-[0.12em] text-[#b9b2a2]">
              <Star size={13} strokeWidth={1.5} className="text-[var(--accent)]" aria-hidden="true" />
              {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
            </p>
          ) : null}
        </div>
      </section>

      {record.about ? (
        <section aria-labelledby="about-heading" className="bg-[var(--bg)] py-24 text-center md:py-32">
          <div className="mx-auto max-w-xl px-6 fx-reveal">
            <div aria-hidden="true" className="mx-auto mb-8 h-px w-16 bg-[var(--accent)]" />
            <h2 id="about-heading" className="font-display text-2xl leading-[1.5] text-[#f3efe6] md:text-[2rem]">
              {record.about.title}
            </h2>
            <p className="mt-7 text-[14px] font-light leading-[2.1] tracking-[0.02em] text-[#a89f8d]">
              {record.about.body}
            </p>
          </div>
        </section>
      ) : null}

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="border-t border-[var(--border)] py-24 md:py-32">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-16 text-center fx-reveal">
              <h2 id="menu-heading" className="font-display text-3xl text-[#f3efe6] md:text-4xl">
                {record.menu.mode === "sample" ? "A Recent Menu" : "The Menu"}
              </h2>
              <div aria-hidden="true" className="mx-auto mt-6 h-px w-16 bg-[var(--accent)]" />
              {record.menu.notice ? (
                <p className="mx-auto mt-6 max-w-md text-[12px] font-light leading-relaxed tracking-[0.04em] text-[#8d8574]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                  {record.menu.notice}
                </p>
              ) : null}
            </div>
            <div className="space-y-20">
              {record.menu.sections.map((section) => (
                <div key={section.id} className="fx-reveal">
                  <h3 className="text-center text-[12px] uppercase tracking-[0.4em] text-[var(--accent)]">
                    {section.name}
                  </h3>
                  {section.description ? (
                    <p className="mt-3 text-center text-[13px] font-light italic tracking-[0.05em] text-[#8d8574]">
                      {section.description}
                    </p>
                  ) : null}
                  <ul className="mx-auto mt-10 max-w-xl space-y-8">
                    {section.items.map((item) => (
                      <li key={item.id} className="text-center">
                        <p className="font-display text-[19px] tracking-[0.03em] text-[#e8e2d3]">{item.name}</p>
                        {item.description ? (
                          <p className="mx-auto mt-2 max-w-sm text-[12.5px] font-light leading-relaxed text-[#8d8574]">
                            {item.description}
                          </p>
                        ) : null}
                        {item.price ? (
                          <p className="mt-2 text-[12px] tracking-[0.2em] text-[var(--accent)]">{item.price}</p>
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

      {record.gallery ? (
        <section id="rooms" aria-label="Gallery" className="border-t border-[var(--border)] py-24 md:py-28">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid gap-4 md:grid-cols-5 md:grid-rows-2">
              {record.gallery.images.slice(0, 5).map((image, index) => (
                <div
                  key={image.url}
                  className={`relative overflow-hidden ${index === 0 ? "md:col-span-3 md:row-span-2" : "md:col-span-2"}`}
                >
                  <SmartImage
                    image={image}
                    width={index === 0 ? 900 : 600}
                    height={index === 0 ? 900 : 440}
                    sizes={index === 0 ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 768px) 40vw, 100vw"}
                    fill={index !== 0}
                    className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out hover:scale-[1.03]"
                    attributionClassName="mt-2 text-[10.5px] tracking-[0.08em] text-[#8a8270]"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="border-t border-[var(--border)] py-24 md:py-28">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 id="reviews-heading" className="sr-only">
              Guest words
            </h2>
            {record.reputation.reviews.slice(0, 2).map((review) => (
              <figure key={review.id} className="mb-14 last:mb-0 fx-reveal">
                <blockquote className="font-display text-[22px] leading-[1.75] tracking-[0.02em] text-[#e8e2d3]">
                  &ldquo;{review.text}&rdquo;
                </blockquote>
                <figcaption className="mt-6 text-[11px] uppercase tracking-[0.32em] text-[var(--accent)]">
                  {review.authorName}
                </figcaption>
                {review.attribution ? (
                  <AttributionLine attribution={review.attribution} className="mt-2 text-[10.5px] text-[#6f685a]" />
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      <section id="visit" aria-labelledby="visit-heading" className="border-t border-[var(--border)] py-24 md:py-28">
        <div className="mx-auto grid max-w-5xl gap-16 px-6 lg:grid-cols-2">
          <div className="fx-reveal">
            <h2 id="visit-heading" className="font-display text-2xl text-[#f3efe6]">
              Reservations
            </h2>
            {record.hours ? (
              <div className="mt-9">
                <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-[var(--accent)]">Hours</p>
                <HoursList hours={record.hours} className="space-y-2 text-[13px] font-light leading-loose tracking-[0.03em] text-[#a89f8d]" />
              </div>
            ) : null}
            <div className="mt-9 space-y-2 text-[13px] font-light tracking-[0.03em] text-[#a89f8d]">
              {record.location?.formattedAddress ? <p>{record.location.formattedAddress}</p> : null}
              {record.contact.phone ? (
                <p>
                  <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--accent)]">
                    {record.contact.phone}
                  </a>
                </p>
              ) : null}
              {record.contact.email ? (
                <p>
                  <a href={`mailto:${record.contact.email}`} className="hover:text-[var(--accent)]">
                    {record.contact.email}
                  </a>
                </p>
              ) : null}
            </div>
            {primary ? (
              <ActionLink
                cta={primary}
                className="mt-10 inline-block border border-[var(--accent)] px-9 py-3.5 text-[11px] uppercase tracking-[0.28em] text-[var(--accent)] transition-all duration-500 hover:bg-[var(--accent)] hover:text-[var(--on-primary)]"
              />
            ) : null}
          </div>
          {record.location ? (
            <div className="fx-reveal">
              <MapSection
                location={record.location}
                businessName={record.identity.name}
                directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                embedClassName="h-[380px] w-full border border-[var(--border)] grayscale-[35%]"
                cardClassName="border border-[var(--border)] p-10"
                addressClassName="text-[13px] font-light tracking-[0.03em] text-[#a89f8d]"
                buttonClassName="mt-2 inline-block border-b border-[var(--accent)] pb-1 text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]"
              />
            </div>
          ) : null}
        </div>
      </section>

      <footer className="border-t border-[var(--border)] py-14">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
          <p className="text-[14px] uppercase tracking-[0.34em] text-[#f3efe6]">{record.wordmark.text}</p>
          <ConceptNotice
            record={record}
            labelClassName="text-[10px] uppercase tracking-[0.3em] text-[#6f685a]"
            bodyClassName="mt-2 max-w-sm text-center text-[11.5px] font-light leading-relaxed text-[#6f685a] md:text-right"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
