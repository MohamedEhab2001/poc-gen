import { ArrowUpRight, Clock, Phone, Star } from "lucide-react";
import type { ThemeProps } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";
import { ConceptNotice } from "@/components/poc/ConceptNotice";
import { HoursList } from "@/components/poc/HoursList";
import { MobileActionBar } from "@/components/poc/MobileActionBar";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { MapSection } from "@/components/poc/map/MapSection";
import { display, body } from "./fonts";

/**
 * Neon Night: late-night café or dessert bar. Near-black canvas, condensed
 * display type, angled hero crop, glowing status chip, desktop side rail
 * navigation, mobile bottom dock, modular menu panels, review marquee.
 * Expressive motion that collapses under prefers-reduced-motion.
 */
export default function NeonNightTheme({ record }: ThemeProps) {
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
    "--on-primary": "#0b0b12",
    "--radius": "2px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const rail = [
    { href: "#hero", label: "Start" },
    record.menu ? { href: "#menu", label: "Menu" } : null,
    record.gallery ? { href: "#gallery", label: "Pics" } : null,
    { href: "#find", label: "Find us" },
  ].filter((item): item is { href: string; label: string } => item !== null);

  const marqueeItems =
    record.reputation?.reviews.slice(0, 4).map((review) => review.text) ?? [];

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      {/* Desktop side rail */}
      <nav
        aria-label="Primary"
        className="fixed left-0 top-0 z-40 hidden h-full w-[76px] flex-col items-center justify-between border-r border-[var(--border)] bg-[var(--bg)]/90 py-6 backdrop-blur lg:flex"
      >
        <a href="#hero" className="font-display text-3xl leading-none text-[var(--primary)]">
          {record.wordmark.text.slice(0, 2).toUpperCase()}
        </a>
        <ul className="flex flex-col items-center gap-7">
          {rail.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="font-display text-lg tracking-[0.08em] text-[var(--muted)] transition-colors hover:text-[var(--accent)]"
                style={{ writingMode: "vertical-rl" }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        {record.hours ? (
          <p
            className={`flex items-center justify-center rounded-full border px-1.5 py-2.5 font-display text-base ${
              record.hours.openNow
                ? "border-[var(--accent)] text-[var(--accent)] fx-glow"
                : "border-[var(--border)] text-[var(--muted)]"
            }`}
            title={record.hours.statusLabel ?? undefined}
          >
            {record.hours.openNow ? "OPEN" : "CLOSED"}
          </p>
        ) : null}
      </nav>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--bg)]/90 px-5 backdrop-blur lg:hidden">
        <p className="font-display text-2xl tracking-wide text-[var(--text)]">{record.wordmark.text}</p>
        {record.hours ? (
          <p
            className={`border px-3 py-1 font-display text-sm tracking-[0.1em] ${
              record.hours.openNow
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--border)] text-[var(--muted)]"
            }`}
          >
            {record.hours.openNow ? "OPEN NOW" : "CLOSED"}
          </p>
        ) : null}
      </header>

      <div className="lg:pl-[76px]">
        {/* Asymmetric hero */}
        <section id="hero" aria-labelledby="hero-heading" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-25 blur-3xl"
            style={{ background: `radial-gradient(circle, ${p.primary}, transparent 65%)` }}
          />
          {record.hero.image ? (
            <div className="grid lg:grid-cols-[1.15fr_1fr]">
              <div className="order-2 px-5 pb-14 pt-12 sm:px-10 lg:order-1 lg:py-24 lg:pr-4">
                {record.hours?.statusLabel ? (
                  <p
                    className={`mb-6 inline-flex items-center gap-2 border px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] ${
                      record.hours.openNow
                        ? "border-[var(--accent)]/60 text-[var(--accent)]"
                        : "border-[var(--border)] text-[var(--muted)]"
                    }`}
                  >
                    <span aria-hidden="true" className="relative flex h-2 w-2">
                      {record.hours.openNow ? (
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60" />
                      ) : null}
                      <span
                        className="relative inline-flex h-2 w-2 rounded-full"
                        style={{ background: record.hours.openNow ? p.accent : p.muted }}
                      />
                    </span>
                    {record.hours.statusLabel}
                  </p>
                ) : null}
                <h1
                  id="hero-heading"
                  className="font-display text-[3.6rem] leading-[0.92] tracking-[0.01em] text-[var(--text)] fx-rise sm:text-[5rem] lg:text-[6.2rem]"
                >
                  {record.hero.headline}
                </h1>
                {record.hero.subheadline ? (
                  <p className="mt-6 max-w-[44ch] text-[15px] leading-relaxed text-[var(--muted)]">
                    {record.hero.subheadline}
                  </p>
                ) : null}
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  {record.cta.primary ? (
                    <ActionLink
                      cta={record.cta.primary}
                      className="inline-flex items-center gap-2 bg-[var(--accent)] px-7 py-3.5 font-display text-xl tracking-[0.08em] text-[var(--on-primary)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {record.cta.primary.label}
                      <ArrowUpRight size={18} strokeWidth={2} aria-hidden="true" />
                    </ActionLink>
                  ) : null}
                  {record.cta.secondary[0] ? (
                    <ActionLink
                      cta={record.cta.secondary[0]}
                      className="border border-[var(--secondary)]/50 px-6 py-3 font-display text-xl tracking-[0.08em] text-[var(--secondary)] transition-colors hover:border-[var(--secondary)]"
                    />
                  ) : null}
                </div>
                {record.reputation ? (
                  <p className="mt-8 flex items-center gap-2 text-sm text-[var(--muted)]">
                    <Star size={15} strokeWidth={1.5} className="fill-[var(--accent)] text-[var(--accent)]" aria-hidden="true" />
                    {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
                  </p>
                ) : null}
              </div>
              <div className="order-1 lg:order-2">
                <div
                  className="h-64 overflow-hidden sm:h-80 lg:h-full lg:min-h-[640px]"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 12% 100%)" }}
                >
                  {record.hero.image ? (
                    <SmartImage
                      image={record.hero.image}
                      priority
                      fill
                      sizes="(min-width: 1024px) 45vw, 100vw"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {record.announcement ? (
          <div className="border-y border-[var(--border)] bg-[var(--surface)] px-5 py-3.5 sm:px-10">
            <p className="text-[13px] uppercase tracking-[0.14em] text-[var(--secondary)]">
              {record.announcement}
            </p>
          </div>
        ) : null}

        {record.about || record.services.length + record.amenities.length > 0 ? (
          <section aria-labelledby="about-heading" className="px-5 py-14 sm:px-10">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,180px)_1fr]">
              <h2 id="about-heading" className="font-display text-4xl tracking-[0.02em] text-[var(--text)]">
                THE LOWDOWN
              </h2>
              <div>
                {record.about ? (
                  <p className="max-w-[64ch] text-[15px] leading-relaxed text-[var(--muted)]">{record.about.body}</p>
                ) : null}
                {record.services.length + record.amenities.length > 0 ? (
                  <ul className={`flex flex-wrap gap-2.5 ${record.about ? "mt-6" : ""}`}>
                    {[...record.services, ...record.amenities].slice(0, 6).map((item) => (
                      <li
                        key={item.key + item.label}
                        className="border border-[var(--secondary)]/50 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--secondary)]"
                      >
                        {item.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        {record.menu ? (
          <section id="menu" aria-labelledby="menu-heading" className="px-5 py-16 sm:px-10 lg:py-24">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 id="menu-heading" className="font-display text-6xl leading-none text-[var(--text)] lg:text-7xl">
                {record.menu.mode === "sample" ? "SAMPLE MENU" : "THE MENU"}
              </h2>
              {record.menu.notice ? (
                <p className="max-w-sm text-[12.5px] leading-relaxed text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                  {record.menu.notice}
                </p>
              ) : null}
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {record.menu.sections.map((section, index) => (
                <div
                  key={section.id}
                  className="border border-[var(--border)] bg-[var(--surface)] p-7 fx-reveal"
                  style={index % 2 === 1 ? { borderTop: `3px solid ${p.primary}` } : { borderTop: `3px solid ${p.secondary}` }}
                >
                  <h3 className="font-display text-3xl tracking-[0.04em] text-[var(--text)]">{section.name}</h3>
                  {section.description ? (
                    <p className="mt-1 text-[12.5px] uppercase tracking-[0.12em] text-[var(--muted)]">
                      {section.description}
                    </p>
                  ) : null}
                  <ul className="mt-6 divide-y divide-[var(--border)]">
                    {section.items.map((item) => (
                      <li key={item.id} className="flex items-baseline justify-between gap-4 py-3.5">
                        <span>
                          <span className="text-[15px] font-semibold text-[var(--text)]">{item.name}</span>
                          {item.description ? (
                            <span className="mt-0.5 block max-w-[38ch] text-[13px] leading-snug text-[var(--muted)]">
                              {item.description}
                            </span>
                          ) : null}
                          {item.tags.length > 0 ? (
                            <span className="mt-1.5 flex flex-wrap gap-1.5">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="border border-[var(--secondary)]/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[var(--secondary)]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </span>
                        {item.price ? (
                          <span className="font-display text-2xl text-[var(--accent)]">{item.price}</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {marqueeItems.length > 0 && record.motion === "expressive" ? (
          <section aria-label="Guest reviews" className="overflow-hidden border-y border-[var(--border)] bg-[var(--surface)] py-8">
            <div className="flex w-max fx-marquee-track" aria-hidden="true">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center">
                  {marqueeItems.map((text, index) => (
                    <p
                      key={`${copy}-${index}`}
                      className="flex items-center whitespace-nowrap font-display text-3xl tracking-[0.03em]"
                      style={{ color: index % 2 === 0 ? p.text : p.muted }}
                    >
                      <span className="mx-6" style={{ color: p.primary }}>
                        &ldquo;{text}&rdquo;
                      </span>
                      <span aria-hidden="true" style={{ color: p.secondary }}>
                        {"///"}
                      </span>
                    </p>
                  ))}
                </div>
              ))}
            </div>
            <ul className="sr-only">
              {record.reputation?.reviews.map((review) => (
                <li key={review.id}>
                  {review.rating} out of 5, {review.authorName}: {review.text}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {record.gallery ? (
          <section id="gallery" aria-labelledby="gallery-heading" className="px-5 py-16 sm:px-10">
            <h2 id="gallery-heading" className="mb-8 font-display text-5xl text-[var(--text)]">
              {record.gallery.title ?? "AFTER DARK"}
            </h2>
            <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {record.gallery.images.slice(0, 4).map((image, index) => (
                <li
                  key={image.url}
                  className={`overflow-hidden border border-[var(--border)] fx-reveal ${index % 2 === 1 ? "lg:translate-y-6" : ""}`}
                >
                  <SmartImage
                    image={image}
                    width={600}
                    height={740}
                    sizes="(min-width: 1024px) 24vw, 48vw"
                    className="h-auto w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105"
                    attributionClassName="sr-only"
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section id="find" aria-labelledby="find-heading" className="border-t border-[var(--border)] px-5 py-16 sm:px-10 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 id="find-heading" className="font-display text-5xl text-[var(--text)]">
                FIND US
              </h2>
              {record.hours ? (
                <div className="mt-7">
                  <p className="mb-3 flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-[var(--secondary)]">
                    <Clock size={14} strokeWidth={1.5} aria-hidden="true" /> Hours
                  </p>
                  <HoursList hours={record.hours} className="space-y-1.5 text-sm text-[var(--muted)]" />
                </div>
              ) : null}
              {record.contact.phone ? (
                <p className="mt-7 flex items-center gap-2.5 text-sm text-[var(--muted)]">
                  <Phone size={15} strokeWidth={1.5} aria-hidden="true" />
                  <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--accent)]">
                    {record.contact.phone}
                  </a>
                </p>
              ) : null}
              {record.contact.socials.length > 0 ? (
                <ul className="mt-6 flex gap-4 text-[13px] uppercase tracking-[0.12em]">
                  {record.contact.socials.map((social) => (
                    <li key={social.url}>
                      <a href={social.url} target="_blank" rel="noopener noreferrer" className="text-[var(--muted)] hover:text-[var(--accent)]">
                        {social.label ?? social.platform} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            {record.location ? (
              <MapSection
                location={record.location}
                businessName={record.identity.name}
                directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                embedClassName="h-[340px] w-full border border-[var(--border)]"
                cardClassName="border border-[var(--border)] bg-[var(--surface)] p-8"
                addressClassName="text-sm text-[var(--text)]"
                buttonClassName="inline-flex items-center gap-2 border border-[var(--primary)] px-5 py-2.5 font-display text-lg tracking-[0.08em] text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[#0b0b12]"
              />
            ) : null}
          </div>
        </section>

        <footer className="border-t border-[var(--border)] px-5 py-10 sm:px-10">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <p className="font-display text-4xl text-[var(--text)]">{record.wordmark.text}</p>
            <ConceptNotice
              record={record}
              labelClassName="text-[10.5px] uppercase tracking-[0.22em] text-[var(--secondary)]"
              bodyClassName="mt-1.5 max-w-md text-[12px] leading-relaxed text-[var(--muted)]"
            />
          </div>
        </footer>
      </div>

      <MobileActionBar record={record} />
    </div>
  );
}
