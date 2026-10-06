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
import { AnimatedWordmark } from "@/components/poc/motion/AnimatedWordmark";
import { AnimeOrnament } from "@/components/poc/motion/AnimeOrnament";
import { EnterOnce } from "@/components/poc/motion/EnterOnce";
import { LineGrow } from "@/components/poc/motion/LineGrow";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/StaggerGroup";
import { display, body } from "./fonts";

/**
 * Sunburst crest. The rays and ring carry data-anime="draw" so Anime.js
 * stroke-draws the crest once on entry (scoped, reverted on unmount); the
 * crest is fully present in the SSR markup and never rotates continuously.
 */
function FanCrest({ size = 56 }: { size?: number }) {
  const rays = Array.from({ length: 12 }, (_, index) => index * 30);
  return (
    <AnimeOrnament variant="draw" durationMs={1600} staggerMs={70} className="shrink-0">
      <svg
        viewBox="-50 -50 100 100"
        width={size}
        height={size}
        aria-hidden="true"
      >
        {rays.map((angle) => (
          <line
            key={angle}
            x1="0"
            y1="-10"
            x2="0"
            y2="-38"
            stroke="var(--primary)"
            strokeWidth={angle % 90 === 0 ? 3 : 1.6}
            transform={`rotate(${angle})`}
            data-anime="draw"
          />
        ))}
        <circle r="7" fill="none" stroke="var(--primary)" strokeWidth="2" data-anime="draw" />
        <circle r="2.6" fill="var(--primary)" />
      </svg>
    </AnimeOrnament>
  );
}

