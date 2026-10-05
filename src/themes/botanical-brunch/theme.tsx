import { Clock, Leaf, Phone, Star, Sun } from "lucide-react";
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

/** Botanical sprig divider. The brief calls for line illustration accents. */
function Sprig({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 40"
      width="120"
      height="40"
      aria-hidden="true"
      className={flip ? "-scale-x-100" : undefined}
    >
      <path d="M10 20 C 40 18, 80 22, 110 20" stroke="var(--secondary)" strokeWidth="1.5" fill="none" />
      <path d="M40 20 c -6 -8, -14 -10, -20 -9 c 4 8, 12 11, 20 9 Z" fill="none" stroke="var(--secondary)" strokeWidth="1.2" />
      <path d="M40 20 c 6 -8, 14 -10, 20 -9 c -4 8, -12 11, -20 9 Z" fill="none" stroke="var(--secondary)" strokeWidth="1.2" />
      <path d="M70 20 c -6 8, -14 10, -20 9 c 4 -8, 12 -11, 20 -9 Z" fill="none" stroke="var(--secondary)" strokeWidth="1.2" />
      <path d="M70 20 c 6 8, 14 10, 20 9 c -4 -8, -12 -11, -20 -9 Z" fill="none" stroke="var(--secondary)" strokeWidth="1.2" />
      <circle cx="110" cy="20" r="2.4" fill="var(--accent)" />
    </svg>
  );
}

/**
 * Botanical Brunch: a garden café. Sage, cream, blush, and berry with wood
 * tones; a layered lifestyle hero with arch masks, botanical linework,
 * featured-dish menu with dietary tags, amenities emphasis, and pinboard
 * review cards. Soft motion.
 */
