import { Clock, MapPin, Phone, Star } from "lucide-react";
import type { ThemeProps } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";
import { BusinessEssentials } from "@/components/poc/BusinessEssentials";
import { AttributionLine } from "@/components/poc/attribution/AttributionLine";
import { ConceptNotice } from "@/components/poc/ConceptNotice";
import { HoursList } from "@/components/poc/HoursList";
import { MobileActionBar } from "@/components/poc/MobileActionBar";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { MapSection } from "@/components/poc/map/MapSection";
import { HeroSequence } from "@/components/poc/motion/HeroSequence";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/StaggerGroup";
import { display, body } from "./fonts";

/**
 * Street Food Poster: a food truck as a layered event poster. Irregular
 * color blocks, oversized type, cutout image treatment with thick borders
 * and offset shadows, sticker labels, halftone texture, price-forward menu,
 * and location/hours given top billing. Energetic motion: fast poster-block
 * entrances, stickers that rotate into place, punchy staggered panels —
 * each effect plays once and the reading order stays logical despite the
 * visual noise.
 */
export default function StreetFoodPosterTheme({ record }: ThemeProps) {
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

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      {/* Header band */}
      <header className="border-b-4 border-[var(--text)] bg-[var(--accent)]">
        <div className="poc-container flex h-16 items-center justify-between">
          <a href="#hero" className="font-display text-xl tracking-tight text-[var(--text)]">
            {record.wordmark.text.toUpperCase()}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-6 text-[13px] font-bold uppercase tracking-[0.06em] md:flex">
            {record.menu ? <a href="#menu" className="underline decoration-2 underline-offset-4 hover:bg-[var(--text)] hover:text-[var(--accent)]">Menu</a> : null}
            <a href="#find" className="underline decoration-2 underline-offset-4 hover:bg-[var(--text)] hover:text-[var(--accent)]">Find the truck</a>
          </nav>
          {record.hours?.statusLabel ? (
            <p className="border-2 border-[var(--text)] bg-[var(--bg)] px-3 py-1 text-[11.5px] font-bold uppercase">
              {record.hours.statusLabel}
            </p>
          ) : null}
        </div>
      </header>

      {/* Poster hero: layered blocks */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden border-b-4 border-[var(--text)] bg-[var(--primary)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, ${p.text} 2.2px, transparent 2.6px)`,
            backgroundSize: "16px 16px",
          }}
        />
        <div className="poc-container relative grid gap-0 py-14 lg:grid-cols-[1.25fr_1fr] lg:py-20">
          <div className="text-[var(--text)]">
            <HeroSequence
              steps={[
                record.hero.eyebrow ? (
                  <p key="eyebrow" className="mb-5 inline-block -rotate-1 bg-[var(--accent)] px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-[0.1em]">
                    {record.hero.eyebrow}
                  </p>
                ) : null,
                <h1 key="headline" id="hero-heading" className="font-display text-[3.2rem] uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-[5.4rem]">
                  {record.hero.headline}
                </h1>,
                record.hero.subheadline ? (
                  <p key="sub" className="mt-6 max-w-[40ch] text-[16px] font-semibold leading-snug text-[var(--on-primary)]/85">
                    {record.hero.subheadline}
                  </p>
                ) : null,
                record.reputation ? (
                  <p key="reputation" className="mt-5 inline-flex items-center gap-2 bg-[var(--text)] px-3.5 py-2 text-[13px] font-bold text-[var(--accent)]">
                    <Star size={14} strokeWidth={2} aria-hidden="true" />
                    {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
                  </p>
                ) : null,
                <div key="ctas" className="mt-8 flex flex-wrap gap-4">
                  {record.cta.primary ? (
                    <ActionLink
                      cta={record.cta.primary}
                      className="border-2 border-[var(--text)] bg-[var(--accent)] px-7 py-3.5 text-[15px] font-extrabold uppercase tracking-[0.04em] shadow-[5px_5px_0_var(--text)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_var(--text)]"
                    />
                  ) : null}
                  {record.cta.secondary[0] ? (
                    <ActionLink
                      cta={record.cta.secondary[0]}
                      className="border-2 border-[var(--text)] bg-[var(--bg)] px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-[0.04em] transition-colors hover:bg-[var(--secondary)] hover:text-[var(--on-secondary)]"
                    />
                  ) : null}
                </div>,
              ]}
            />
          </div>
          {record.hero.image ? (
            <Reveal media delay={0.12} className="relative mt-10 lg:mt-0">
              <div className="rotate-2 border-4 border-[var(--text)] bg-[var(--accent)] p-2 shadow-[8px_8px_0_var(--text)]">
                <SmartImage
                  image={record.hero.image}
                  priority
                  width={1000}
                  height={860}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="h-auto w-full border-2 border-[var(--text)] object-cover"
                  attributionClassName="mt-2 text-[10.5px] font-bold uppercase tracking-wide text-[var(--on-accent)]"
                />
              </div>
              {record.hours?.openNow !== null && record.hours ? (
                <p
                  className={`absolute -left-3 top-6 -rotate-6 rounded-full px-4 py-2 font-display text-sm uppercase tracking-wide ${
                    record.hours.openNow ? "bg-[var(--secondary)] text-[var(--on-secondary)]" : "bg-[var(--text)] text-[var(--accent)]"
                  }`}
                >
                  {record.hours.openNow ? "OUT NOW" : "CLOSED TODAY"}
                </p>
              ) : null}
            </Reveal>
          ) : null}
        </div>
      </section>

      {/* Location and hours: prominent for street food */}
      <section id="find" aria-labelledby="find-heading" className="border-b-4 border-[var(--text)] bg-[var(--secondary)] text-[var(--on-secondary)]">
        <Reveal className="poc-container grid gap-8 py-12 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-12">
          <div>
            <h2 id="find-heading" className="flex items-center gap-2.5 font-display text-2xl uppercase tracking-tight">
              <MapPin size={22} strokeWidth={2} aria-hidden="true" /> Find us
            </h2>
            {record.location?.shortAddress || record.location?.formattedAddress ? (
              <p className="mt-3 max-w-xs text-[14.5px] font-semibold leading-snug">
                {record.location.shortAddress ?? record.location.formattedAddress}
              </p>
            ) : null}
            {record.announcement ? (
              <p className="mt-3 inline-block bg-[var(--text)] px-3 py-1.5 text-[12.5px] font-bold uppercase tracking-wide text-[var(--accent)]">
                {record.announcement}
              </p>
            ) : null}
          </div>
          {record.hours ? (
            <div className="border-l-4 border-current/35 pl-6">
              <p className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em]">
                <Clock size={14} strokeWidth={2} aria-hidden="true" /> Opening days
              </p>
              <HoursList hours={record.hours} className="space-y-1 text-[13.5px] font-semibold" />
            </div>
          ) : null}
          {record.cta.secondary.find((cta) => cta.kind === "directions") ?? record.location ? (
            <ActionLink
              cta={
                record.cta.secondary.find((cta) => cta.kind === "directions") ?? {
                  label: "Get directions",
                  href: `https://www.google.com/maps/search/?api=1&query=${record.location?.latitude},${record.location?.longitude}`,
                  kind: "directions",
                  external: true,
                }
              }
              className="self-start border-2 border-[var(--text)] bg-[var(--accent)] px-6 py-3.5 text-[14px] font-extrabold uppercase tracking-wide text-[var(--text)] shadow-[5px_5px_0_var(--text)] transition-transform hover:-translate-y-0.5"
            />
          ) : null}
        </Reveal>
      </section>

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="poc-container py-14 md:py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 id="menu-heading" className="font-display text-5xl uppercase leading-none tracking-tight text-[var(--text)] md:text-6xl">
              Menu
            </h2>
            {record.menu.notice ? (
              <p className="max-w-xs border-l-4 border-[var(--primary)] pl-3 text-[12.5px] font-semibold leading-snug text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                {record.menu.notice}
              </p>
            ) : null}
          </div>
          <StaggerGroup className="grid gap-6 md:grid-cols-2" gap={0.08}>
            {record.menu.sections.map((section, index) => (
              <StaggerItem key={section.id} direction="none" customDistance={0}>
              <div
                className={`h-full border-4 border-[var(--text)] p-6 md:p-8 ${
                  index % 2 === 0 ? "bg-[var(--surface)]" : "bg-[var(--accent)]/60"
                }`}
                style={index % 2 === 1 ? { transform: "rotate(-0.5deg)" } : undefined}
              >
                <h3 className="inline-block bg-[var(--text)] px-3 py-1.5 font-display text-lg uppercase tracking-tight text-[var(--accent)]">
                  {section.name}
                </h3>
                {section.description ? (
                  <p className="mt-3 text-[12.5px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    {section.description}
                  </p>
                ) : null}
                <ul className="mt-5 space-y-4">
                  {section.items.map((item) => (
                    <li key={item.id} className="flex items-baseline justify-between gap-4 border-b-2 border-dashed border-[var(--text)]/30 pb-3">
                      <span>
                        <span className="text-[15.5px] font-extrabold uppercase tracking-tight text-[var(--text)]">
                          {item.name}
                        </span>
                        {item.description ? (
                          <span className="mt-0.5 block max-w-[34ch] text-[13px] font-medium leading-snug text-[var(--muted)]">
                            {item.description}
                          </span>
                        ) : null}
                        {item.tags.length > 0 ? (
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {item.tags.map((tag) => (
                              <span key={tag} className="rounded-full border-2 border-[var(--secondary)] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--secondary)]">
                                {tag}
                              </span>
                            ))}
                          </span>
                        ) : null}
                      </span>
                      {item.price ? (
                        <span className="font-display text-2xl text-[var(--primary)]">{item.price}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      ) : null}

      {record.about || record.services.length + record.amenities.length > 0 ? (
        <section aria-label="About" className="border-y-4 border-[var(--text)] bg-[var(--text)] py-14 text-[var(--bg)] md:py-18">
          <div className="poc-container grid gap-10 md:grid-cols-[1.4fr_1fr]">
            {record.about ? (
              <Reveal>
                <h2 id="about-heading" className="font-display text-3xl uppercase tracking-tight text-[var(--accent)]">
                  {record.about.title}
                </h2>
                <p className="mt-5 max-w-[58ch] text-[14.5px] font-medium leading-relaxed text-[#d8d2c8]">
                  {record.about.body}
                </p>
              </Reveal>
            ) : null}
            {record.services.length + record.amenities.length > 0 ? (
              <StaggerGroup as="ul" className="flex flex-wrap content-start gap-3" gap={0.05}>
                {[...record.services, ...record.amenities].slice(0, 6).map((item, index) => (
                  <StaggerItem
                    as="li"
                    key={item.key + item.label}
                    settle
                    className={`px-3.5 py-2 text-[12px] font-extrabold uppercase tracking-wide ${
                      index % 2 === 0
                        ? "-rotate-2 bg-[var(--accent)] text-[var(--text)]"
                        : "rotate-1 bg-[var(--secondary)] text-[var(--on-secondary)]"
                    }`}
                  >
                    {item.label}
                  </StaggerItem>
                ))}
              </StaggerGroup>
            ) : null}
          </div>
        </section>
      ) : null}

      {record.gallery ? (
        <section aria-labelledby="gallery-heading" className="poc-container py-14 md:py-20">
          <h2 id="gallery-heading" className="mb-8 font-display text-4xl uppercase tracking-tight text-[var(--text)]">
            {record.gallery.title ?? "Concept gallery"}
          </h2>
          <StaggerGroup as="ul" className="grid grid-cols-2 gap-5 lg:grid-cols-4" gap={0.06}>
            {record.gallery.images.slice(0, 4).map((image, index) => (
              <StaggerItem
                as="li"
                key={image.url}
                className={`border-4 border-[var(--text)] bg-[var(--accent)] p-1.5 shadow-[5px_5px_0_var(--text)] ${
                  index % 2 === 0 ? "-rotate-1" : "rotate-1"
                }`}
              >
                <SmartImage
                  image={image}
                  width={600}
                  height={600}
                  sizes="(min-width: 1024px) 24vw, 48vw"
                  className="h-auto w-full border-2 border-[var(--text)] object-cover"
                  attributionClassName="mt-1.5 text-[10px] font-bold uppercase text-[var(--muted)]"
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="border-t-4 border-[var(--text)] bg-[var(--primary)] py-14 text-[var(--text)] md:py-20">
          <div className="poc-container">
            <h2 id="reviews-heading" className="mb-10 font-display text-4xl uppercase tracking-tight">
              Word on the street
            </h2>
            <StaggerGroup as="ul" className="grid gap-6 md:grid-cols-3" gap={0.07}>
              {record.reputation.reviews.slice(0, 3).map((review, index) => (
                <StaggerItem
                  as="li"
                  key={review.id}
                  className={`border-3 border-[var(--text)] bg-[var(--bg)] p-6 ${
                    index === 1 ? "md:-translate-y-3" : ""
                  }`}
                  style={{ borderWidth: 3 }}
                >
                  <p className="font-display text-lg" aria-label={`${review.rating} out of 5 stars`}>
                    {"★".repeat(review.rating)}
                    <span className="text-[var(--text)]/25">{"★".repeat(5 - review.rating)}</span>
                  </p>
                  <blockquote className="mt-3 text-[14px] font-bold leading-snug">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>
                  <p className="mt-4 inline-block -rotate-1 bg-[var(--secondary)] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-[var(--on-secondary)]">
                    {review.authorName}
                  </p>
                  {review.attribution ? (
                    <AttributionLine attribution={review.attribution} className="mt-2 block text-[10.5px] text-[var(--muted)]" />
                  ) : null}
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      ) : null}

      {/* Contact strip */}
      <section aria-labelledby="contact-heading" className="border-t-4 border-[var(--text)] bg-[var(--accent)] py-10 text-[var(--on-accent)]">
        <div className="poc-container flex flex-wrap items-center justify-between gap-6">
          <h2 id="contact-heading" className="font-display text-2xl uppercase tracking-tight">
            Get in touch
          </h2>
          <div className="flex flex-wrap items-center gap-6 text-[14px] font-bold">
            {record.contact.phone ? (
              <p className="flex items-center gap-2">
                <Phone size={15} strokeWidth={2} aria-hidden="true" />
                <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="underline decoration-2 underline-offset-4">
                  {record.contact.phone}
                </a>
              </p>
            ) : null}
            {record.contact.socials.map((social) => (
              <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer" className="underline decoration-2 underline-offset-4">
                {social.label ?? social.platform}
              </a>
            ))}
          </div>
        </div>
      </section>

      {record.location ? (
        <section aria-label="Map" className="border-t-4 border-[var(--text)]">
          <Reveal>
          <MapSection
            location={record.location}
            businessName={record.identity.name}
            directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
            embedClassName="h-[360px] w-full border-0"
            cardClassName="bg-[var(--surface)] p-8"
            addressClassName="text-[14.5px] font-bold"
            buttonClassName="inline-block border-2 border-[var(--text)] bg-[var(--accent)] px-5 py-2.5 text-[12.5px] font-extrabold uppercase tracking-wide text-[var(--on-accent)] shadow-[4px_4px_0_var(--text)]"
            detailsClassName="poc-container flex flex-wrap items-center justify-between gap-x-8 gap-y-4 py-6"
          />
          </Reveal>
        </section>
      ) : null}

      <BusinessEssentials record={record} />

      <footer className="bg-[var(--text)] py-10 text-[var(--bg)]">
        <div className="poc-container flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <p className="font-display text-3xl uppercase tracking-tight text-[var(--accent)]">
            {record.wordmark.text.toUpperCase()}
          </p>
          <ConceptNotice
            record={record}
            labelClassName="text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-[#8f8a80]"
            bodyClassName="mt-2 max-w-md text-[12px] leading-relaxed text-[#a8a399]"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
