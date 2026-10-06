import { Clock, Phone, Star } from "lucide-react";
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
import { LineGrow } from "@/components/poc/motion/LineGrow";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/StaggerGroup";
import { MenuBoard } from "./MenuBoard";
import { display, body } from "./fonts";

/**
 * American Diner: cheerful retro. Navy and cherry horizontal bands, a
 * signboard hero with prominent hours, checker accents, tactile chunky CTAs
 * with hard offset shadows, a tabbed menu board, and speech-card reviews.
 * Polished retro motion: the signboard assembles once, bands slide in from
 * their edges, the checker strip draws across, buttons press in — never
 * cartoonish.
 */
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

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      {/* Navy band header */}
      <header className="bg-[var(--secondary)] text-[var(--on-secondary)]">
        <div className="poc-container flex h-[68px] items-center justify-between">
          <a href="#hero" className="font-display text-xl tracking-wide">
            {record.wordmark.text}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[13.5px] font-bold uppercase tracking-[0.08em] md:flex">
            {record.menu ? <a href="#menu" className="hover:text-[var(--accent)]">Menu</a> : null}
            {record.about ? <a href="#story" className="hover:text-[var(--accent)]">Our place</a> : null}
            <a href="#visit" className="hover:text-[var(--accent)]">Visit</a>
          </nav>
          {record.hours?.statusLabel ? (
            <p className="flex items-center gap-2 text-[13px] font-bold">
              <Clock size={14} strokeWidth={1.5} aria-hidden="true" />
              {record.hours.statusLabel}
            </p>
          ) : null}
        </div>
        {/* Checker strip */}
        <LineGrow
          className="h-3 w-full"
          delay={0.15}
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${p.background} 0 14px, ${p.primary} 14px 28px)`,
          }}
        />
      </header>

      {/* Signboard hero */}
      <section aria-labelledby="hero-heading" className="poc-container py-12 md:py-16">
        <div className="relative mx-auto max-w-4xl border-4 border-[var(--primary)] bg-[var(--surface)] px-6 py-10 text-center shadow-[12px_12px_0_var(--primary)] md:px-14 md:py-14">
          <HeroSequence
            steps={[
              record.hero.eyebrow ? (
                <p key="eyebrow" className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.3em] text-[var(--primary)]">
                  {record.hero.eyebrow}
                </p>
              ) : null,
              <h1 key="headline" id="hero-heading" className="font-display text-[2.5rem] leading-[1.05] text-[var(--text)] md:text-6xl">
                {record.hero.headline}
              </h1>,
              record.hero.subheadline ? (
                <p key="sub" className="mx-auto mt-4 max-w-[48ch] text-[15px] font-semibold text-[var(--muted)]">
                  {record.hero.subheadline}
                </p>
              ) : null,
              record.reputation ? (
                <p key="reputation" className="mt-4 flex items-center justify-center gap-1.5 text-[14px] font-extrabold text-[var(--text)]">
                  <Star size={15} strokeWidth={1.5} className="fill-[var(--accent)] text-[var(--accent)]" aria-hidden="true" />
                  {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
                </p>
              ) : null,
              <div key="ctas" className="mt-8 flex flex-wrap items-center justify-center gap-5">
                {record.cta.primary ? (
                  <ActionLink
                    cta={record.cta.primary}
                    className="bg-[var(--primary)] px-8 py-4 text-[15px] font-extrabold uppercase tracking-[0.06em] text-[var(--on-primary)] shadow-[6px_6px_0_var(--secondary)] transition-transform hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-[3px_3px_0_var(--secondary)]"
                  />
                ) : null}
                {record.cta.secondary[0] ? (
                  <ActionLink
                    cta={record.cta.secondary[0]}
                    className="border-4 border-[var(--secondary)] px-7 py-3 text-[14px] font-extrabold uppercase tracking-[0.06em] text-[var(--secondary)] transition-transform hover:-translate-y-0.5"
                  />
                ) : null}
              </div>,
            ]}
          />
        </div>
      </section>

      {record.hero.image ? (
        <section aria-label="Photo of the diner" className="poc-container pb-12">
          <Reveal direction="left" media delay={0.08}>
            <SmartImage
              image={record.hero.image}
              priority
              width={1600}
              height={820}
              sizes="(min-width: 976px) 976px, 100vw"
              className="h-auto w-full border-4 border-[var(--secondary)] object-cover shadow-[10px_10px_0_var(--primary)]"
              attributionClassName="mt-2 text-right text-[11.5px] font-bold text-[var(--muted)]"
            />
          </Reveal>
        </section>
      ) : null}

      {record.about || record.services.length + record.amenities.length > 0 ? (
        <section id="story" aria-labelledby="story-heading" className="bg-[var(--surface)] py-14 md:py-18">
          <Reveal className="poc-container max-w-3xl text-center">
            <h2 id="story-heading" className="font-display text-3xl text-[var(--text)] md:text-4xl">
              {record.about?.title ?? `Our place`}
            </h2>
            {record.about ? (
              <p className="mt-5 text-[15px] leading-[1.85] font-medium text-[var(--muted)]">{record.about.body}</p>
            ) : null}
            {record.services.length + record.amenities.length > 0 ? (
              <StaggerGroup as="ul" className={`flex flex-wrap justify-center gap-3 ${record.about ? "mt-7" : "mt-6"}`} gap={0.06}>
                {[...record.services, ...record.amenities].slice(0, 6).map((item) => (
                  <StaggerItem
                    as="li"
                    key={item.key + item.label}
                    className="rounded-full border-2 border-dashed border-[var(--primary)] px-4 py-1.5 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[var(--primary)]"
                  >
                    {item.label}
                  </StaggerItem>
                ))}
              </StaggerGroup>
            ) : null}
          </Reveal>
        </section>
      ) : null}

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="poc-container py-14 md:py-20">
          <h2 id="menu-heading" className="mb-3 text-center font-display text-4xl text-[var(--text)] md:text-5xl">
            The Menu Board
          </h2>
          {record.menu.notice ? (
            <p className="mx-auto mb-10 max-w-md text-center text-[13px] font-bold text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
              {record.menu.notice}
            </p>
          ) : (
            <LineGrow className="mx-auto mb-10 h-1 w-24 bg-[var(--primary)]" origin="center" delay={0.1} />
          )}
          <Reveal delay={0.05} className="mx-auto max-w-4xl">
            <MenuBoard menu={record.menu} />
          </Reveal>
        </section>
      ) : null}

      {record.gallery ? (
        <section aria-labelledby="gallery-heading" className="poc-container pb-14 md:pb-20">
          <h2 id="gallery-heading" className="mb-8 text-center font-display text-3xl text-[var(--text)]">
            {record.gallery.title ?? "Around the counter"}
          </h2>
          <StaggerGroup as="ul" className="grid grid-cols-2 gap-5 lg:grid-cols-4" gap={0.08}>
            {record.gallery.images.slice(0, 4).map((image) => (
              <StaggerItem as="li" key={image.url}>
                <SmartImage
                  image={image}
                  width={600}
                  height={560}
                  sizes="(min-width: 1024px) 24vw, 48vw"
                  className="h-auto w-full border-4 border-white object-cover shadow-[5px_5px_0_var(--secondary)]"
                  attributionClassName="mt-1.5 text-[10.5px] font-bold text-[var(--muted)]"
                />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="bg-[var(--secondary)] py-14 text-[var(--on-secondary)] md:py-20">
          <div className="poc-container">
            <h2 id="reviews-heading" className="mb-10 text-center font-display text-3xl">
              Kind words from the counter
            </h2>
            <StaggerGroup as="ul" className="grid gap-8 md:grid-cols-3" gap={0.1}>
              {record.reputation.reviews.slice(0, 3).map((review) => (
                <StaggerItem as="li" key={review.id} className="relative bg-[var(--surface)] p-6 pt-8 text-[var(--text)] shadow-[6px_6px_0_rgba(0,0,0,0.35)]">
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2"
                    style={{
                      borderLeft: "12px solid transparent",
                      borderRight: "12px solid transparent",
                      borderTop: `12px solid ${p.surface}`,
                    }}
                  />
                  <div className="mb-2 flex" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((step) => (
                      <Star key={step} size={14} strokeWidth={1.5} className={step <= review.rating ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--border)]"} />
                    ))}
                  </div>
                  <blockquote className="text-[14.5px] font-semibold leading-relaxed">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>
                  <p className="mt-3 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[var(--primary)]">
                    {review.authorName}
                  </p>
                  {review.attribution ? (
                    <AttributionLine attribution={review.attribution} className="mt-1 text-[10.5px] text-[var(--muted)]" />
                  ) : null}
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        </section>
      ) : null}

      <section id="visit" aria-labelledby="visit-heading" className="poc-container grid gap-12 py-14 md:grid-cols-2 md:py-20">
        <Reveal>
          <h2 id="visit-heading" className="font-display text-3xl text-[var(--text)] md:text-4xl">
            Pull up a stool
          </h2>
          {record.hours ? (
            <div className="mt-6 border-4 border-dashed border-[var(--primary)] bg-[var(--surface)] p-6">
              <p className="mb-3 flex items-center gap-2 font-display text-lg text-[var(--primary)]">
                <Clock size={17} strokeWidth={1.5} aria-hidden="true" /> Hours
              </p>
              <HoursList hours={record.hours} className="space-y-1.5 text-[14px] font-semibold text-[var(--text)]" />
            </div>
          ) : null}
          {record.contact.phone ? (
            <p className="mt-6 flex items-center gap-2.5 text-[15px] font-extrabold text-[var(--text)]">
              <Phone size={16} strokeWidth={1.5} className="text-[var(--primary)]" aria-hidden="true" />
              <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--primary)]">
                {record.contact.phone}
              </a>
            </p>
          ) : null}
          {record.contact.socials.length > 0 ? (
            <ul className="mt-4 flex gap-4 text-[13px] font-extrabold uppercase text-[var(--secondary)]">
              {record.contact.socials.map((social) => (
                <li key={social.url}>
                  <a href={social.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {social.label ?? social.platform}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </Reveal>
        {record.location ? (
          <Reveal delay={0.1}>
          <MapSection
              location={record.location}
              businessName={record.identity.name}
              directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
              embedClassName="h-[340px] w-full border-4 border-[var(--secondary)] shadow-[8px_8px_0_var(--primary)]"
              cardClassName="border-4 border-[var(--secondary)] bg-[var(--surface)] p-6"
              addressClassName="text-[14.5px] font-bold text-[var(--text)]"
              buttonClassName="mt-2 inline-block bg-[var(--secondary)] px-6 py-3 text-[13px] font-extrabold uppercase tracking-[0.06em] text-[var(--on-secondary)] shadow-[4px_4px_0_var(--primary)]"
            />
          </Reveal>
        ) : null}
      </section>

      {/* Checker strip footer */}
      <LineGrow
        className="h-3 w-full"
        delay={0.1}
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, ${p.background} 0 14px, ${p.primary} 14px 28px)`,
        }}
      />
      <BusinessEssentials record={record} />

      <footer className="bg-[var(--secondary)] py-11 text-[var(--on-secondary)]">
        <div className="poc-container flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <p className="font-display text-2xl">{record.wordmark.text}</p>
          <ConceptNotice
            record={record}
            labelClassName="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-[var(--on-secondary)]/60"
            bodyClassName="mt-2 max-w-md text-[12.5px] leading-relaxed text-[var(--on-secondary)]/75"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