export default function BotanicalBrunchTheme({ record }: ThemeProps) {
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
    "--radius": "16px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const gallery = record.gallery?.images ?? [];
  const layered = gallery[0] ?? null;
  const secondaryImage = gallery[1] ?? null;
  const outdoor = record.amenities.find((item) => item.key === "outdoorSeating");

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      <header className="bg-[var(--surface)]/85 backdrop-blur">
        <div className="poc-container flex h-[68px] items-center justify-between">
          <a href="#hero" className="font-display text-[22px] italic text-[var(--text)]">
            {record.wordmark.text}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[13.5px] font-semibold text-[var(--muted)] md:flex">
            {record.menu ? <a href="#menu" className="hover:text-[var(--primary)]">Menu</a> : null}
            {record.about ? <a href="#garden" className="hover:text-[var(--primary)]">The garden</a> : null}
            <a href="#visit" className="hover:text-[var(--primary)]">Visit</a>
          </nav>
          {record.cta.primary ? (
            <ActionLink
              cta={record.cta.primary}
              className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-[13px] font-bold text-[var(--on-primary)] transition-transform hover:-translate-y-0.5"
            />
          ) : record.hours?.statusLabel ? (
            <p className="text-[13px] text-[var(--muted)]">{record.hours.statusLabel}</p>
          ) : null}
        </div>
      </header>

      {/* Layered lifestyle hero */}
      <section id="hero" aria-labelledby="hero-heading" className="poc-container relative py-14 lg:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="fx-rise">
            {record.hero.eyebrow ? (
              <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--primary)]/10 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--primary)]">
                <Leaf size={13} strokeWidth={1.5} aria-hidden="true" />
                {record.hero.eyebrow}
              </p>
            ) : null}
            <h1 id="hero-heading" className="font-display text-[2.6rem] leading-[1.12] text-[var(--text)] md:text-[3.4rem]">
              {record.hero.headline}
            </h1>
            {record.hero.subheadline ? (
              <p className="mt-5 max-w-[46ch] text-[15.5px] leading-relaxed text-[var(--muted)]">
                {record.hero.subheadline}
              </p>
            ) : null}
            {record.reputation ? (
              <p className="mt-5 flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
                <Star size={15} strokeWidth={1.5} className="fill-[var(--accent)] text-[var(--accent)]" aria-hidden="true" />
                {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
              </p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              {record.cta.primary ? (
                <ActionLink
                  cta={record.cta.primary}
                  className="rounded-full bg-[var(--secondary)] px-7 py-3.5 text-[14.5px] font-bold text-[var(--on-secondary)] shadow-[0_12px_26px_-12px_rgba(164,83,106,0.65)] transition-transform hover:-translate-y-0.5 active:translate-y-0"
                />
              ) : null}
              {record.cta.secondary[0] ? (
                <ActionLink
                  cta={record.cta.secondary[0]}
                  className="rounded-full border-2 border-[var(--primary)]/40 px-6 py-3 text-[14px] font-bold text-[var(--primary)] transition-colors hover:border-[var(--primary)]"
                />
              ) : null}
            </div>
            <div className="mt-9 flex items-center gap-3 text-[var(--secondary)]">
              <Sprig />
            </div>
          </div>
          <div className="relative h-[420px] sm:h-[480px] lg:h-[540px]">
            {layered ? (
              <div className="absolute right-0 top-0 h-[78%] w-[74%] overflow-hidden rounded-t-full rounded-b-[var(--radius)] shadow-[0_24px_60px_-30px_rgba(51,50,44,0.4)]">
                <SmartImage
                  image={layered}
                  priority
                  fill
                  sizes="(min-width: 1024px) 44vw, 90vw"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : record.hero.image ? (
              <div className="absolute right-0 top-0 h-[78%] w-[74%] overflow-hidden rounded-t-full rounded-b-[var(--radius)]">
                <SmartImage image={record.hero.image} priority fill sizes="(min-width: 1024px) 44vw, 90vw" className="h-full w-full object-cover" />
              </div>
            ) : null}
            {secondaryImage ? (
              <div className="absolute bottom-0 left-0 h-[46%] w-[46%] overflow-hidden rounded-[var(--radius)] border-4 border-[var(--surface)] shadow-[0_18px_40px_-20px_rgba(51,50,44,0.45)]">
                <SmartImage
                  image={secondaryImage}
                  width={560}
                  height={460}
                  sizes="(min-width: 1024px) 24vw, 45vw"
                  className="h-full w-full object-cover"
                />
              </div>
            ) : null}
            {outdoor ? (
              <p className="absolute -right-1 bottom-8 rotate-3 rounded-full bg-[var(--accent)] px-4 py-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--on-accent)] shadow-md">
                <Sun size={12} strokeWidth={2} className="mr-1.5 inline" aria-hidden="true" />
                Garden seating
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="bg-[var(--surface)] py-16 md:py-24">
          <div className="poc-container">
            <div className="mb-12 text-center">
              <Sprig />
              <h2 id="menu-heading" className="mt-3 font-display text-4xl text-[var(--text)]">
                {record.menu.mode === "sample" ? "A morning spread" : "Brunch menu"}
              </h2>
              {record.offering.dietaryOptions.length > 0 ? (
                <p className="mt-3 text-[13px] font-semibold text-[var(--primary)]">
                  {record.offering.dietaryOptions.join(" · ")}
                </p>
              ) : null}
              {record.menu.notice ? (
                <p className="mx-auto mt-3 max-w-md text-[12.5px] italic text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                  {record.menu.notice}
                </p>
              ) : null}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {record.menu.sections.map((section) => (
                <div key={section.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-7 fx-reveal">
                  <h3 className="font-display text-2xl text-[var(--text)]">{section.name}</h3>
                  {section.description ? (
                    <p className="mt-1 text-[13px] text-[var(--muted)]">{section.description}</p>
                  ) : null}
                  <ul className="mt-5 space-y-5">
                    {section.items.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-5">
                        <div>
                          <p className="text-[15px] font-bold text-[var(--text)]">
                            {item.name}
                            {item.featured ? (
                              <span className="ml-2 inline-block rotate-2 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-[var(--secondary)]">
                                Favorite
                              </span>
                            ) : null}
                          </p>
                          {item.description ? (
                            <p className="mt-1 max-w-[40ch] text-[13.5px] leading-snug text-[var(--muted)]">
                              {item.description}
                            </p>
                          ) : null}
                          {item.tags.length > 0 ? (
                            <p className="mt-2 flex flex-wrap gap-1.5">
                              {item.tags.map((tag) => (
                                <span key={tag} className="rounded-full bg-[var(--primary)]/10 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-[var(--primary)]">
                                  {tag}
                                </span>
                              ))}
                            </p>
                          ) : null}
                        </div>
                        {item.price ? (
                          <p className="font-display text-lg text-[var(--secondary)]">{item.price}</p>
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

      {record.about || record.services.length + record.amenities.length > 0 ? (
        <section id="garden" aria-labelledby="garden-heading" className="poc-container py-16 md:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {gallery[2] ? (
              <div className="overflow-hidden rounded-t-full rounded-b-[var(--radius)] fx-reveal">
                <SmartImage
                  image={gallery[2]}
                  width={900}
                  height={1050}
                  sizes="(min-width: 1024px) 44vw, 100vw"
                  className="h-auto w-full object-cover"
                  attributionClassName="mt-2 text-[11.5px] text-[var(--muted)]"
                />
              </div>
            ) : null}
            <div className="fx-reveal">
              <h2 id="garden-heading" className="font-display text-3xl text-[var(--text)] md:text-4xl">
                {record.about?.title ?? "The garden"}
              </h2>
              {record.about ? (
                <p className="mt-6 text-[15px] leading-[1.85] text-[var(--muted)]">{record.about.body}</p>
              ) : null}
              {record.services.length + record.amenities.length > 0 ? (
                <ul className={`flex flex-wrap gap-2.5 ${record.about ? "mt-7" : "mt-6"}`}>
                  {[...record.services, ...record.amenities].slice(0, 6).map((item) => (
                    <li key={item.key + item.label} className="rounded-full border border-[var(--primary)]/30 px-3.5 py-1.5 text-[12px] font-semibold text-[var(--primary)]">
                      {item.label}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="bg-[var(--surface)] py-16 md:py-20">
          <div className="poc-container">
            <h2 id="reviews-heading" className="mb-10 text-center font-display text-3xl text-[var(--text)]">
              From the pinboard
            </h2>
            <ul className="grid gap-6 md:grid-cols-3">
              {record.reputation.reviews.slice(0, 3).map((review, index) => (
                <li
                  key={review.id}
                  className={`relative rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg)] p-6 shadow-[0_14px_30px_-20px_rgba(51,50,44,0.4)] ${
                    index === 0 ? "-rotate-1" : index === 2 ? "rotate-1" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rounded-sm bg-[var(--accent)]/35 shadow-sm"
                  />
                  <div className="mb-2 flex" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((step) => (
                      <Star key={step} size={13} strokeWidth={1.5} className={step <= review.rating ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--border)]"} />
                    ))}
                  </div>
                  <blockquote className="text-[14px] leading-relaxed text-[var(--text)]">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>
                  <p className="mt-4 font-display text-[15px] italic text-[var(--secondary)]">{review.authorName}</p>
                  {review.attribution ? (
                    <AttributionLine attribution={review.attribution} className="mt-1 text-[10.5px] text-[var(--muted)]" />
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {gallery.length > 3 ? (
        <section aria-labelledby="gallery-heading" className="poc-container py-16 md:py-20">
          <h2 id="gallery-heading" className="mb-8 text-center font-display text-3xl text-[var(--text)]">
            {record.gallery?.title ?? "Slow mornings"}
          </h2>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {gallery.slice(0, 4).map((image) => (
              <li key={image.url} className="overflow-hidden rounded-[var(--radius)]">
                <SmartImage
                  image={image}
                  width={600}
                  height={560}
                  sizes="(min-width: 1024px) 24vw, 48vw"
                  className="h-auto w-full rounded-[var(--radius)] object-cover transition-transform duration-500 hover:scale-105"
                  attributionClassName="px-1 pt-1.5 text-[10.5px] text-[var(--muted)]"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="visit" aria-labelledby="visit-heading" className="bg-[var(--surface)] py-16 md:py-20">
        <div className="poc-container grid gap-12 lg:grid-cols-2">
          <div className="fx-reveal">
            <h2 id="visit-heading" className="font-display text-3xl text-[var(--text)]">
              Come by
            </h2>
            {record.hours ? (
              <div className="mt-6 rounded-[var(--radius)] bg-[var(--bg)] p-6">
                <p className="mb-3 flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.1em] text-[var(--primary)]">
                  <Clock size={14} strokeWidth={1.5} aria-hidden="true" /> Hours
                </p>
                <HoursList hours={record.hours} className="space-y-1.5 text-[14px] text-[var(--text)]" />
              </div>
            ) : null}
            {record.contact.phone ? (
              <p className="mt-5 flex items-center gap-2.5 text-[14.5px] font-semibold text-[var(--text)]">
                <Phone size={15} strokeWidth={1.5} className="text-[var(--primary)]" aria-hidden="true" />
                <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--primary)]">
                  {record.contact.phone}
                </a>
              </p>
            ) : null}
            {record.contact.socials.length > 0 ? (
              <ul className="mt-4 flex gap-4 text-[13.5px] font-semibold text-[var(--primary)]">
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
          {record.location ? (
            <div className="fx-reveal">
              <MapSection
                location={record.location}
                businessName={record.identity.name}
                directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                embedClassName="h-[340px] w-full rounded-[var(--radius)] border-0"
                cardClassName="rounded-[var(--radius)] bg-[var(--bg)] p-8"
                addressClassName="text-[14.5px] font-semibold text-[var(--text)]"
                buttonClassName="mt-2 inline-block rounded-full bg-[var(--primary)] px-5 py-2.5 text-[13px] font-bold text-[var(--on-primary)]"
              />
            </div>
          ) : null}
        </div>
      </section>

      <BusinessEssentials record={record} />

      <footer className="bg-[var(--primary)] py-12 text-[var(--on-primary)]">
        <div className="poc-container flex flex-col items-center justify-between gap-6 text-center md:flex-row md:items-center md:text-left">
          <div>
            <p className="font-display text-2xl italic">{record.wordmark.text}</p>
            <div className="mt-3 opacity-60">
              <Sprig />
            </div>
          </div>
          <ConceptNotice
            record={record}
            labelClassName="text-[10.5px] font-bold uppercase tracking-[0.2em] text-[var(--on-primary)]/60"
            bodyClassName="mt-2 max-w-md text-[12.5px] leading-relaxed text-[var(--on-primary)]/75"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
