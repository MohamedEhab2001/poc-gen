import { Clock, Phone, Star } from "lucide-react";
import type { ThemeProps } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";
import { BusinessEssentials } from "@/components/poc/BusinessEssentials";
import { AttributionLine } from "@/components/poc/attribution/AttributionLine";
import { ConceptNotice } from "@/components/poc/ConceptNotice";
import { HoursList } from "@/components/poc/HoursList";
import { MobileActionBar } from "@/components/poc/MobileActionBar";
import { BentoGallery } from "@/components/poc/media/BentoGallery";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { MapSection } from "@/components/poc/map/MapSection";
import { HeroSequence } from "@/components/poc/motion/HeroSequence";
import { LineGrow } from "@/components/poc/motion/LineGrow";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/StaggerGroup";
import { MenuBoard } from "./MenuBoard";
import { display, body } from "./fonts";

/**
 * American Diner: a modernized roadside sign. Split-panel hero — a cream
 * sign panel with oversized slab typography and menu-board metadata against
 * a full-height diagonal photo panel — then a tabbed menu board on navy, an
 * offset photo collage, a navy hours board, a framed location panel, and a
 * full-width roadside closer. Checker rules draw in once; compact,
 * high-energy spacing; nostalgic, never a costume.
 */

function CheckerRule({ delay = 0, className = "" }: { delay?: number; className?: string }) {
  return (
    <LineGrow
      className={`h-2.5 w-full ${className}`}
      delay={delay}
      style={{
        backgroundImage: `repeating-linear-gradient(90deg, var(--bg) 0 12px, var(--primary) 12px 24px)`,
      }}
    />
  );
}

/** Marquee-style category strip; pauses on hover, still under reduced motion via CSS. */
function MarqueeStrip({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const run = items.join("  ★  ");
  return (
    <div className="relative overflow-hidden border-y-2 border-[var(--text)] bg-[var(--accent)] py-2.5" aria-hidden="true">
      <div className="fx-marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <p key={copy} className="whitespace-nowrap px-3 font-display text-[14px] font-bold uppercase tracking-[0.24em] text-[var(--on-accent)]">
            {run}&nbsp;&nbsp;★
          </p>
        ))}
      </div>
    </div>
  );
}

