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
 * Coffee Editorial: an independent café rendered as a magazine. Masthead
 * navigation, publication-cover hero, story-first about, editorial columns,
 * oversized folio numerals on menu sections, reviews as marginalia pull
 * quotes, film grain instead of cards.
 */
export default function CoffeeEditorialTheme({ record }: ThemeProps) {
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
    "--on-primary": "#f8f2e8",
    "--radius": "2px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const issueNo = String(
    Math.max(1, Math.round((Date.now() - new Date(record.poc.createdAt).getTime()) / 86400000) + 1),
  ).padStart(2, "0");

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      <div className="grain-overlay" aria-hidden="true" />

      {/* Masthead */}
      <header className="border-b-2 border-[var(--text)]">
        <div className="poc-container flex h-[68px] items-center justify-between gap-6">
          <p className="font-display text-[26px] font-semibold leading-none">{record.wordmark.text}</p>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] md:flex">
            {record.about ? <a href="#story" className="hover:text-[var(--secondary)]">Story</a> : null}
            {record.menu ? <a href="#menu" className="hover:text-[var(--secondary)]">Menu</a> : null}
            {record.gallery ? <a href="#gallery" className="hover:text-[var(--secondary)]">Photos</a> : null}
            <a href="#visit" className="hover:text-[var(--secondary)]">Visit</a>
          </nav>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            No. {issueNo} · {record.location?.city ?? record.identity.primaryCategory}
          </p>
        </div>
      </header>

      {/* Cover hero */}
      <section aria-labelledby="hero-heading">
        <div className="poc-container grid gap-8 py-12 lg:grid-cols-[1.35fr_1fr] lg:items-end lg:py-16">
          <div className="fx-rise">
            {record.hero.eyebrow ? (
              <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--secondary)]">
                {record.hero.eyebrow}
              </p>
            ) : null}
            <h1 id="hero-heading" className="font-display text-[2.9rem] font-medium leading-[1.02] md:text-6xl lg:text-[4.4rem]">
              {record.hero.headline}
            </h1>
          </div>
          <div className="fx-rise border-l-2 border-[var(--secondary)] pl-6 lg:mb-2">
            {record.hero.subheadline ? (
              <p className="text-[14.5px] leading-[1.8] text-[var(--muted)]">{record.hero.subheadline}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-4">
              {record.cta.primary ? (
                <ActionLink
                  cta={record.cta.primary}
                  className="bg-[var(--primary)] px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--on-primary)] transition-transform hover:-translate-y-0.5"
                />
              ) : null}
              {record.cta.secondary[0] ? (
                <ActionLink
                  cta={record.cta.secondary[0]}
                  className="border-b-2 border-[var(--secondary)] pb-0.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text)] hover:text-[var(--secondary)]"
                />
              ) : null}
            </div>
            {record.reputation ? (
              <p className="mt-6 flex items-center gap-2 text-[13px] text-[var(--muted)]">
                <Star size={14} strokeWidth={1.5} className="fill-[var(--accent)] text-[var(--accent)]" aria-hidden="true" />
                {record.reputation.rating.toFixed(1)} / {record.reputation.reviewCount.toLocaleString("en-US")} reviews
              </p>
            ) : null}
          </div>
        </div>
        {record.hero.image ? (
          <div className="poc-container pb-12">
            <div className="relative h-[clamp(360px,48vw,620px)] overflow-hidden border-y-2 border-[var(--text)]">
              <SmartImage
                image={record.hero.image}
                priority
                fill
                sizes="(min-width: 1120px) 1120px, 100vw"
                className="h-full w-full object-cover"
                attributionClassName="mt-2 text-right font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--muted)]"
              />
            </div>
          </div>
        ) : null}
      </section>

      {record.about || record.services.length + record.amenities.length > 0 ? (
        <section id="story" aria-labelledby="story-heading" className="border-t-2 border-[var(--text)]">
          <div className="poc-container grid gap-10 py-14 md:grid-cols-[1fr_1.6fr] md:py-20 fx-reveal">
            <div>
              <p className="font-display text-[64px] font-medium leading-none text-[var(--accent)]/45" aria-hidden="true">
                {issueNo}
              </p>
              <h2 id="story-heading" className="mt-2 font-display text-3xl font-medium">
                {record.about?.title ?? "At a glance"}
              </h2>
              {record.reputation?.summary ? (
                <p className="mt-5 border-l-2 border-[var(--accent)] pl-4 font-display text-[17px] italic leading-relaxed text-[var(--muted)]">
                  {record.reputation.summary}
                </p>
              ) : null}
            </div>
            <div>
              {record.about ? (
                <p className="text-[16.5px] leading-[1.9] text-[var(--text)]">{record.about.body}</p>
              ) : null}
              {record.services.length + record.amenities.length > 0 ? (
                <p className={`font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] ${record.about ? "mt-7" : ""}`}>
                  {[...record.services, ...record.amenities].slice(0, 5).map((item) => item.label).join(" / ")}
                </p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="border-t-2 border-[var(--text)] bg-[var(--surface)]">
          <div className="poc-container py-14 md:py-20">
            <div className="mb-12 flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--border)] pb-6">
              <h2 id="menu-heading" className="font-display text-4xl font-medium md:text-5xl">
                Menu
              </h2>
              {record.menu.notice ? (
                <p className="max-w-sm font-mono text-[11px] uppercase leading-relaxed tracking-[0.1em] text-[var(--secondary)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                  {record.menu.notice}
                </p>
              ) : null}
            </div>
            <div className="grid gap-x-12 gap-y-14 md:grid-cols-2">
              {record.menu.sections.map((section, index) => (
                <article key={section.id} className="relative fx-reveal">
                  <div className="flex items-start gap-5">
                    <span className="font-display text-[52px] font-medium leading-[0.85] text-[var(--secondary)]" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="pt-1">
                      <h3 className="font-display text-2xl font-medium">{section.name}</h3>
                      {section.description ? (
                        <p className="mt-1 font-display text-[14px] italic text-[var(--muted)]">{section.description}</p>
                      ) : null}
                    </div>
                  </div>
                  <dl className="mt-6 divide-y divide-dotted divide-[var(--border)]">
                    {section.items.map((item) => (
                      <div key={item.id} className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 py-3.5">
                        <dt>
                          <span className="text-[15px] font-semibold">{item.name}</span>
                          {item.featured ? (
                            <span className="ml-2 align-middle font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--accent)]">
              Editors&rsquo; pick
                            </span>
                          ) : null}
                          {item.description ? (
                            <span className="mt-0.5 block max-w-[44ch] text-[13.5px] leading-relaxed text-[var(--muted)]">
                              {item.description}
                              {item.tags.length > 0 ? ` (${item.tags.join(", ")})` : ""}
                            </span>
                          ) : null}
                        </dt>
                        <dd className="text-[15px] font-semibold tabular-nums">{item.price ?? ""}</dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {record.gallery ? (
        <section id="gallery" aria-labelledby="gallery-heading" className="border-t-2 border-[var(--text)]">
          <div className="poc-container py-14 md:py-20">
            <h2 id="gallery-heading" className="mb-10 font-display text-4xl font-medium">
              {record.gallery.title ?? "Plates"}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {record.gallery.images.slice(0, 4).map((image, index) => (
                <figure key={image.url} className={index % 2 === 1 ? "lg:mt-10" : ""}>
                  <SmartImage
                    image={image}
                    width={640}
                    height={index % 2 === 1 ? 800 : 560}
                    sizes="(min-width: 1024px) 24vw, 48vw"
                    className="h-auto w-full object-cover"
                    attributionClassName="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted)]"
                  />
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="border-t-2 border-[var(--text)] bg-[var(--surface)]">
          <div className="poc-container grid gap-12 py-14 md:grid-cols-[200px_1fr] md:py-20">
            <h2 id="reviews-heading" className="font-display text-3xl font-medium">
              Marginalia
            </h2>
            <div className="space-y-10">
              {record.reputation.reviews.slice(0, 3).map((review) => (
                <figure key={review.id} className="border-l-2 border-[var(--text)] pl-6">
                  <blockquote className="font-display text-[21px] font-medium italic leading-[1.55]">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    {review.authorName} · verified guest review
                  </figcaption>
                  {review.attribution ? (
                    <AttributionLine attribution={review.attribution} className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]" />
                  ) : null}
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Visit: editorial columns */}
      <section id="visit" aria-labelledby="visit-heading" className="border-t-2 border-[var(--text)]">
        <div className="poc-container grid gap-12 py-14 md:grid-cols-2 md:py-20">
          <div className="fx-reveal">
            <h2 id="visit-heading" className="font-display text-4xl font-medium">
              Visit
            </h2>
            <div className="mt-8 columns-1 gap-10 text-[14px] leading-[1.9] text-[var(--muted)] sm:columns-2">
              {record.hours ? (
                <div className="break-inside-avoid">
                  <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-[var(--text)]">Hours</p>
                  <HoursList hours={record.hours} className="space-y-1" />
                </div>
              ) : null}
              <div className="mt-8 break-inside-avoid sm:mt-0">
                <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-[var(--text)]">Contact</p>
                {record.contact.phone ? (
                  <p className="flex items-center gap-2">
                    <Phone size={13} strokeWidth={1.5} aria-hidden="true" />
                    <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--secondary)]">
                      {record.contact.phone}
                    </a>
                  </p>
                ) : null}
                {record.contact.website ? (
                  <p className="mt-1.5">
                    <a href={record.contact.website} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                      Current website ↗
                    </a>
                  </p>
                ) : null}
                {record.contact.socials.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {record.contact.socials.map((social) => (
                      <li key={social.url}>
                        <a href={social.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                          {social.label ?? social.platform} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
          {record.location ? (
            <div className="fx-reveal">
              <MapSection
                location={record.location}
                businessName={record.identity.name}
                directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                embedClassName="h-[340px] w-full border-2 border-[var(--text)]"
                cardClassName="border-2 border-[var(--text)] p-8"
                addressClassName="text-[14px] text-[var(--text)]"
                buttonClassName="mt-2 inline-block border-b-2 border-[var(--secondary)] pb-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text)] hover:text-[var(--secondary)]"
              />
            </div>
          ) : null}
        </div>
      </section>

      <footer className="border-t-2 border-[var(--text)]">
        <div className="poc-container flex flex-col justify-between gap-6 py-10 md:flex-row md:items-center">
          <div>
            <p className="font-display text-2xl">{record.wordmark.text}</p>
            <p className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Issue No. {issueNo} · {new Date(record.poc.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <ConceptNotice
            record={record}
            labelClassName="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)]"
            bodyClassName="mt-2 max-w-md text-[12px] leading-relaxed text-[var(--muted)]"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
