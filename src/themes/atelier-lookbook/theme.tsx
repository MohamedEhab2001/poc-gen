import { ArrowUpRight, Phone, Star } from "lucide-react";
import type { ThemeProps } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";
import { AttributionLine } from "@/components/poc/attribution/AttributionLine";
import { ConceptNotice } from "@/components/poc/ConceptNotice";
import { HoursList } from "@/components/poc/HoursList";
import { MobileActionBar } from "@/components/poc/MobileActionBar";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { MapSection } from "@/components/poc/map/MapSection";
import { LineGrow } from "@/components/poc/motion/LineGrow";
import { ParallaxImage } from "@/components/poc/motion/ParallaxImage";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/Stagger";
import { display, body } from "./fonts";

/** Tiny red chapter label with a growing hairline. */
function ChapterLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.34em] text-[var(--secondary)]">
        {children}
      </span>
      <LineGrow className="h-px w-16 bg-[var(--secondary)]" />
    </div>
  );
}

/**
 * Atelier Lookbook: high-fashion gallery. Stark white, Bodoni display, one
 * fashion-red gesture. Parallax image chapters, hairline index rows, huge
 * whitespace, and gliding entrances.
 */
export default function AtelierLookbookTheme({ record }: ThemeProps) {
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
    "--on-primary": "#fbfaf8",
    "--radius": "0px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const gallery = record.gallery?.images ?? [];

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/92 backdrop-blur">
        <div className="poc-container flex h-16 items-center justify-between">
          <a href="#hero" className="font-display text-xl italic tracking-wide">
            {record.wordmark.text}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-9 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)] md:flex">
            {record.about ? <a href="#story" className="hover:text-[var(--secondary)]">Story</a> : null}
            {record.menu ? <a href="#menu" className="hover:text-[var(--secondary)]">Carte</a> : null}
            {gallery.length > 0 ? <a href="#chapters" className="hover:text-[var(--secondary)]">Chapters</a> : null}
            <a href="#visit" className="hover:text-[var(--secondary)]">Visit</a>
          </nav>
          {record.cta.primary ? (
            <ActionLink
              cta={record.cta.primary}
              className="border-b border-[var(--text)] pb-0.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text)] transition-colors hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
            />
          ) : null}
        </div>
      </header>

      {/* Lookbook hero: massive Bodoni left, full-bleed image right */}
      <section id="hero" aria-labelledby="hero-heading">
        <div className="grid lg:grid-cols-12">
          <div className="flex flex-col justify-center px-6 py-16 md:px-12 lg:col-span-6 lg:py-28 lg:pl-16">
            {record.hero.eyebrow ? (
              <Reveal>
                <ChapterLabel>{record.hero.eyebrow}</ChapterLabel>
              </Reveal>
            ) : null}
            <Reveal delay={0.12}>
              <h1
                id="hero-heading"
                className="mt-6 font-display text-[3.2rem] font-medium leading-[0.98] tracking-[-0.01em] md:text-[4.6rem] lg:text-[5.2rem]"
                style={{ textWrap: "balance" } as React.CSSProperties}
              >
                {record.hero.headline}
              </h1>
            </Reveal>
            {record.hero.subheadline ? (
              <Reveal delay={0.24}>
                <p className="mt-8 max-w-[42ch] text-[14.5px] leading-[1.9] text-[var(--muted)]">
                  {record.hero.subheadline}
                </p>
              </Reveal>
            ) : null}
            <Reveal delay={0.32}>
              <div className="mt-10 flex flex-wrap items-center gap-x-10 gap-y-5">
                {record.cta.primary ? (
                  <ActionLink
                    cta={record.cta.primary}
                    className="group inline-flex items-center gap-2 bg-[var(--text)] px-8 py-4 text-[11.5px] font-semibold uppercase tracking-[0.24em] text-[var(--on-primary)]"
                  >
                    {record.cta.primary.label}
                    <ArrowUpRight
                      size={14}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </ActionLink>
                ) : null}
                {record.cta.secondary[0] ? (
                  <ActionLink
                    cta={record.cta.secondary[0]}
                    className="border-b border-[var(--text)] pb-1 text-[11.5px] font-semibold uppercase tracking-[0.24em] text-[var(--text)] hover:border-[var(--secondary)] hover:text-[var(--secondary)]"
                  />
                ) : null}
                {record.reputation ? (
                  <span className="flex items-center gap-2 text-[12.5px] text-[var(--muted)]">
                    <Star size={13} strokeWidth={1.5} className="fill-[var(--secondary)] text-[var(--secondary)]" aria-hidden="true" />
                    {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")}
                  </span>
                ) : null}
              </div>
            </Reveal>
          </div>
          <div className="relative min-h-[420px] lg:col-span-6 lg:min-h-[86dvh]">
            {record.hero.image ? (
              <ParallaxImage className="absolute inset-0" distance={56}>
                <div className="h-[112%] w-full -translate-y-[6%]">
                  <SmartImage
                    image={record.hero.image}
                    priority
                    fill
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="h-full w-full object-cover"
                  />
                </div>
              </ParallaxImage>
            ) : null}
            <p aria-hidden="true" className="absolute bottom-6 left-6 bg-[var(--bg)] px-3 py-1.5 font-display text-[13px] italic">
              {record.identity.primaryCategory}
            </p>
          </div>
        </div>
      </section>

      {/* Story: split with portrait + giant pull line */}
      {record.about ? (
        <section id="story" aria-labelledby="story-heading" className="border-t border-[var(--border)]">
          <div className="poc-container grid gap-12 py-20 lg:grid-cols-12 lg:py-28">
            <div className="lg:col-span-5">
              <Reveal>
                <ChapterLabel>Story</ChapterLabel>
              </Reveal>
              <Reveal delay={0.1}>
                <h2
                  id="story-heading"
                  className="mt-6 font-display text-[2.2rem] font-medium leading-[1.08] md:text-5xl"
                  style={{ textWrap: "balance" } as React.CSSProperties}
                >
                  {record.about.title}
                </h2>
              </Reveal>
              {record.services.length + record.amenities.length > 0 ? (
                <Reveal delay={0.18}>
                  <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                    {[...record.services, ...record.amenities].slice(0, 5).map((item) => item.label).join("  ·  ")}
                  </p>
                </Reveal>
              ) : null}
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <Reveal delay={0.14}>
                <p className="font-display text-[22px] leading-[1.7] md:text-[26px]">{record.about.body}</p>
              </Reveal>
            </div>
          </div>
        </section>
      ) : null}

      {/* Carte: hairline index rows */}
      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="border-t border-[var(--border)]">
          <div className="poc-container py-20 lg:py-28">
            <Reveal>
              <ChapterLabel>{record.menu.mode === "sample" ? "Carte, illustrative" : "Carte"}</ChapterLabel>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 id="menu-heading" className="mt-6 font-display text-[2.6rem] font-medium leading-none md:text-6xl">
                Menu
              </h2>
            </Reveal>
            {record.offering.priceRange ? (
              <p className="mt-4 text-[13px] text-[var(--muted)]">{record.offering.priceRange}</p>
            ) : null}
            {record.menu.notice ? (
              <p className="mt-3 max-w-md text-[12.5px] leading-relaxed text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                {record.menu.notice}
              </p>
            ) : null}
            <div className="mt-14 space-y-16">
              {record.menu.sections.map((section) => (
                <div key={section.id}>
                  <div className="flex items-baseline justify-between gap-6 border-b border-[var(--text)] pb-3">
                    <h3 className="text-[13px] font-semibold uppercase tracking-[0.3em]">{section.name}</h3>
                    {section.description ? (
                      <p className="hidden text-[12px] italic text-[var(--muted)] sm:block">{section.description}</p>
                    ) : null}
                  </div>
                  <StaggerGroup className="divide-y divide-[var(--border)]" gap={0.07}>
                    {section.items.map((item) => (
                      <StaggerItem key={item.id}>
                        <div className="group grid grid-cols-[1fr_auto] items-baseline gap-x-8 py-5 transition-colors duration-300 hover:bg-[var(--surface)]">
                          <div className="px-2">
                            <p className="font-display text-[21px] font-medium leading-snug md:text-[24px]">
                              {item.name}
                              {item.featured ? (
                                <span className="ml-3 align-middle text-[10px] font-semibold uppercase not-italic tracking-[0.26em] text-[var(--secondary)]" style={{ fontFamily: "var(--font-body)" }}>
                                  Signature
                                </span>
                              ) : null}
                            </p>
                            {item.description ? (
                              <p className="mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-[var(--muted)]">
                                {item.description}
                                {item.tags.length > 0 ? ` (${item.tags.join(", ")})` : ""}
                              </p>
                            ) : null}
                          </div>
                          <p className="pr-2 font-display text-[20px] tabular-nums md:text-[22px]">{item.price ?? ""}</p>
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerGroup>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* Chapters: alternating full-bleed parallax images */}
      {gallery.length > 0 ? (
        <section id="chapters" aria-label="Gallery chapters" className="border-t border-[var(--border)]">
          <div className="poc-container py-16">
            <Reveal>
              <ChapterLabel>{record.gallery?.title ?? "Chapters"}</ChapterLabel>
            </Reveal>
          </div>
          <div className="space-y-4 px-4 md:px-8">
            {gallery.slice(0, 4).map((image, index) => (
              <Reveal key={image.url} delay={index * 0.05}>
                <figure className={index % 2 === 1 ? "md:pr-[18%]" : "md:pl-[18%]"}>
                  <ParallaxImage className="h-[46vh] min-h-[300px] md:h-[58vh]" distance={34}>
                    <div className="h-[114%] w-full -translate-y-[7%]">
                      <SmartImage
                        image={image}
                        width={1400}
                        height={900}
                        fill
                        sizes="(min-width: 1024px) 66vw, 92vw"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </ParallaxImage>
                  {image.attribution ? (
                    <AttributionLine attribution={image.attribution} className="mt-2 text-[11px] text-[var(--muted)]" />
                  ) : null}
                </figure>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {/* One giant quote */}
      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="border-t border-[var(--border)]">
          <div className="poc-container max-w-3xl py-24 text-center lg:py-32">
            {(() => {
              const firstReview = record.reputation?.reviews[0];
              if (!firstReview) return null;
              return (
                <Reveal>
                  <p aria-hidden="true" className="font-display text-[7rem] leading-[0.4] text-[var(--secondary)]">
                    &ldquo;
                  </p>
                  <h2 id="reviews-heading" className="sr-only">
                    Guest words
                  </h2>
                  <blockquote className="mt-8 font-display text-[30px] font-medium leading-[1.35] md:text-[40px]">
                    {firstReview.text}
                  </blockquote>
                  <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--muted)]">
                    {firstReview.authorName}
                  </p>
                </Reveal>
              );
            })()}
          </div>
        </section>
      ) : null}

      {/* Visit */}
      <section id="visit" aria-labelledby="visit-heading" className="border-t border-[var(--border)]">
        <div className="poc-container grid gap-14 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <Reveal>
              <ChapterLabel>Visit</ChapterLabel>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 id="visit-heading" className="mt-6 font-display text-[2.4rem] font-medium leading-none md:text-5xl">
                Find the door
              </h2>
            </Reveal>
            {record.hours ? (
              <Reveal delay={0.16}>
                <div className="mt-10">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Hours</p>
                  <HoursList hours={record.hours} className="space-y-1.5 text-[13.5px] text-[var(--text)]" />
                </div>
              </Reveal>
            ) : null}
            <Reveal delay={0.22}>
              <div className="mt-10 space-y-1.5 text-[13.5px] text-[var(--text)]">
                {record.contact.phone ? (
                  <p className="flex items-center gap-2.5">
                    <Phone size={13} strokeWidth={1.5} aria-hidden="true" />
                    <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--secondary)]">
                      {record.contact.phone}
                    </a>
                  </p>
                ) : null}
                {record.contact.email ? (
                  <p>
                    <a href={`mailto:${record.contact.email}`} className="hover:text-[var(--secondary)]">
                      {record.contact.email}
                    </a>
                  </p>
                ) : null}
                {record.contact.socials.length > 0 ? (
                  <p className="flex gap-5 pt-2">
                    {record.contact.socials.map((social) => (
                      <a key={social.url} href={social.url} target="_blank" rel="noopener noreferrer" className="border-b border-[var(--border)] pb-0.5 hover:border-[var(--secondary)] hover:text-[var(--secondary)]">
                        {social.label ?? social.platform}
                      </a>
                    ))}
                  </p>
                ) : null}
              </div>
            </Reveal>
          </div>
          {record.location ? (
            <Reveal delay={0.14}>
              <MapSection
                location={record.location}
                businessName={record.identity.name}
                directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                embedClassName="h-[420px] w-full border border-[var(--border)] grayscale"
                cardClassName="border border-[var(--border)] p-10"
                addressClassName="text-[13.5px] text-[var(--text)]"
                buttonClassName="mt-2 inline-block border-b border-[var(--secondary)] pb-1 text-[11px] font-semibold uppercase tracking-[0.26em] text-[var(--secondary)]"
              />
            </Reveal>
          ) : null}
        </div>
      </section>

      <footer className="border-t border-[var(--text)]">
        <div className="poc-container flex flex-col justify-between gap-8 py-12 md:flex-row md:items-end">
          <p className="font-display text-[2.6rem] font-medium italic leading-none md:text-6xl">{record.wordmark.text}</p>
          <ConceptNotice
            record={record}
            labelClassName="text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--muted)]"
            bodyClassName="mt-2 max-w-sm text-[12px] leading-relaxed text-[var(--muted)] md:text-right"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
