import { ArrowUpRight, MapPin, Phone, Star } from "lucide-react";
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
import { AnimatedWordmark } from "@/components/poc/motion/AnimatedWordmark";
import { HeroSequence } from "@/components/poc/motion/HeroSequence";
import { LineGrow } from "@/components/poc/motion/LineGrow";
import { MaskedImageReveal } from "@/components/poc/media/MaskedImageReveal";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/StaggerGroup";
import { display, body } from "./fonts";

/**
 * Coffee Editorial: an independent café rendered as a premium print
 * publication. A masthead with issue metadata, a split-cover hero whose
 * photography is printed into the page through a clip mask, a folio-numbered
 * menu spread with a sticky category rail, field-notes photography in an
 * adaptive bento (a horizontal snap strip on mobile), reviews as marginalia,
 * and a back-page visit spread. Sparse records fall back to a
 * typography-led cover with no empty furniture.
 */

function issueOf(record: ThemeProps["record"]): string {
  const days = Math.max(1, Math.round((Date.now() - new Date(record.poc.createdAt).getTime()) / 86400000) + 1);
  return String(days).padStart(2, "0");
}

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
    "--on-primary": p.onPrimary,
    "--on-secondary": p.onSecondary,
    "--on-accent": p.onAccent,
    "--radius": "2px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const issue = issueOf(record);
  const dateline = [issueNo(issue), record.location?.city ?? record.identity.primaryCategory].filter(Boolean).join(" · ");
  const galleryImages = record.gallery?.images ?? [];
  const hasCover = Boolean(record.hero.image);
  const menuSections = record.menu?.sections ?? [];
  const primary = record.cta.primary;
  const secondary = record.cta.secondary[0] ?? null;

  const nav = [
    record.about ? { href: "#story", label: "Story" } : null,
    record.menu ? { href: "#card", label: "Menu" } : null,
    galleryImages.length > 0 ? { href: "#field-notes", label: "Photos" } : null,
    { href: "#visit", label: "Visit" },
  ].filter((item): item is { href: string; label: string } => item !== null);

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      <div className="grain-overlay" aria-hidden="true" />

      {/* Masthead: print-style double rule, issue metadata, one quiet CTA */}
      <header className="sticky top-0 z-40 border-b border-[var(--text)] bg-[var(--bg)]/94 backdrop-blur">
        <div className="poc-container flex h-[64px] items-center justify-between gap-6">
          <a href="#cover" className="font-display text-[24px] font-semibold leading-none tracking-tight">
            {record.wordmark.text}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)] md:flex">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="transition-colors hover:text-[var(--secondary)]">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            {record.hours?.statusLabel ? (
              <p className="hidden font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--muted)] sm:block">
                {record.hours.statusLabel}
              </p>
            ) : null}
            {primary ? (
              <ActionLink
                cta={primary}
                className="border border-[var(--text)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text)] transition-colors hover:bg-[var(--text)] hover:text-[var(--bg)]"
              />
            ) : (
              <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--muted)]">{dateline}</p>
            )}
          </div>
        </div>
        <LineGrow className="h-px w-full bg-[var(--text)]/25" delay={0.1} />
      </header>

      {/* Cover */}
      <section id="cover" aria-labelledby="hero-heading">
        <div className={`poc-container grid gap-10 py-12 lg:py-16 ${hasCover ? "lg:grid-cols-12" : ""}`}>
          <div className={hasCover ? "lg:col-span-7" : ""}>
            <HeroSequence
              steps={[
                <div key="issue-row" className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
                  {record.hero.eyebrow ? <span className="text-[var(--secondary)]">{record.hero.eyebrow}</span> : null}
                  {!record.hero.eyebrow || !record.hero.eyebrow.includes("No.") ? (
                    <span aria-hidden="true">·</span>
                  ) : null}
                  <span>{dateline}</span>
                </div>,
                <h1
                  key="headline"
                  id="hero-heading"
                  className={`mt-6 font-display font-medium leading-[1.02] tracking-[-0.01em] ${
                    hasCover
                      ? "max-w-[13ch] text-[3.1rem] md:text-[4.2rem]"
                      : "mx-auto max-w-[16ch] text-center text-[3.4rem] md:text-[6rem]"
                  }`}
                  style={{ textWrap: "balance" } as React.CSSProperties}
                >
                  <AnimatedWordmark text={record.hero.headline} wordClassName="inline-block overflow-hidden align-baseline pb-[0.1em] -mb-[0.1em]" />
                </h1>,
                record.hero.subheadline || record.tagline ? (
                  <p
                    key="standfirst"
                    className={`mt-7 max-w-[48ch] text-[15.5px] leading-[1.85] text-[var(--muted)] ${hasCover ? "" : "mx-auto text-center"}`}
                  >
                    {record.hero.subheadline ?? record.tagline}
                  </p>
                ) : null,
                <div key="ctas" className={`mt-9 flex flex-wrap items-center gap-x-8 gap-y-4 ${hasCover ? "" : "justify-center"}`}>
                  {primary ? (
                    <ActionLink
                      cta={primary}
                      className="group inline-flex items-center gap-2 bg-[var(--primary)] px-7 py-3.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--on-primary)] transition-transform hover:-translate-y-0.5"
                    >
                      {primary.label}
                      <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </ActionLink>
                  ) : null}
                  {secondary ? (
                    <ActionLink
                      cta={secondary}
                      className="border-b-2 border-[var(--secondary)] pb-1 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--text)] transition-colors hover:text-[var(--secondary)]"
                    />
                  ) : null}
                  {record.reputation ? (
                    <span className="flex items-center gap-2 text-[13px] text-[var(--muted)]">
                      <Star size={13} strokeWidth={1.5} className="fill-[var(--accent)] text-[var(--accent)]" aria-hidden="true" />
                      {record.reputation.rating.toFixed(1)} / {record.reputation.reviewCount.toLocaleString("en-US")} reviews
                    </span>
                  ) : null}
                </div>,
              ]}
            />
          </div>

          {record.hero.image ? (
            <div className="relative lg:col-span-5">
              <div aria-hidden="true" className="absolute -left-4 -top-4 hidden h-full w-full border border-[var(--accent)]/60 lg:block" />
              <MaskedImageReveal from="left" inset="10% 6%" delay={0.15} className="relative">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <SmartImage
                    image={record.hero.image}
                    priority
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="h-full w-full object-cover"
                  />
                </div>
              </MaskedImageReveal>
              <p className="pointer-events-none absolute bottom-4 left-4 bg-[var(--bg)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {record.identity.primaryCategory}
                {record.location?.city ? ` · ${record.location.city}` : ""}
              </p>
            </div>
          ) : null}
        </div>
        {record.hero.image ? (
          <LineGrow className="mx-auto mt-4 h-px w-[min(76rem,calc(100%-2.5rem))] bg-[var(--text)]" delay={0.3} />
        ) : null}
      </section>

      {record.announcement ? (
        <div className="border-y border-[var(--text)]/20 bg-[var(--surface)]">
          <p className="poc-container flex flex-wrap items-center gap-x-4 gap-y-1 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--secondary)]">
            <span aria-hidden="true">※</span>
            {record.announcement}
          </p>
        </div>
      ) : null}

      {/* Story: folio spread */}
      {record.about || record.services.length + record.amenities.length > 0 || record.tagline ? (
        <section id="story" aria-labelledby="story-heading" className="border-t-2 border-[var(--text)]">
          <div className="poc-container grid gap-10 py-16 md:grid-cols-12 md:py-24">
            <div className="md:col-span-3">
              <Reveal>
                <p className="font-display text-[72px] font-medium leading-none text-[var(--accent)]/40" aria-hidden="true">
                  {issue}
                </p>
                <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-[var(--muted)]">The story</p>
                <LineGrow className="mt-4 h-px w-16 bg-[var(--text)]" delay={0.15} />
              </Reveal>
            </div>
            <div className="md:col-span-8 md:col-start-5">
              <Reveal delay={0.08}>
                {record.about ? (
                  <>
                    <h2 id="story-heading" className="font-display text-3xl font-medium leading-tight md:text-4xl">
                      {record.about.title}
                    </h2>
                    <p className="mt-6 text-[16.5px] leading-[1.95] text-[var(--text)]">{record.about.body}</p>
                  </>
                ) : (
                  <h2 id="story-heading" className="font-display text-3xl font-medium leading-tight md:text-4xl">
                    {record.tagline ?? `About ${record.identity.shortName}`}
                  </h2>
                )}
              </Reveal>
              {record.services.length + record.amenities.length > 0 ? (
                <Reveal delay={0.16}>
                  <p className="mt-8 border-t border-[var(--border)] pt-5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    {[...record.services, ...record.amenities].slice(0, 6).map((item) => item.label).join("  /  ")}
                  </p>
                </Reveal>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* The card: menu spread with a sticky category rail */}
      {record.menu ? (
        <section id="card" aria-labelledby="menu-heading" className="border-t-2 border-[var(--text)] bg-[var(--surface)]">
          <div className="poc-container py-16 md:py-24">
            <Reveal className="flex flex-wrap items-end justify-between gap-6 border-b border-[var(--border)] pb-8">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[var(--secondary)]">
                  {record.menu.mode === "sample" ? "The card, illustrative" : "The card"}
                </p>
                <h2 id="menu-heading" className="mt-3 font-display text-4xl font-medium md:text-5xl">
                  Menu
                </h2>
              </div>
              <div className="text-right">
                {record.offering.priceRange ? (
                  <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">{record.offering.priceRange}</p>
                ) : null}
                {record.menu.notice ? (
                  <p className="mt-2 max-w-xs font-mono text-[10.5px] leading-relaxed text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                    {record.menu.notice}
                  </p>
                ) : null}
              </div>
            </Reveal>

            <div className="grid gap-12 pt-12 lg:grid-cols-12">
              {menuSections.length > 1 ? (
                <nav aria-label="Menu categories" className="hidden lg:col-span-3 lg:block">
                  <div className="sticky top-24">
                    <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">Contents</p>
                    <ul className="space-y-3">
                      {menuSections.map((section, index) => (
                        <li key={section.id}>
                          <a
                            href={`#${section.id}`}
                            className="group flex items-baseline gap-3 text-[13.5px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--text)]"
                          >
                            <span className="font-mono text-[10px] text-[var(--secondary)]">{String(index + 1).padStart(2, "0")}</span>
                            <span className="border-b border-transparent transition-colors group-hover:border-[var(--text)]">
                              {section.name}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                    <LineGrow className="mt-6 h-px w-14 bg-[var(--accent)]" delay={0.2} />
                  </div>
                </nav>
              ) : null}

              <StaggerGroup className={`space-y-16 ${menuSections.length > 1 ? "lg:col-span-9" : "lg:col-span-12"}`} gap={0.2}>
                {menuSections.map((section, index) => (
                  <StaggerItem key={section.id}>
                    <article id={section.id} className="scroll-mt-28">
                      <div className="flex items-baseline gap-5 border-b-2 border-[var(--text)] pb-3">
                        <span className="font-display text-[44px] font-medium leading-none text-[var(--secondary)]" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-[26px] font-medium leading-tight">{section.name}</h3>
                          {section.description ? (
                            <p className="mt-1 font-display text-[14.5px] italic text-[var(--muted)]">{section.description}</p>
                          ) : null}
                        </div>
                      </div>
                      <dl className="mt-6 grid gap-x-12 md:grid-cols-2">
                        {section.items.map((item) => (
                          <div key={item.id} className="group grid grid-cols-[1fr_auto] items-baseline gap-x-6 border-b border-dotted border-[var(--border)] py-4 transition-colors hover:bg-[var(--bg)]/60">
                            <dt className="min-w-0 px-1">
                              <span className="text-[15px] font-semibold">
                                {item.name}
                                {item.featured ? (
                                  <span className="ml-2 align-middle font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                                    ★ Editors&rsquo; pick
                                  </span>
                                ) : null}
                              </span>
                              {item.description ? (
                                <span className="mt-0.5 block max-w-[44ch] text-[13.5px] leading-relaxed text-[var(--muted)]">
                                  {item.description}
                                  {item.tags.length > 0 ? ` (${item.tags.join(", ")})` : ""}
                                </span>
                              ) : null}
                            </dt>
                            <dd className="pr-1 text-[15px] font-semibold tabular-nums transition-colors group-hover:text-[var(--secondary)]">
                              {item.price ?? ""}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </article>
                  </StaggerItem>
                ))}
              </StaggerGroup>
            </div>
          </div>
        </section>
      ) : null}

      {/* Field notes: adaptive photography spread */}
      {galleryImages.length > 0 ? (
        <section id="field-notes" aria-labelledby="field-notes-heading" className="border-t-2 border-[var(--text)]">
          <div className="poc-container py-16 md:py-24">
            <Reveal className="flex flex-wrap items-baseline justify-between gap-4">
              <h2 id="field-notes-heading" className="font-display text-4xl font-medium md:text-5xl">
                {record.gallery?.title ?? "Field notes"}
              </h2>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-[var(--muted)]">
                {String(galleryImages.length).padStart(2, "0")} frames
              </p>
            </Reveal>
            <LineGrow className="mt-6 h-px w-full bg-[var(--text)]" delay={0.1} />
            <div className="mt-10">
              <BentoGallery
                images={galleryImages}
                renderCaption={(image, index) => (
                  <span className="flex items-baseline gap-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--muted)]">
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    <span className="normal-case tracking-normal">{trimCaption(image.alt)}</span>
                  </span>
                )}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* Marginalia: reviews as pull quotes */}
      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="border-t-2 border-[var(--text)] bg-[var(--surface)]">
          <div className="poc-container grid gap-12 py-16 md:grid-cols-12 md:py-24">
            <div className="md:col-span-3">
              <Reveal>
                <h2 id="reviews-heading" className="font-display text-3xl font-medium leading-tight">
                  Marginalia
                </h2>
                <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-[var(--muted)]">
                  {record.reputation.rating.toFixed(1)} / 5 · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
                </p>
                <LineGrow className="mt-4 h-px w-16 bg-[var(--accent)]" delay={0.15} />
              </Reveal>
            </div>
            <StaggerGroup className="space-y-12 md:col-span-8 md:col-start-5" gap={0.2}>
              {record.reputation.reviews.slice(0, 3).map((review) => (
                <StaggerItem as="figure" key={review.id} className="border-l-2 border-[var(--text)] pl-6">
                  <blockquote className="font-display text-[21px] font-medium italic leading-[1.6]">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                    <span>{review.authorName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{review.publishedAt ? new Date(review.publishedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "recently"}</span>
                  </figcaption>
                  {review.attribution ? (
                    <AttributionLine attribution={review.attribution} className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[var(--muted)]" />
                  ) : null}
                </StaggerItem>
              ))}
              {record.reputation.reviewsUrl ? (
                <StaggerItem>
                  <a
                    href={record.reputation.reviewsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--secondary)]"
                  >
                    <span className="border-b border-[var(--secondary)] pb-0.5 transition-colors group-hover:border-[var(--text)] group-hover:text-[var(--text)]">
                      Read the full ledger
                    </span>
                    <ArrowUpRight size={13} strokeWidth={1.75} aria-hidden="true" />
                  </a>
                </StaggerItem>
              ) : null}
            </StaggerGroup>
          </div>
        </section>
      ) : null}

      {/* Visit: back-page spread */}
      <section id="visit" aria-labelledby="visit-heading" className="border-t-2 border-[var(--text)]">
        <div className="poc-container grid gap-12 py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-4">
            <Reveal>
              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-[var(--secondary)]">The back page</p>
              <h2 id="visit-heading" className="mt-3 font-display text-4xl font-medium md:text-5xl">
                Visit
              </h2>
              <LineGrow className="mt-5 h-px w-20 bg-[var(--text)]" delay={0.12} />
              {record.hours ? (
                <div className="mt-8">
                  <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">Hours</p>
                  <HoursList hours={record.hours} className="space-y-1.5 text-[13.5px] text-[var(--text)]" />
                </div>
              ) : null}
              <div className="mt-8 space-y-2.5 text-[13.5px] text-[var(--muted)]">
                {record.location ? (
                  <p className="flex items-start gap-2.5">
                    <MapPin size={14} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0">{record.location.formattedAddress ?? record.location.shortAddress}</span>
                  </p>
                ) : null}
                {record.contact.phone ? (
                  <p className="flex items-center gap-2.5">
                    <Phone size={14} strokeWidth={1.5} aria-hidden="true" />
                    <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="transition-colors hover:text-[var(--secondary)]">
                      {record.contact.phone}
                    </a>
                  </p>
                ) : null}
                {record.contact.email ? (
                  <p>
                    <a href={`mailto:${record.contact.email}`} className="border-b border-[var(--border)] pb-0.5 transition-colors hover:border-[var(--secondary)] hover:text-[var(--secondary)]">
                      {record.contact.email}
                    </a>
                  </p>
                ) : null}
              </div>
              {record.contact.socials.length > 0 ? (
                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                  {record.contact.socials.map((social) => (
                    <li key={social.url}>
                      <a href={social.url} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] underline-offset-4 transition-colors hover:text-[var(--secondary)] hover:underline">
                        {social.label ?? social.platform} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Reveal>
          </div>
          {record.location ? (
            <Reveal delay={0.12} className="md:col-span-8">
              <div className="relative">
                <div aria-hidden="true" className="absolute -right-3 -top-3 hidden h-full w-full border border-[var(--accent)]/50 md:block" />
                <MapSection
                  location={record.location}
                  businessName={record.identity.name}
                  directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                  embedClassName="relative h-[420px] w-full border-2 border-[var(--text)]"
                  cardClassName="border-2 border-[var(--text)] p-8"
                  addressClassName="font-mono text-[11.5px] uppercase tracking-[0.1em] text-[var(--text)]"
                  buttonClassName="mt-3 border border-[var(--text)] px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text)] transition-colors hover:bg-[var(--text)] hover:text-[var(--bg)]"
                  detailsClassName="mt-4 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-[var(--border)] pt-4"
                />
              </div>
            </Reveal>
          ) : null}
        </div>
      </section>

      <BusinessEssentials record={record} />

      {/* Colophon footer */}
      <footer className="border-t-2 border-[var(--text)]">
        <div className="poc-container flex flex-col justify-between gap-8 pb-10 pt-12 md:flex-row md:items-end">
          <div>
            <p className="font-display text-[2.8rem] font-medium leading-none md:text-[3.4rem]">
              <AnimatedWordmark text={record.wordmark.text} wordClassName="inline-block overflow-hidden align-baseline pb-[0.1em] -mb-[0.1em]" />
            </p>
            <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--muted)]">
              {issueNo(issue)} · {new Date(record.poc.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              {record.location ? ` · ${record.location.city ?? record.location.shortAddress}` : ""}
            </p>
          </div>
          <ConceptNotice
            record={record}
            labelClassName="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--secondary)]"
            bodyClassName="mt-2 max-w-md font-mono text-[11px] leading-relaxed text-[var(--muted)] md:text-right"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}

function issueNo(issue: string): string {
  return `Issue No. ${issue}`;
}

/** Keeps gallery captions to one quiet line of editorial furniture. */
function trimCaption(alt: string): string {
  const firstSentence = alt.split(/(?<=[.!?])\s/)[0] ?? alt;
  return firstSentence.length > 72 ? `${firstSentence.slice(0, 69).trimEnd()}…` : firstSentence;
}
