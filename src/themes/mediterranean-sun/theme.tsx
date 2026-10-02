import { Clock, Leaf, Phone, Star, Sun, Users } from "lucide-react";
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
 * Mediterranean Sun: bright communal coastal taverna. Arched hero image,
 * curved section edges, ceramic-token service badges, airy menu cards with
 * ingredient tags, a controlled masonry gallery, and a postcard-framed map.
 */
export default function MediterraneanSunTheme({ record }: ThemeProps) {
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
    "--on-primary": "#ffffff",
    "--radius": "18px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const tokens = [...record.services, ...record.amenities].slice(0, 4);

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      <header className="bg-[var(--primary)] text-white">
        <div className="poc-container flex h-[68px] items-center justify-between">
          <a href="#hero" className="font-display text-xl">
            {record.wordmark.text}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[14px] font-semibold md:flex">
            {record.menu ? <a href="#menu" className="opacity-90 hover:opacity-100">Menu</a> : null}
            {record.gallery ? <a href="#gallery" className="opacity-90 hover:opacity-100">Gallery</a> : null}
            {record.about ? <a href="#story" className="opacity-90 hover:opacity-100">Story</a> : null}
            <a href="#visit" className="opacity-90 hover:opacity-100">Visit</a>
          </nav>
          {record.cta.primary ? (
            <ActionLink
              cta={record.cta.primary}
              className="rounded-full bg-white px-5 py-2.5 text-[13.5px] font-bold text-[var(--primary)] transition-transform hover:-translate-y-0.5"
            />
          ) : (
            record.hours?.statusLabel ? <p className="text-[13px] opacity-90">{record.hours.statusLabel}</p> : null
          )}
        </div>
      </header>

      {/* Hero: joyful copy + arched image + ceramic tokens */}
      <section id="hero" aria-labelledby="hero-heading" className="poc-container grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div className="fx-rise">
          {record.hero.eyebrow ? (
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/25 px-4 py-1.5 text-[12.5px] font-bold uppercase tracking-[0.08em] text-[#8a6a10]">
              <Sun size={14} strokeWidth={1.5} aria-hidden="true" />
              {record.hero.eyebrow}
            </p>
          ) : null}
          <h1 id="hero-heading" className="font-display text-[2.7rem] leading-[1.05] text-[var(--text)] md:text-6xl">
            {record.hero.headline}
          </h1>
          {record.hero.subheadline ? (
            <p className="mt-5 max-w-[46ch] text-[16px] leading-relaxed text-[var(--muted)]">
              {record.hero.subheadline}
            </p>
          ) : null}
          {record.reputation ? (
            <p className="mt-5 flex items-center gap-2 text-[14.5px] font-semibold text-[var(--text)]">
              <span className="flex" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((step) => (
                  <Star
                    key={step}
                    size={15}
                    strokeWidth={1.5}
                    className={step <= Math.round(record.reputation!.rating) ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--border)]"}
                  />
                ))}
              </span>
              {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap items-center gap-4">
            {record.cta.primary ? (
              <ActionLink
                cta={record.cta.primary}
                className="rounded-full bg-[var(--secondary)] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(217,108,71,0.7)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
              />
            ) : null}
            {record.cta.secondary[0] ? (
              <ActionLink
                cta={record.cta.secondary[0]}
                className="rounded-full border-2 border-[var(--primary)] px-6 py-3 text-[14.5px] font-bold text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
              />
            ) : null}
          </div>
        </div>
        <div className="relative fx-rise">
          {record.hero.image ? (
            <SmartImage
              image={record.hero.image}
              priority
              width={1200}
              height={1300}
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="h-auto w-full rounded-t-full object-cover"
              attributionClassName="mt-2 text-center text-[11.5px] text-[var(--muted)]"
            />
          ) : null}
        </div>
      </section>

      {tokens.length > 0 ? (
        <section aria-label="Services and amenities" className="poc-container -mt-2 pb-14">
          <ul className={`flex flex-wrap gap-4 ${record.compactServiceStrip ? "justify-center" : "justify-between"}`}>
            {tokens.map((token) => (
              <li
                key={token.key + token.label}
                className="flex min-w-[130px] flex-col items-center gap-2.5 rounded-full border-2 border-dashed border-[var(--secondary)]/50 bg-white px-6 py-4 text-center text-[13px] font-bold text-[var(--text)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--secondary)]/15 text-[var(--secondary)]">
                  {token.key === "outdoorSeating" ? <Sun size={18} strokeWidth={1.5} aria-hidden="true" /> :
                   token.key === "goodForChildren" || token.key === "goodForGroups" ? <Users size={18} strokeWidth={1.5} aria-hidden="true" /> :
                   token.key === "liveMusic" ? <Star size={18} strokeWidth={1.5} aria-hidden="true" /> :
                   <Leaf size={18} strokeWidth={1.5} aria-hidden="true" />}
                </span>
                {token.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {record.menu ? (
        <section
          id="menu"
          aria-labelledby="menu-heading"
          className="rounded-t-[3rem] bg-[var(--primary)] py-16 text-white md:rounded-t-[5rem] md:py-24"
        >
          <div className="poc-container">
            <div className="mb-12 text-center">
              <h2 id="menu-heading" className="font-display text-4xl md:text-5xl">
                {record.menu.mode === "sample" ? "A taste of the menu" : "The menu"}
              </h2>
              {record.menu.notice ? (
                <p className="mx-auto mt-4 max-w-md text-[13.5px] leading-relaxed text-white/75" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                  {record.menu.notice}
                </p>
              ) : null}
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {record.menu.sections.map((section) => (
                <div key={section.id} className="rounded-[var(--radius)] bg-white p-7 text-[var(--text)] fx-reveal">
                  <h3 className="font-display text-2xl text-[var(--primary)]">{section.name}</h3>
                  {section.description ? (
                    <p className="mt-1 text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[var(--secondary)]">
                      {section.description}
                    </p>
                  ) : null}
                  <ul className="mt-5 space-y-4">
                    {section.items.map((item) => (
                      <li key={item.id} className="rounded-2xl bg-[var(--bg)] px-4 py-3.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-[14.5px] font-bold">{item.name}</span>
                          {item.price ? <span className="text-[14.5px] font-bold text-[var(--secondary)]">{item.price}</span> : null}
                        </div>
                        {item.description ? (
                          <p className="mt-1 text-[12.5px] leading-snug text-[var(--muted)]">{item.description}</p>
                        ) : null}
                        {item.tags.length > 0 ? (
                          <p className="mt-2 flex flex-wrap gap-1.5">
                            {item.tags.map((tag) => (
                              <span key={tag} className="rounded-full bg-[var(--secondary)]/12 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--secondary)]">
                                {tag}
                              </span>
                            ))}
                          </p>
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
        <section id="story" aria-labelledby="story-heading" className="poc-container py-16 md:py-24">
          <div className="mx-auto max-w-2xl text-center fx-reveal">
            <h2 id="story-heading" className="font-display text-3xl text-[var(--text)] md:text-4xl">
              {record.about.title}
            </h2>
            <p className="mt-6 text-[15px] leading-[1.85] text-[var(--muted)]">{record.about.body}</p>
          </div>
        </section>
      ) : null}

      {record.gallery ? (
        <section id="gallery" aria-labelledby="gallery-heading" className="poc-container pb-16 md:pb-24">
          <h2 id="gallery-heading" className="mb-8 text-center font-display text-3xl text-[var(--text)]">
            {record.gallery.title ?? "Gallery"}
          </h2>
          <div className="columns-2 gap-4 lg:columns-3 [&>*]:mb-4">
            {record.gallery.images.slice(0, 6).map((image) => (
              <div key={image.url} className="break-inside-avoid rounded-[var(--radius)]">
                <SmartImage
                  image={image}
                  width={700}
                  height={800}
                  sizes="(min-width: 1024px) 30vw, 48vw"
                  className="h-auto w-full rounded-[var(--radius)] object-cover"
                  attributionClassName="mt-1.5 text-[11px] text-[var(--muted)]"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="bg-white py-16 md:py-20">
          <div className="poc-container">
            <h2 id="reviews-heading" className="mb-10 text-center font-display text-3xl text-[var(--text)]">
              From our tables
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {record.reputation.reviews.slice(0, 3).map((review) => (
                <figure key={review.id} className="rounded-[var(--radius)] border-2 border-[var(--border)] bg-[var(--bg)] p-6 text-center">
                  <div className="mb-3 flex justify-center" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((step) => (
                      <Star key={step} size={14} strokeWidth={1.5} className={step <= review.rating ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--border)]"} />
                    ))}
                  </div>
                  <blockquote className="text-[14.5px] leading-relaxed text-[var(--text)]">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 text-[12.5px] font-bold uppercase tracking-[0.08em] text-[var(--secondary)]">
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

      {/* Postcard map + hours */}
      <section id="visit" aria-labelledby="visit-heading" className="poc-container py-16 md:py-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="rotate-[-1.2deg] rounded-[var(--radius)] border-[10px] border-white bg-white p-4 shadow-[0_24px_50px_-24px_rgba(23,57,79,0.45)]">
            <p className="mb-3 flex items-center justify-between font-display text-lg text-[var(--primary)]">
              {record.identity.shortName}
              <span className="rounded-full bg-[var(--secondary)] px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-[0.1em] text-white">
                Postcard
              </span>
            </p>
            {record.location ? (
              <MapSection
                location={record.location}
                businessName={record.identity.name}
                directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                embedClassName="h-[320px] w-full rounded-[10px] border-0"
                cardClassName="rounded-[10px] bg-[var(--bg)] p-6"
                addressClassName="text-[14.5px] font-semibold text-[var(--text)]"
                buttonClassName="mt-1 inline-block rounded-full bg-[var(--primary)] px-5 py-2.5 text-[13px] font-bold text-white"
              />
            ) : null}
          </div>
          <div>
            <h2 id="visit-heading" className="font-display text-3xl text-[var(--text)]">
              Come sit with us
            </h2>
            {record.hours ? (
              <div className="mt-6 rounded-[var(--radius)] border-2 border-[var(--border)] bg-white p-6">
                <p className="mb-3 flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-[var(--primary)]">
                  <Clock size={15} strokeWidth={1.5} aria-hidden="true" /> Hours
                </p>
                <HoursList hours={record.hours} className="space-y-1.5 text-[14px] text-[var(--text)]" />
              </div>
            ) : null}
            {record.contact.phone ? (
              <p className="mt-6 flex items-center gap-2.5 text-[14.5px] font-semibold text-[var(--text)]">
                <Phone size={16} strokeWidth={1.5} className="text-[var(--secondary)]" aria-hidden="true" />
                <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--secondary)]">
                  {record.contact.phone}
                </a>
              </p>
            ) : null}
            {record.contact.socials.length > 0 ? (
              <ul className="mt-4 flex gap-4 text-[13.5px] font-bold text-[var(--primary)]">
                {record.contact.socials.map((social) => (
                  <li key={social.url}>
                    <a href={social.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                      {social.label ?? social.platform}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      <footer className="bg-[var(--primary)] py-12 text-white">
        <div className="poc-container flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="font-display text-2xl">{record.wordmark.text}</p>
          <ConceptNotice
            record={record}
            labelClassName="text-[10.5px] uppercase tracking-[0.2em] text-white/60"
            bodyClassName="mt-2 max-w-md text-[12.5px] leading-relaxed text-white/70"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