export default function AmericanDinerTheme({ record }: ThemeProps) {
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
    "--radius": "10px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const galleryImages = record.gallery?.images ?? [];
  const hasHeroImage = Boolean(record.hero.image);
  const primary = record.cta.primary;
  const secondary = record.cta.secondary[0] ?? null;
  const marqueeItems = [
    record.identity.primaryCategory,
    ...record.offering.mealTypes.slice(0, 2),
    record.hours?.statusLabel,
  ].filter((item): item is string => Boolean(item));

  const nav = [
    record.menu ? { href: "#menu", label: "Menu" } : null,
    record.about ? { href: "#story", label: "Our place" } : null,
    galleryImages.length > 0 ? { href: "#window", label: "The window" } : null,
    { href: "#visit", label: "Visit" },
  ].filter((item): item is { href: string; label: string } => item !== null);

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      {/* Navy band header */}
      <header className="sticky top-0 z-40 bg-[var(--secondary)] text-[var(--on-secondary)]">
        <div className="poc-container flex h-[62px] items-center justify-between gap-5">
          <a href="#top" className="font-display text-lg tracking-wide">
            {record.wordmark.text}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[12.5px] font-bold uppercase tracking-[0.1em] md:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="opacity-90 transition-opacity hover:opacity-100">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {record.hours?.statusLabel ? (
              <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.08em]">
                <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${record.hours.openNow ? "bg-[var(--accent)]" : "bg-[var(--muted)]"}`} />
                <span className="hidden sm:inline">{record.hours.statusLabel}</span>
                <span className="sm:hidden">Open</span>
              </p>
            ) : null}
            {primary ? (
              <ActionLink
                cta={primary}
                className="bg-[var(--accent)] px-4 py-2 text-[11.5px] font-extrabold uppercase tracking-[0.08em] text-[var(--on-accent)] shadow-[3px_3px_0_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-0.5"
              />
            ) : null}
          </div>
        </div>
        <CheckerRule delay={0.12} />
      </header>

      {/* Split signboard hero */}
      <section id="top" aria-labelledby="hero-heading" className="relative border-b-4 border-[var(--text)]">
        <div className={`grid ${hasHeroImage ? "lg:grid-cols-[1.05fr_1fr]" : ""}`}>
          {/* Sign panel */}
          <div className="relative flex flex-col justify-center bg-[var(--surface)] px-6 py-14 sm:px-10 lg:px-14 lg:py-24">
            <div aria-hidden="true" className="absolute left-0 top-0 h-full w-1.5 bg-[var(--primary)]" />
            <HeroSequence
              steps={[
                record.hero.eyebrow ? (
                  <p key="eyebrow" className="inline-flex items-center gap-3 text-[11.5px] font-extrabold uppercase tracking-[0.28em] text-[var(--primary)]">
                    <span aria-hidden="true" className="inline-block h-px w-8 bg-[var(--primary)]" />
                    {record.hero.eyebrow}
                  </p>
                ) : null,
                <h1
                  key="headline"
                  id="hero-heading"
                  className="mt-5 font-display text-[2.9rem] font-bold uppercase leading-[0.98] tracking-tight text-[var(--text)] sm:text-6xl lg:text-[4.4rem]"
                  style={{ textWrap: "balance" } as React.CSSProperties}
                >
                  {record.hero.headline}
                </h1>,
                record.hero.subheadline ? (
                  <p key="sub" className="mt-6 max-w-[42ch] text-[16px] font-semibold leading-snug text-[var(--muted)]">
                    {record.hero.subheadline}
                  </p>
                ) : null,
                <div key="ctas" className="mt-9 flex flex-wrap items-center gap-4">
                  {primary ? (
                    <ActionLink
                      cta={primary}
                      className="bg-[var(--primary)] px-8 py-4 text-[15px] font-extrabold uppercase tracking-[0.06em] text-[var(--on-primary)] shadow-[6px_6px_0_var(--secondary)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[3px_3px_0_var(--secondary)]"
                    />
                  ) : null}
                  {secondary ? (
                    <ActionLink
                      cta={secondary}
                      className="border-4 border-[var(--secondary)] px-7 py-3.5 text-[14px] font-extrabold uppercase tracking-[0.06em] text-[var(--secondary)] transition-transform hover:-translate-y-0.5"
                    />
                  ) : null}
                </div>,
                record.reputation ? (
                  <p key="rep" className="mt-8 flex items-center gap-2 text-[14px] font-extrabold text-[var(--text)]">
                    <Star size={16} strokeWidth={2} className="fill-[var(--accent)] text-[var(--accent)]" aria-hidden="true" />
                    {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
                  </p>
                ) : null,
              ]}
            />
            {/* Sign footer: hours + phone in menu-board metadata style */}
            <Reveal delay={0.3} className="mt-12 border-t-2 border-dashed border-[var(--border)] pt-5">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">
                {record.hours?.statusLabel ? (
                  <span className="flex items-center gap-2">
                    <Clock size={13} strokeWidth={2} aria-hidden="true" />
                    {record.hours.statusLabel}
                  </span>
                ) : null}
                {record.contact.phone ? (
                  <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-2 transition-colors hover:text-[var(--primary)]">
                    <Phone size={13} strokeWidth={2} aria-hidden="true" />
                    {record.contact.phone}
                  </a>
                ) : null}
                {record.location?.shortAddress ?? record.location?.city ? (
                  <span>{record.location.shortAddress ?? record.location.city}</span>
                ) : null}
              </div>
            </Reveal>
          </div>

          {/* Diagonal photo panel */}
          {record.hero.image ? (
            <div className="relative min-h-[380px] overflow-hidden border-b-4 border-[var(--text)] lg:border-b-0 lg:border-l-4">
              <Reveal media direction="left" delay={0.1} className="absolute inset-0">
                <div
                  className="absolute inset-0"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 96px 100%)" }}
                >
                  <SmartImage
                    image={record.hero.image}
                    priority
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="h-full w-full object-cover"
                  />
                </div>
              </Reveal>
              <div aria-hidden="true" className="absolute inset-0" style={{ clipPath: "polygon(96px 0, 100% 0, 100% 100%, 96px 100%)", backgroundImage: `repeating-linear-gradient(-45deg, transparent 0 16px, rgba(0,0,0,0.06) 16px 32px)` }} />
            </div>
          ) : null}
        </div>
        <MarqueeStrip items={marqueeItems} />
      </section>

      {record.announcement ? (
        <div className="border-b-4 border-[var(--text)] bg-[var(--surface)]">
          <p className="poc-container flex flex-wrap items-center justify-center gap-3 py-3.5 text-center text-[13px] font-extrabold uppercase tracking-[0.08em] text-[var(--secondary)]">
            <span aria-hidden="true">◆</span>
            {record.announcement}
            <span aria-hidden="true">◆</span>
          </p>
        </div>
      ) : null}

      {/* Story + counter items */}
      {record.about || record.services.length + record.amenities.length > 0 ? (
        <section id="story" aria-labelledby="story-heading" className="bg-[var(--surface)] py-16 md:py-20">
          <div className="poc-container grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <Reveal>
                <p className="inline-block -rotate-1 bg-[var(--primary)] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[var(--on-primary)]">
                  Our place
                </p>
                <h2 id="story-heading" className="mt-5 font-display text-4xl font-bold uppercase leading-[1.02] tracking-tight text-[var(--text)] md:text-5xl">
                  {record.about?.title ?? "The spot on the block"}
                </h2>
              </Reveal>
            </div>
            <div className="lg:col-span-6">
              {record.about ? (
                <Reveal delay={0.1}>
                  <p className="max-w-[54ch] text-[15.5px] font-medium leading-[1.85] text-[var(--muted)]">{record.about.body}</p>
                </Reveal>
              ) : null}
              {record.services.length + record.amenities.length > 0 ? (
                <StaggerGroup as="ul" className={`grid gap-px border-2 border-[var(--text)] bg-[var(--text)] sm:grid-cols-2 ${record.about ? "mt-8" : ""}`} gap={0}>
                  {[...record.services, ...record.amenities].slice(0, 6).map((item, index) => (
                    <StaggerItem
                      as="li"
                      key={item.key + item.label}
                      className="flex items-center gap-3 bg-[var(--surface)] px-4 py-3.5 text-[13px] font-extrabold uppercase tracking-[0.05em] text-[var(--text)]"
                    >
                      <span className="font-mono text-[10.5px] text-[var(--primary)]" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {item.label}
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* Menu board */}
      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="border-y-4 border-[var(--text)] bg-[var(--secondary)] py-16 text-[var(--on-secondary)] md:py-20">
          <div className="poc-container">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <h2 id="menu-heading" className="font-display text-4xl font-bold uppercase tracking-tight md:text-5xl">
                The Menu Board
              </h2>
              {record.menu.notice ? (
                <p className="max-w-xs text-[12px] font-bold uppercase leading-relaxed tracking-[0.06em] opacity-80" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                  {record.menu.notice}
                </p>
              ) : (
                <div className="w-32 border-2 border-[var(--on-secondary)]/60 p-0.5">
                  <CheckerRule delay={0.1} />
                </div>
              )}
            </Reveal>
            <Reveal delay={0.06} className="mx-auto mt-10 max-w-4xl">
              <MenuBoard menu={record.menu} />
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* The window: offset photo collage */}
      {galleryImages.length > 0 ? (
        <section id="window" aria-labelledby="window-heading" className="poc-container py-16 md:py-20">
          <Reveal className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 id="window-heading" className="font-display text-3xl font-bold uppercase tracking-tight text-[var(--text)] md:text-4xl">
              {record.gallery?.title ?? "The window"}
            </h2>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
              {record.identity.shortName} · photo strip
            </p>
          </Reveal>
          <div className="mt-8">
            <BentoGallery
              images={galleryImages}
              renderCaption={(image, index) => (
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--muted)]">
                  No. {String(index + 1).padStart(2, "0")} — {trimCaption(image.alt)}
                </span>
              )}
            />
          </div>
        </section>
      ) : null}

      {/* Reviews: speech cards from the counter */}
      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="border-t-4 border-[var(--text)] bg-[var(--accent)]/15 py-16 md:py-20">
          <div className="poc-container">
            <Reveal>
              <h2 id="reviews-heading" className="text-center font-display text-3xl font-bold uppercase tracking-tight text-[var(--text)] md:text-4xl">
                Kind words from the counter
              </h2>
              <div className="mx-auto mt-5 w-40">
                <CheckerRule delay={0.15} />
              </div>
            </Reveal>
            <StaggerGroup className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3" gap={0.1}>
              {record.reputation.reviews.slice(0, 3).map((review, index) => (
                <StaggerItem key={review.id} className={index === 1 ? "md:translate-y-4" : ""}>
                  <figure className="relative h-full border-4 border-[var(--text)] bg-[var(--surface)] p-6 pt-7 shadow-[6px_6px_0_var(--text)]">
                    <span aria-hidden="true" className="absolute -top-3.5 left-5 bg-[var(--accent)] px-2 py-0.5 font-display text-[12px] font-bold uppercase tracking-[0.1em] text-[var(--on-accent)]">
                      {review.rating} ★
                    </span>
                    <blockquote className="text-[14.5px] font-semibold leading-relaxed text-[var(--text)]">
                      &ldquo;{review.text}&rdquo;
                    </blockquote>
                    <figcaption className="mt-4 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--primary)]">
                      {review.authorName}
                      {review.publishedAt ? (
                        <span className="ml-2 font-mono font-medium normal-case tracking-normal text-[var(--muted)]">
                          {new Date(review.publishedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </span>
                      ) : null}
                    </figcaption>
                    {review.attribution ? (
                      <AttributionLine attribution={review.attribution} className="mt-1 block text-[10px] text-[var(--muted)]" />
                    ) : null}
                  </figure>
                </StaggerItem>
              ))}
            </StaggerGroup>
            {record.reputation.reviewsUrl ? (
              <p className="mt-10 text-center">
                <a href={record.reputation.reviewsUrl} target="_blank" rel="noopener noreferrer" className="inline-block border-b-2 border-[var(--primary)] pb-0.5 text-[12.5px] font-extrabold uppercase tracking-[0.1em] text-[var(--primary)]">
                  Read more reviews
                </a>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Hours board + location panel */}
      <section id="visit" aria-labelledby="visit-heading" className="poc-container grid gap-10 py-16 md:py-20 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Reveal>
            <h2 id="visit-heading" className="font-display text-3xl font-bold uppercase tracking-tight text-[var(--text)] md:text-4xl">
              Pull up a stool
            </h2>
            <div className="mt-4 w-36">
              <CheckerRule delay={0.12} />
            </div>
          </Reveal>
          {record.hours ? (
            <Reveal delay={0.1} className="mt-8">
              <div className="border-4 border-[var(--text)] bg-[var(--secondary)] p-6 text-[var(--on-secondary)] shadow-[8px_8px_0_var(--text)]">
                <p className="flex items-center gap-2 font-display text-lg font-bold uppercase tracking-[0.06em]">
                  <Clock size={17} strokeWidth={2} aria-hidden="true" /> Hours
                </p>
                <LineGrow className="mt-3 h-0.5 w-16 bg-[var(--accent)]" delay={0.2} />
                <HoursList hours={record.hours} className="mt-4 space-y-1.5 font-mono text-[12.5px] font-semibold uppercase tracking-[0.04em]" />
              </div>
            </Reveal>
          ) : null}
          {record.contact.phone ? (
            <Reveal delay={0.16}>
              <p className="mt-6 flex items-center gap-2.5 text-[15px] font-extrabold text-[var(--text)]">
                <Phone size={16} strokeWidth={2} className="text-[var(--primary)]" aria-hidden="true" />
                <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="transition-colors hover:text-[var(--primary)]">
                  {record.contact.phone}
                </a>
              </p>
            </Reveal>
          ) : null}
          {record.contact.socials.length > 0 ? (
            <Reveal delay={0.2}>
              <ul className="mt-4 flex flex-wrap gap-3">
                {record.contact.socials.map((social) => (
                  <li key={social.url}>
                    <a href={social.url} target="_blank" rel="noopener noreferrer" className="inline-block border-2 border-[var(--text)] px-3.5 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[var(--secondary)] transition-transform hover:-translate-y-0.5">
                      {social.label ?? social.platform}
                    </a>
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}
        </div>
        {record.location ? (
          <Reveal delay={0.12} className="lg:col-span-7">
            <MapSection
              location={record.location}
              businessName={record.identity.name}
              directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
              embedClassName="h-full min-h-[360px] w-full border-4 border-[var(--text)] shadow-[8px_8px_0_var(--text)]"
              cardClassName="border-4 border-[var(--text)] bg-[var(--surface)] p-8"
              addressClassName="text-[13px] font-bold text-[var(--text)]"
              buttonClassName="bg-[var(--primary)] px-6 py-3 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[var(--on-primary)] shadow-[4px_4px_0_var(--text)] transition-transform hover:-translate-y-0.5"
            />
          </Reveal>
        ) : null}
      </section>

      <BusinessEssentials record={record} />

      {/* Roadside closer */}
      {primary ? (
        <section aria-label="Final call to action" className="border-t-4 border-[var(--text)] bg-[var(--primary)] py-14 text-center text-[var(--on-primary)]">
          <Reveal>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] opacity-80">
              {record.hours?.statusLabel ?? record.identity.primaryCategory}
            </p>
            <h2 className="mt-4 font-display text-5xl font-bold uppercase leading-none tracking-tight md:text-6xl">
              {primary.kind === "order" ? "Order ahead" : primary.kind === "call" ? "Give us a ring" : "Come hungry"}
            </h2>
            <div className="mt-8 flex justify-center">
              <ActionLink
                cta={primary}
                className="border-4 border-[var(--text)] bg-[var(--accent)] px-10 py-4 text-[15px] font-extrabold uppercase tracking-[0.06em] text-[var(--on-accent)] shadow-[6px_6px_0_var(--text)] transition-transform hover:-translate-y-1 active:translate-y-0.5 active:shadow-[3px_3px_0_var(--text)]"
              />
            </div>
          </Reveal>
        </section>
      ) : null}

      {/* Bold footer */}
      <footer className="bg-[var(--secondary)] pb-12 text-[var(--on-secondary)]">
        <CheckerRule delay={0.1} />
        <div className="poc-container flex flex-col items-start justify-between gap-6 pt-10 md:flex-row md:items-center">
          <p className="font-display text-3xl font-bold uppercase tracking-wide">{record.wordmark.text}</p>
          <ConceptNotice
            record={record}
            labelClassName="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-[var(--on-secondary)]/60"
            bodyClassName="mt-2 max-w-md text-[12.5px] leading-relaxed text-[var(--on-secondary)]/75 md:text-right"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}

function trimCaption(alt: string): string {
  const first = alt.split(/(?<=[.!?])\s/)[0] ?? alt;
  return first.length > 58 ? `${first.slice(0, 55).trimEnd()}…` : first;
}