/** Deco frame: double hairline with stepped corner blocks. */
function DecoFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative border border-[var(--primary)]/70 p-2 ${className}`}>
      <span aria-hidden="true" className="absolute -left-[3px] -top-[3px] h-1.5 w-1.5 bg-[var(--primary)]" />
      <span aria-hidden="true" className="absolute -right-[3px] -top-[3px] h-1.5 w-1.5 bg-[var(--primary)]" />
      <span aria-hidden="true" className="absolute -bottom-[3px] -left-[3px] h-1.5 w-1.5 bg-[var(--primary)]" />
      <span aria-hidden="true" className="absolute -bottom-[3px] -right-[3px] h-1.5 w-1.5 bg-[var(--primary)]" />
      <div className="border border-[var(--primary)]/35">{children}</div>
    </div>
  );
}

/** Symmetric divider: lines growing outward from a center diamond. */
function DecoDivider() {
  return (
    <div className="mx-auto flex max-w-2xl items-center gap-4 px-8" aria-hidden="true">
      <LineGrow className="h-px flex-1 bg-[var(--primary)]/60" origin="right" />
      <span className="h-2 w-2 rotate-45 border border-[var(--primary)]" />
      <LineGrow className="h-px flex-1 bg-[var(--primary)]/60" delay={0.15} />
    </div>
  );
}

/**
 * Deco Supper Club: gilded-age nightlife. Symmetric marquee masthead whose
 * fan crests stroke-draw once (Anime.js), champagne-gold rules that draw
 * themselves in, stepped deco frames, oxblood accents, and slow symmetric
 * ornamental entrances. Major ornaments never rotate continuously.
 */
export default function DecoSupperClubTheme({ record }: ThemeProps) {
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
      {/* Symmetric marquee masthead */}
      <header className="border-b border-[var(--primary)]/40">
        <EnterOnce from={{ y: -8 }} className="poc-container flex flex-col items-center gap-3 pb-6 pt-8">
          <div className="flex items-center gap-5">
            <FanCrest size={44} />
            <p className="font-display text-3xl uppercase tracking-[0.3em] text-[var(--text)] md:text-4xl">
              <AnimatedWordmark text={record.wordmark.text} wordClassName="inline-block overflow-hidden align-baseline" />
            </p>
            <FanCrest size={44} />
          </div>
          <nav aria-label="Primary" className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11.5px] uppercase tracking-[0.3em] text-[var(--muted)]">
            {record.menu ? <a href="#menu" className="hover:text-[var(--primary)]">Supper</a> : null}
            {record.gallery ? <a href="#room" className="hover:text-[var(--primary)]">The room</a> : null}
            <a href="#evening" className="hover:text-[var(--primary)]">The evening</a>
          </nav>
          {record.hours?.statusLabel ? (
            <p className="border border-[var(--primary)]/50 px-4 py-1 text-[11px] uppercase tracking-[0.24em] text-[var(--primary)]">
              {record.hours.statusLabel}
            </p>
          ) : null}
        </EnterOnce>
      </header>

      {/* Centered symmetric hero */}
      <section aria-labelledby="hero-heading" className="poc-container py-14 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          {record.hero.eyebrow ? (
            <Reveal>
              <p className="mb-5 text-[12px] uppercase tracking-[0.42em] text-[var(--primary)]">
                {record.hero.eyebrow}
              </p>
            </Reveal>
          ) : null}
          <Reveal delay={0.1}>
            <h1
              id="hero-heading"
              className="font-display text-[2.7rem] uppercase leading-[1.08] tracking-[0.06em] text-[var(--text)] md:text-6xl"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              <AnimatedWordmark text={record.hero.headline} wordClassName="inline-block overflow-hidden align-baseline pb-[0.12em] -mb-[0.12em]" delay={0.15} />
            </h1>
          </Reveal>
          <div className="mt-7">
            <DecoDivider />
          </div>
          {record.hero.subheadline ? (
            <Reveal delay={0.2}>
              <p className="mx-auto mt-7 max-w-[52ch] text-[15px] leading-[1.9] text-[var(--muted)]">
                {record.hero.subheadline}
              </p>
            </Reveal>
          ) : null}
          <Reveal delay={0.28}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
              {record.cta.primary ? (
                <ActionLink
                  cta={record.cta.primary}
                  className="border border-[var(--primary)] bg-[var(--primary)] px-9 py-3.5 text-[12.5px] uppercase tracking-[0.26em] text-[var(--on-primary)] transition-all duration-500 hover:bg-transparent hover:text-[var(--primary)]"
                />
              ) : null}
              {record.cta.secondary[0] ? (
                <ActionLink
                  cta={record.cta.secondary[0]}
                  className="border border-[var(--primary)]/60 px-8 py-3 text-[12.5px] uppercase tracking-[0.26em] text-[var(--primary)] transition-colors hover:border-[var(--primary)]"
                />
              ) : null}
            </div>
          </Reveal>
          {record.reputation ? (
            <Reveal delay={0.34}>
              <p className="mt-8 flex items-center justify-center gap-2 text-[12.5px] uppercase tracking-[0.18em] text-[var(--muted)]">
                <Star size={13} strokeWidth={1.5} className="text-[var(--primary)]" aria-hidden="true" />
                {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
              </p>
            </Reveal>
          ) : null}
        </div>
        {record.hero.image ? (
          <Reveal delay={0.15} className="mx-auto mt-14 max-w-4xl">
            <DecoFrame>
              <SmartImage
                image={record.hero.image}
                priority
                width={1400}
                height={860}
                sizes="(min-width: 928px) 928px, 100vw"
                className="h-auto w-full object-cover"
                attributionClassName="mt-2 text-center text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]"
              />
            </DecoFrame>
          </Reveal>
        ) : null}
      </section>

      {record.announcement ? (
        <div className="border-y border-[var(--primary)]/40 bg-[var(--secondary)]/15 py-4">
          <p className="poc-container text-center text-[13px] uppercase tracking-[0.2em] text-[var(--text)]">
            {record.announcement}
          </p>
        </div>
      ) : null}

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="poc-container py-16 md:py-24">
          <div className="text-center">
            <Reveal>
              <h2 id="menu-heading" className="font-display text-4xl uppercase tracking-[0.14em] text-[var(--text)]">
                The Supper Card
              </h2>
            </Reveal>
            <div className="mt-6">
              <DecoDivider />
            </div>
            {record.menu.notice ? (
              <p className="mx-auto mt-5 max-w-md text-[12.5px] italic text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                {record.menu.notice}
              </p>
            ) : null}
          </div>
          <StaggerGroup className="mx-auto mt-12 grid max-w-4xl gap-x-14 gap-y-12 md:grid-cols-2" gap={0.14}>
            {record.menu.sections.map((section) => (
              <StaggerItem key={section.id}>
                <div className="text-center">
                  <h3 className="font-display text-2xl uppercase tracking-[0.16em] text-[var(--primary)]">
                    {section.name}
                  </h3>
                  {section.description ? (
                    <p className="mt-1 text-[12px] uppercase tracking-[0.2em] text-[var(--muted)]">
                      {section.description}
                    </p>
                  ) : null}
                  <LineGrow className="mx-auto mt-4 h-px w-16 bg-[var(--primary)]/70" origin="center" />
                </div>
                <ul className="mt-6 space-y-5">
                  {section.items.map((item) => (
                    <li key={item.id} className="text-center">
                      <div className="flex items-baseline justify-center gap-3">
                        <span className="font-display text-[19px] uppercase tracking-[0.08em] text-[var(--text)]">
                          {item.name}
                        </span>
                        {item.price ? (
                          <span className="text-[13px] tracking-[0.1em] text-[var(--primary)]">{item.price}</span>
                        ) : null}
                      </div>
                      {item.description ? (
                        <p className="mx-auto mt-1 max-w-[40ch] text-[13px] leading-relaxed text-[var(--muted)]">
                          {item.description}
                          {item.tags.length > 0 ? ` (${item.tags.join(", ")})` : ""}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      ) : null}

      {record.gallery ? (
        <section id="room" aria-labelledby="room-heading" className="border-y border-[var(--primary)]/30 py-16 md:py-24">
          <div className="poc-container">
            <div className="text-center">
              <Reveal>
                <h2 id="room-heading" className="font-display text-4xl uppercase tracking-[0.14em] text-[var(--text)]">
                  {record.gallery.title ?? "The room"}
                </h2>
              </Reveal>
              <div className="mt-6">
                <DecoDivider />
              </div>
            </div>
            <StaggerGroup className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4" gap={0.12}>
              {record.gallery.images.slice(0, 4).map((image) => (
                <StaggerItem key={image.url}>
                  <DecoFrame>
                    <SmartImage
                      image={image}
                      width={560}
                      height={520}
                      sizes="(min-width: 1024px) 22vw, 46vw"
                      className="h-auto w-full object-cover"
                      attributionClassName="mt-2 text-center text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]"
                    />
                  </DecoFrame>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="poc-container py-16 md:py-24">
          <div className="text-center">
            <Reveal>
              <h2 id="reviews-heading" className="font-display text-4xl uppercase tracking-[0.14em] text-[var(--text)]">
                Word from the room
              </h2>
            </Reveal>
            <div className="mt-6">
              <DecoDivider />
            </div>
          </div>
          <StaggerGroup className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3" gap={0.15}>
            {record.reputation.reviews.slice(0, 3).map((review) => (
              <StaggerItem key={review.id}>
                <figure className="h-full border border-[var(--primary)]/40 bg-[var(--surface)] p-7 text-center">
                  <div className="mb-4 flex justify-center" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((step) => (
                      <Star
                        key={step}
                        size={13}
                        strokeWidth={1.5}
                        className={step <= review.rating ? "fill-[var(--primary)] text-[var(--primary)]" : "text-[var(--border)]"}
                      />
                    ))}
                  </div>
                  <blockquote className="font-display text-[18px] leading-[1.65] text-[var(--text)]">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-5 text-[11px] uppercase tracking-[0.28em] text-[var(--muted)]">
                    {review.authorName}
                  </figcaption>
                  {review.attribution ? (
                    <AttributionLine attribution={review.attribution} className="mt-1 text-[10.5px] text-[var(--muted)]" />
                  ) : null}
                </figure>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      ) : null}

      {/* The evening: hours + location ledger in gold frames */}
      <section id="evening" aria-labelledby="evening-heading" className="border-t border-[var(--primary)]/30 py-16 md:py-24">
        <div className="poc-container">
          <div className="text-center">
            <Reveal>
              <h2 id="evening-heading" className="font-display text-4xl uppercase tracking-[0.14em] text-[var(--text)]">
                The evening
              </h2>
            </Reveal>
            <div className="mt-6">
              <DecoDivider />
            </div>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-10 lg:grid-cols-2">
            <Reveal>
              <DecoFrame>
                <div className="p-8">
                  <h3 className="text-center font-display text-xl uppercase tracking-[0.2em] text-[var(--primary)]">
                    Hours
                  </h3>
                  <LineGrow className="mx-auto mt-4 h-px w-14 bg-[var(--primary)]/70" origin="center" />
                  {record.hours ? (
                    <HoursList hours={record.hours} className="mx-auto mt-6 max-w-xs space-y-1.5 text-center text-[13.5px] text-[var(--muted)]" />
                  ) : null}
                  <div className="mt-7 space-y-2 text-center text-[13.5px] text-[var(--muted)]">
                    {record.contact.phone ? (
                      <p className="flex items-center justify-center gap-2">
                        <Phone size={13} strokeWidth={1.5} aria-hidden="true" />
                        <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--primary)]">
                          {record.contact.phone}
                        </a>
                      </p>
                    ) : null}
                    {record.contact.socials.length > 0 ? (
                      <p className="flex justify-center gap-5">
                        {record.contact.socials.map((social) => (
                          <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--primary)]">
                            {social.label ?? social.platform}
                          </a>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </div>
              </DecoFrame>
            </Reveal>
            {record.location ? (
              <Reveal delay={0.12}>
                <DecoFrame>
                  <MapSection
                    location={record.location}
                    businessName={record.identity.name}
                    directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                    embedClassName="h-[300px] w-full border-0"
                    cardClassName="bg-[var(--surface)] p-8 text-center"
                    addressClassName="text-[13.5px] text-[var(--muted)]"
                    buttonClassName="mt-2 inline-block border border-[var(--primary)] px-6 py-2.5 text-[11.5px] uppercase tracking-[0.24em] text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--on-primary)]"
                  />
                </DecoFrame>
              </Reveal>
            ) : null}
          </div>
        </div>
      </section>

      {record.about || record.services.length + record.amenities.length > 0 ? (
        <section aria-label="About" className="poc-container max-w-2xl pb-20 text-center">
          <DecoDivider />
          {record.about ? (
            <Reveal>
              <div className="mt-8">
                <h2 className="font-display text-2xl uppercase tracking-[0.14em] text-[var(--text)]">
                  {record.about.title}
                </h2>
                <p className="mt-5 text-[14.5px] leading-[1.95] text-[var(--muted)]">{record.about.body}</p>
              </div>
            </Reveal>
          ) : null}
          {record.services.length + record.amenities.length > 0 ? (
            <Reveal delay={0.1}>
              <p className={`text-[11.5px] uppercase tracking-[0.26em] text-[var(--primary)] ${record.about ? "mt-8" : "mt-8"}`}>
                {[...record.services, ...record.amenities].slice(0, 6).map((item) => item.label).join("  ·  ")}
              </p>
            </Reveal>
          ) : null}
        </section>
      ) : null}

      <BusinessEssentials record={record} />

      <footer className="border-t border-[var(--primary)]/30 py-12">
        <div className="poc-container flex flex-col items-center gap-6 text-center">
          <FanCrest size={40} />
          <p className="font-display text-2xl uppercase tracking-[0.3em] text-[var(--text)]">{record.wordmark.text}</p>
          <ConceptNotice
            record={record}
            labelClassName="text-[10.5px] uppercase tracking-[0.3em] text-[var(--muted)]"
            bodyClassName="mt-2 max-w-md text-[12px] leading-relaxed text-[var(--muted)]"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
