import { ArrowUpRight, Star } from "lucide-react";
import type { ThemeProps } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";
import { BusinessEssentials } from "@/components/poc/BusinessEssentials";
import { AttributionLine } from "@/components/poc/attribution/AttributionLine";
import { ConceptNotice } from "@/components/poc/ConceptNotice";
import { HoursList } from "@/components/poc/HoursList";
import { MobileActionBar } from "@/components/poc/MobileActionBar";
import { ImageChapter } from "@/components/poc/media/ImageChapter";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { MapSection } from "@/components/poc/map/MapSection";
import { AnimatedWordmark } from "@/components/poc/motion/AnimatedWordmark";
import { HeroSequence } from "@/components/poc/motion/HeroSequence";
import { LineGrow } from "@/components/poc/motion/LineGrow";
import { MaskedImageReveal } from "@/components/poc/media/MaskedImageReveal";
import { ParallaxMedia } from "@/components/poc/motion/ParallaxMedia";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/StaggerGroup";
import { display, body } from "./fonts";

/**
 * Luxury Fine Dining: cinematic chapters in dark ink. A full-bleed parallax
 * hero with bottom-left composition (never a centered title over an
 * overlay), a masked-image story split, a sticky-rail menu of numbered
 * courses, an immersive full-bleed image chapter, one quiet reputation
 * line, and an elegant information panel beside a darkened map. Luxury
 * comes from spacing, typography, and restraint — slow fades only, no
 * springs, no glow.
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
    "--on-primary": p.onPrimary,
    "--on-secondary": p.onSecondary,
    "--on-accent": p.onAccent,
    "--radius": "0px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const primary = record.cta.primary ?? record.cta.secondary[0] ?? null;
  const secondaryCta = record.cta.primary ? record.cta.secondary[0] ?? null : null;
  const gallery = record.gallery?.images ?? [];
  const menuSections = record.menu?.sections ?? [];
  const storyImage = gallery[0] ?? null;
  const chapterImage = gallery[1] ?? gallery[0] ?? null;

  const nav = [
    record.menu ? { href: "#menu", label: "Menu" } : null,
    gallery.length > 0 ? { href: "#rooms", label: "The room" } : null,
    { href: "#reserve", label: primary?.kind === "reserve" ? "Reserve" : "Visit" },
  ].filter((item): item is { href: string; label: string } => item !== null);

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      {/* Discreet nav over the hero */}
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#111110]/55 backdrop-blur-sm">
        <div className="poc-container flex h-[64px] items-center justify-between">
          <a href="#hero" className="text-[14px] uppercase tracking-[0.34em] text-[var(--text)]">
            {record.wordmark.text}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-9 text-[11px] uppercase tracking-[0.24em] text-[var(--muted)] md:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-[var(--accent)]">
                {item.label}
              </a>
            ))}
          </nav>
          {primary ? (
            <ActionLink
              cta={primary}
              className="border border-[var(--accent)]/70 px-5 py-2 text-[10.5px] uppercase tracking-[0.24em] text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
            />
          ) : (
            <span aria-hidden="true" className="w-10 border-t border-[var(--accent)]/50" />
          )}
        </div>
      </header>

      {/* Cinematic hero: full-bleed, bottom-left composition */}
      <section id="hero" aria-labelledby="hero-heading" className="relative min-h-[100dvh]">
        {record.hero.image ? (
          <ParallaxMedia className="absolute inset-0" distance={64}>
            <div className="absolute inset-x-0 -top-[6%] h-[112%]">
              <SmartImage
                image={record.hero.image}
                priority
                fill
                sizes="100vw"
                className="h-full w-full object-cover"
              />
            </div>
            <div aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(200deg, rgba(17,17,16,0.25) 0%, rgba(17,17,16,0.15) 40%, rgba(17,17,16,0.88) 100%)" }} />
          </ParallaxMedia>
        ) : (
          <div aria-hidden="true" className="absolute inset-0 bg-[var(--bg)]" />
        )}
        <div className="relative flex min-h-[100dvh] flex-col justify-end px-6 pb-16 pt-32 sm:px-10 lg:px-14 lg:pb-20">
          <div className="poc-container-wide">
            <HeroSequence
              steps={[
                <p key="eyebrow" className="flex items-center gap-4 text-[11px] uppercase tracking-[0.42em] text-[var(--accent)]">
                  {record.hero.eyebrow ?? record.identity.primaryCategory}
                  <span aria-hidden="true" className="hidden h-px w-16 bg-[var(--accent)]/60 sm:block" />
                  {record.location?.city ? <span className="text-[#b9b2a2]">{record.location.city}</span> : null}
                </p>,
                <h1
                  key="headline"
                  id="hero-heading"
                  className="mt-7 max-w-[14ch] font-display text-[2.9rem] leading-[1.06] text-[#f3efe6] sm:text-6xl lg:text-[4.6rem]"
                  style={{ textWrap: "balance" } as React.CSSProperties}
                >
                  <AnimatedWordmark text={record.hero.headline} wordClassName="inline-block overflow-hidden align-baseline pb-[0.1em] -mb-[0.1em]" delay={0.15} />
                </h1>,
                <div key="sub-row" className="mt-8 flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
                  <div>
                    {record.hero.subheadline ? (
                      <p className="max-w-[44ch] text-[14px] font-light leading-[2] tracking-[0.04em] text-[#d8d2c4]">
                        {record.hero.subheadline}
                      </p>
                    ) : null}
                    {record.offering.priceRange ? (
                      <p className="mt-4 text-[11px] uppercase tracking-[0.32em] text-[var(--muted)]">
                        {record.offering.priceRange}
                      </p>
                    ) : null}
                  </div>
                  {record.reputation ? (
                    <p className="flex items-center gap-2.5 text-[12px] tracking-[0.14em] text-[#b9b2a2]">
                      <Star size={13} strokeWidth={1.5} className="text-[var(--accent)]" aria-hidden="true" />
                      {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
                    </p>
                  ) : null}
                </div>,
                primary || secondaryCta ? (
                  <div key="ctas" className="mt-10 flex flex-wrap items-center gap-4">
                    {primary ? (
                      <ActionLink
                        cta={primary}
                        className="group inline-flex items-center gap-3 border border-[var(--accent)] px-9 py-4 text-[11px] uppercase tracking-[0.3em] text-[var(--accent)] transition-colors duration-500 hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
                      >
                        {primary.label}
                        <ArrowUpRight size={13} strokeWidth={1.5} aria-hidden="true" className="transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </ActionLink>
                    ) : null}
                    {secondaryCta ? (
                      <ActionLink
                        cta={secondaryCta}
                        className="border-b border-[#d8d2c4]/50 pb-1.5 text-[11px] uppercase tracking-[0.3em] text-[#d8d2c4] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      />
                    ) : null}
                  </div>
                ) : null,
              ]}
            />
          </div>
        </div>
      </section>

      {/* Story: masked image split */}
      {record.about ? (
        <section aria-labelledby="about-heading" className="bg-[var(--bg)] py-24 md:py-36">
          <div className="poc-container grid items-center gap-14 lg:grid-cols-12">
            {storyImage ? (
              <div className="relative lg:col-span-5">
                <div aria-hidden="true" className="absolute -bottom-4 -right-4 h-full w-full border border-[var(--accent)]/30" />
                <MaskedImageReveal from="bottom" inset="8% 6%" className="relative">
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <SmartImage
                      image={storyImage}
                      fill
                      sizes="(min-width: 1024px) 40vw, 100vw"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </MaskedImageReveal>
              </div>
            ) : null}
            <div className={storyImage ? "lg:col-span-6 lg:col-start-7" : "mx-auto max-w-2xl text-center"}>
              <Reveal>
                <LineGrow className="mx-auto h-px w-16 bg-[var(--accent)] lg:mx-0" origin={storyImage ? "left" : "center"} />
                <h2 id="about-heading" className="mt-8 font-display text-[1.7rem] leading-[1.5] text-[#f3efe6] md:text-[2.1rem]">
                  {record.about.title}
                </h2>
                <p className={`mt-7 text-[14px] font-light leading-[2.1] tracking-[0.02em] text-[#a89f8d] ${storyImage ? "" : "text-left"}`}>
                  {record.about.body}
                </p>
                {record.services.length + record.amenities.length > 0 ? (
                  <p className={`mt-8 text-[10.5px] uppercase tracking-[0.3em] text-[#8d8574] ${storyImage ? "" : "text-center"}`}>
                    {[...record.services, ...record.amenities].slice(0, 5).map((item) => item.label).join("  ·  ")}
                  </p>
                ) : null}
              </Reveal>
            </div>
          </div>
        </section>
      ) : null}

      {/* Menu: numbered courses on a sticky rail */}
      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="border-t border-[var(--border)] py-24 md:py-32">
          <div className="poc-container grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <Reveal>
                  <p className="text-[10.5px] uppercase tracking-[0.4em] text-[var(--accent)]">
                    {record.menu.mode === "sample" ? "A recent menu" : "The menu"}
                  </p>
                  <h2 id="menu-heading" className="mt-5 font-display text-4xl text-[#f3efe6] md:text-5xl">
                    Courses
                  </h2>
                  <LineGrow className="mt-6 h-px w-16 bg-[var(--accent)]" delay={0.15} />
                  {record.offering.priceRange ? (
                    <p className="mt-6 text-[11.5px] font-light tracking-[0.14em] text-[#8d8574]">{record.offering.priceRange}</p>
                  ) : null}
                  {record.menu.notice ? (
                    <p className="mt-6 max-w-xs text-[12px] font-light leading-relaxed tracking-[0.04em] text-[#8d8574]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                      {record.menu.notice}
                    </p>
                  ) : null}
                  {menuSections.length > 1 ? (
                    <ul className="mt-10 hidden space-y-3 lg:block">
                      {menuSections.map((section, index) => (
                        <li key={section.id}>
                          <a href={`#${section.id}`} className="group flex items-baseline gap-4 text-[12px] uppercase tracking-[0.2em] text-[#8d8574] transition-colors hover:text-[var(--accent)]">
                            <span className="font-display text-[13px] text-[var(--accent)]/70">{String(index + 1).padStart(2, "0")}</span>
                            <span className="border-b border-transparent pb-0.5 transition-colors group-hover:border-[var(--accent)]/50">
                              {section.name}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Reveal>
              </div>
            </div>
            <StaggerGroup className={`space-y-20 lg:col-span-7 lg:col-start-6 ${menuSections.length === 1 ? "lg:col-start-6" : ""}`} gap={0.25} amount={0.05}>
              {menuSections.map((section, index) => (
                <StaggerItem key={section.id}>
                  <article id={section.id} className="scroll-mt-28">
                    <div className="flex items-baseline gap-6">
                      <span className="font-display text-[15px] tracking-[0.2em] text-[var(--accent)]/80" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-[13px] uppercase tracking-[0.4em] text-[var(--accent)]">
                        {section.name}
                      </h3>
                    </div>
                    {section.description ? (
                      <p className="mt-3 pl-10 text-[13px] font-light italic tracking-[0.05em] text-[#8d8574]">
                        {section.description}
                      </p>
                    ) : null}
                    <ul className="mx-auto mt-10 max-w-xl space-y-9">
                      {section.items.map((item) => (
                        <li key={item.id} className="group text-center">
                          <p className="font-display text-[19px] tracking-[0.03em] text-[#e8e2d3] transition-colors duration-500 group-hover:text-[var(--accent)]">
                            {item.name}
                            {item.featured ? (
                              <span className="ml-3 align-middle text-[9px] uppercase tracking-[0.3em] text-[var(--accent)]/80">Signature</span>
                            ) : null}
                          </p>
                          {item.description ? (
                            <p className="mx-auto mt-2 max-w-sm text-[12.5px] font-light leading-relaxed text-[#8d8574]">
                              {item.description}
                            </p>
                          ) : null}
                          {item.price ? (
                            <p className="mt-2.5 text-[11.5px] tracking-[0.24em] text-[var(--accent)]">{item.price}</p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </article>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      ) : null}

      {/* Immersive image chapter */}
      {chapterImage ? (
        <section id="rooms" aria-label="The room" className="relative">
          <ImageChapter
            image={chapterImage}
            index={1}
            caption={record.gallery?.title ?? chapterImage.alt}
            heightClass="h-[72vh] min-h-[440px]"
            variant="masked"
          />
          {gallery.length > 2 ? (
            <div className="poc-container mt-6 grid grid-cols-2 gap-5 pb-24 md:grid-cols-3 [&>*:nth-child(3)]:col-span-2 md:[&>*:nth-child(3)]:col-span-1">
              {gallery.slice(2, 5).map((image, index) => (
                <Reveal key={image.url} media delay={index * 0.05}>
                  <figure>
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <SmartImage
                        image={image}
                        fill
                        sizes="(min-width: 1024px) 33vw, 50vw"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    {image.attribution ? (
                      <AttributionLine attribution={image.attribution} className="mt-2 text-[10px] tracking-[0.08em] text-[#6f685a]" />
                    ) : null}
                  </figure>
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="pb-16" />
          )}
        </section>
      ) : null}

      {/* Reputation: one quiet line */}
      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="border-t border-[var(--border)] py-24 md:py-32">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 id="reviews-heading" className="sr-only">
              Guest words
            </h2>
            <StaggerGroup className="space-y-16" gap={0.3} amount={0.1}>
              {record.reputation.reviews.slice(0, 2).map((review) => (
                <StaggerItem as="figure" key={review.id} className="block">
                  <p aria-hidden="true" className="font-display text-[4rem] leading-[0.3] text-[var(--accent)]/50">
                    &ldquo;
                  </p>
                  <blockquote className="mt-6 font-display text-[22px] font-light leading-[1.75] tracking-[0.02em] text-[#e8e2d3]">
                    {review.text}
                  </blockquote>
                  <figcaption className="mt-6 text-[10.5px] uppercase tracking-[0.36em] text-[var(--accent)]">
                    {review.authorName}
                  </figcaption>
                  {review.attribution ? (
                    <AttributionLine attribution={review.attribution} className="mt-2 text-[10px] text-[#6f685a]" />
                  ) : null}
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      ) : null}

      {/* Information panel + darkened map */}
      <section id="reserve" aria-labelledby="reserve-heading" className="border-t border-[var(--border)] py-24 md:py-32">
        <div className="poc-container grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <Reveal>
              <LineGrow className="h-px w-16 bg-[var(--accent)]" origin="left" />
              <h2 id="reserve-heading" className="mt-8 font-display text-[1.9rem] text-[#f3efe6]">
                {primary?.kind === "reserve" ? "Reservations" : "Information"}
              </h2>
              {record.hours ? (
                <div className="mt-10">
                  <p className="mb-5 text-[10.5px] uppercase tracking-[0.34em] text-[var(--accent)]">Hours</p>
                  <HoursList hours={record.hours} className="space-y-2.5 text-[13px] font-light leading-loose tracking-[0.03em] text-[#a89f8d]" />
                </div>
              ) : null}
              <div className="mt-10 space-y-2.5 text-[13px] font-light tracking-[0.03em] text-[#a89f8d]">
                {record.location?.formattedAddress ? <p>{record.location.formattedAddress}</p> : null}
                {record.contact.phone ? (
                  <p>
                    <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="transition-colors hover:text-[var(--accent)]">
                      {record.contact.phone}
                    </a>
                  </p>
                ) : null}
                {record.contact.email ? (
                  <p>
                    <a href={`mailto:${record.contact.email}`} className="transition-colors hover:text-[var(--accent)]">
                      {record.contact.email}
                    </a>
                  </p>
                ) : null}
              </div>
              {primary ? (
                <ActionLink
                  cta={primary}
                  className="mt-12 inline-block border border-[var(--accent)] px-9 py-3.5 text-[11px] uppercase tracking-[0.3em] text-[var(--accent)] transition-colors duration-500 hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
                />
              ) : null}
            </Reveal>
          </div>
          {record.location ? (
            <Reveal delay={0.15} className="lg:col-span-7">
              <div className="relative border border-[var(--border)] bg-[var(--surface)] p-3">
                <MapSection
                  location={record.location}
                  businessName={record.identity.name}
                  directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                  embedClassName="h-[400px] w-full border border-[var(--border)] grayscale-[45%]"
                  cardClassName="p-8"
                  addressClassName="text-[12.5px] font-light tracking-[0.06em] text-[#a89f8d]"
                  buttonClassName="border border-[var(--accent)] px-6 py-3 text-[10.5px] uppercase tracking-[0.26em] text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--on-accent)]"
                  detailsClassName="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-[var(--border)] pt-4"
                />
              </div>
            </Reveal>
          ) : null}
        </div>
      </section>

      <BusinessEssentials record={record} />

      {/* Minimal large-type footer */}
      <footer className="border-t border-[var(--border)] py-16 md:py-20">
        <div className="poc-container flex flex-col items-start justify-between gap-10 md:flex-row md:items-end">
          <div>
            <p className="font-display text-[2.4rem] leading-none text-[#f3efe6] md:text-[3.2rem]">
              <AnimatedWordmark text={record.wordmark.text} wordClassName="inline-block overflow-hidden align-baseline pb-[0.1em] -mb-[0.1em]" />
            </p>
            {record.contact.socials.length > 0 ? (
              <ul className="mt-8 flex flex-wrap gap-x-7 gap-y-2">
                {record.contact.socials.map((social) => (
                  <li key={social.url}>
                    <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-[10.5px] uppercase tracking-[0.3em] text-[#8d8574] transition-colors hover:text-[var(--accent)]">
                      {social.label ?? social.platform}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
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
