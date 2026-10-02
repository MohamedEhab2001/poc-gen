import { Phone, Star } from "lucide-react";
import type { ThemeProps } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";
import { AttributionLine } from "@/components/poc/attribution/AttributionLine";
import { ConceptNotice } from "@/components/poc/ConceptNotice";
import { HoursList } from "@/components/poc/HoursList";
import { MobileActionBar } from "@/components/poc/MobileActionBar";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { MapSection } from "@/components/poc/map/MapSection";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/Stagger";
import { display, body } from "./fonts";

/** Splits the record headline and marker-highlights its final word. */
function memphisHeadline(headline: string): React.ReactNode {
  const words = headline.trim().split(/\s+/);
  if (words.length < 2) return headline;
  const last = words.pop() as string;
  return (
    <>
      {words.join(" ")}{" "}
      <span className="relative inline-block">
        <span
          aria-hidden="true"
          className="absolute inset-x-[-8px] bottom-[8%] top-[36%] -rotate-1 rounded-sm bg-[var(--accent)]"
        />
        <span className="relative">{last}</span>
      </span>
    </>
  );
}

/** Wobbly squiggle divider in theme colors. */
function Squiggle({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 240 20"
      width="200"
      height="16"
      aria-hidden="true"
      className={flip ? "-scale-y-100" : undefined}
    >
      <path
        d="M0 10 C 15 0, 30 20, 45 10 C 60 0, 75 20, 90 10 C 105 0, 120 20, 135 10 C 150 0, 165 20, 180 10 C 195 0, 210 20, 225 10 C 232 5, 238 8, 240 10"
        fill="none"
        stroke="var(--primary)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Floating Memphis shape set: circle, triangle, zigzag. Animations pause under reduced motion. */
function FloatingShapes() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <span
        className="fx-float absolute right-[8%] top-[12%] h-20 w-20 rounded-full border-[7px] border-[var(--secondary)]"
        style={{ "--tilt": "0deg" } as React.CSSProperties}
      />
      <span
        className="fx-float absolute bottom-[16%] left-[6%] h-0 w-0 border-l-[30px] border-r-[30px] border-b-[52px] border-l-transparent border-r-transparent border-b-[var(--accent)]"
        style={{ "--tilt": "-8deg", animationDelay: "0.8s" } as React.CSSProperties}
      />
      <span
        className="fx-float absolute right-[22%] top-[58%] hidden md:block"
        style={{ "--tilt": "6deg", animationDelay: "1.6s" } as React.CSSProperties}
      >
        <svg viewBox="0 0 90 26" width="90" height="26">
          <path
            d="M2 22 L16 6 L30 22 L44 6 L58 22 L72 6 L86 22"
            fill="none"
            stroke="var(--primary)"
            strokeWidth="6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="fx-bob absolute left-[16%] top-[10%] h-4 w-4 rounded-full bg-[var(--primary)]" />
      <span className="fx-bob absolute bottom-[8%] right-[12%] h-3 w-3 rounded-full bg-[var(--accent)]" style={{ animationDelay: "1.1s" }} />
    </div>
  );
}

/**
 * Memphis Play: playful geometry for dessert shops and bubble tea. Cream,
 * cobalt, coral, and butter yellow; floating shapes, squiggle rules, price
 * bubbles, blob image masks, and springy staggered entrances.
 */
export default function MemphisPlayTheme({ record }: ThemeProps) {
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
    "--on-primary": "#fdf8ee",
    "--radius": "22px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  const cardTints = ["#eaf0ff", "#ffece5", "#fff6d9", "#e7f7ef"];

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      <header className="sticky top-0 z-40 border-b-2 border-dashed border-[var(--border)] bg-[var(--bg)]/92 backdrop-blur">
        <div className="poc-container flex h-16 items-center justify-between">
          <a href="#hero" className="font-display text-lg font-bold tracking-tight text-[var(--text)]">
            {record.wordmark.text}
          </a>
          <nav aria-label="Primary" className="hidden items-center gap-2.5 text-[13px] font-bold text-[var(--text)] md:flex">
            {record.menu ? (
              <a href="#menu" className="rounded-full bg-[var(--primary)]/10 px-4 py-2 transition-colors hover:bg-[var(--primary)] hover:text-white">
                Menu
              </a>
            ) : null}
            {record.gallery ? (
              <a href="#fun" className="rounded-full bg-[var(--secondary)]/10 px-4 py-2 transition-colors hover:bg-[var(--secondary)] hover:text-white">
                Fun
              </a>
            ) : null}
            <a href="#visit" className="rounded-full bg-[var(--accent)]/25 px-4 py-2 transition-colors hover:bg-[var(--accent)]">
              Visit
            </a>
          </nav>
          {record.hours?.statusLabel ? (
            <p className="rounded-full border-2 border-[var(--text)] bg-[var(--accent)] px-3.5 py-1.5 text-[11.5px] font-extrabold uppercase">
              {record.hours.statusLabel}
            </p>
          ) : null}
        </div>
      </header>

      {/* Hero: marker highlight + blob image + floating shapes */}
      <section id="hero" aria-labelledby="hero-heading" className="relative overflow-hidden">
        <FloatingShapes />
        <div className="poc-container relative grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            {record.hero.eyebrow ? (
              <Reveal>
                <p className="mb-5 inline-block -rotate-2 rounded-full bg-[var(--text)] px-4 py-1.5 text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">
                  {record.hero.eyebrow}
                </p>
              </Reveal>
            ) : null}
            <Reveal delay={0.1}>
              <h1 id="hero-heading" className="font-display text-[2.1rem] font-extrabold leading-[1.12] tracking-tight md:text-[3.1rem]">
                {memphisHeadline(record.hero.headline)}
              </h1>
            </Reveal>
            {record.hero.subheadline ? (
              <Reveal delay={0.2}>
                <p className="mt-6 max-w-[44ch] text-[15.5px] font-medium leading-relaxed text-[var(--muted)]">
                  {record.hero.subheadline}
                </p>
              </Reveal>
            ) : null}
            {record.reputation ? (
              <Reveal delay={0.26}>
                <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13.5px] font-extrabold text-[var(--text)] shadow-[0_6px_0_var(--border)]">
                  <Star size={15} strokeWidth={2} className="fill-[var(--accent)] text-[var(--accent)]" aria-hidden="true" />
                  {record.reputation.rating.toFixed(1)} · {record.reputation.reviewCount.toLocaleString("en-US")} reviews
                </p>
              </Reveal>
            ) : null}
            <Reveal delay={0.32}>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                {record.cta.primary ? (
                  <ActionLink
                    cta={record.cta.primary}
                    className="rounded-full bg-[var(--primary)] px-8 py-4 text-[15px] font-extrabold text-white shadow-[0_8px_0_var(--text)] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:shadow-[0_10px_0_var(--text)] active:translate-y-0.5 active:shadow-[0_4px_0_var(--text)]"
                  />
                ) : null}
                {record.cta.secondary[0] ? (
                  <ActionLink
                    cta={record.cta.secondary[0]}
                    className="rounded-full border-[3px] border-[var(--text)] bg-white px-7 py-3.5 text-[14px] font-extrabold text-[var(--text)] transition-transform hover:-translate-y-0.5"
                  />
                ) : null}
              </div>
            </Reveal>
          </div>
          {record.hero.image ? (
            <Reveal delay={0.18} className="relative">
              <div className="relative mx-auto aspect-[4/5] w-full max-w-[520px] overflow-hidden rounded-[46%_54%_52%_48%/54%_46%_56%_44%] border-[6px] border-[var(--text)]">
                <SmartImage
                  image={record.hero.image}
                  priority
                  fill
                  sizes="(min-width: 1024px) 44vw, 92vw"
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="fx-bob absolute -left-2 top-8 -rotate-6 rounded-full bg-[var(--secondary)] px-4 py-2 text-[11.5px] font-extrabold uppercase tracking-wide text-white shadow-md">
                Extra boba, always
              </p>
            </Reveal>
          ) : null}
        </div>
      </section>

      {record.announcement ? (
        <div className="border-y-2 border-dashed border-[var(--border)] bg-white py-3.5">
          <p className="poc-container flex flex-wrap items-center justify-center gap-3 text-center text-[13.5px] font-extrabold text-[var(--text)]">
            <span aria-hidden="true">◆</span>
            {record.announcement}
            <span aria-hidden="true">◆</span>
          </p>
        </div>
      ) : null}

      {record.menu ? (
        <section id="menu" aria-labelledby="menu-heading" className="poc-container py-16 md:py-24">
          <div className="mb-12 text-center">
            <Reveal>
              <h2 id="menu-heading" className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
                The menu
              </h2>
            </Reveal>
            <div className="mt-5 flex justify-center">
              <Squiggle />
            </div>
            {record.offering.dietaryOptions.length > 0 ? (
              <p className="mt-4 text-[13px] font-bold text-[var(--muted)]">
                {record.offering.dietaryOptions.join(" · ")}
              </p>
            ) : null}
            {record.menu.notice ? (
              <p className="mx-auto mt-3 max-w-md text-[12.5px] font-medium text-[var(--muted)]" data-provenance={record.menu.mode === "sample" ? "sample menu" : undefined}>
                {record.menu.notice}
              </p>
            ) : null}
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {record.menu.sections.map((section, index) => (
              <div
                key={section.id}
                className="rounded-[var(--radius)] border-[3px] border-[var(--text)] p-6 md:p-8"
                style={{ background: cardTints[index % cardTints.length] }}
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-display text-xl font-extrabold tracking-tight">{section.name}</h3>
                  <span aria-hidden="true" className="h-5 w-5 rounded-full bg-[var(--text)]" />
                </div>
                {section.description ? (
                  <p className="mt-1 text-[12.5px] font-bold uppercase tracking-wide text-[var(--muted)]">
                    {section.description}
                  </p>
                ) : null}
                <StaggerGroup className="mt-6 space-y-4" gap={0.08}>
                  {section.items.map((item) => (
                    <StaggerItem key={item.id}>
                      <div className="flex items-start gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-[15.5px] font-extrabold">
                            {item.name}
                            {item.featured ? (
                              <span className="ml-2 inline-block rotate-3 rounded-full bg-[var(--primary)] px-2 py-0.5 align-middle text-[9.5px] font-extrabold uppercase tracking-wide text-white">
                                Fav
                              </span>
                            ) : null}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-[13px] font-medium leading-snug text-[var(--muted)]">
                              {item.description}
                            </p>
                          ) : null}
                          {item.tags.length > 0 ? (
                            <p className="mt-1.5 flex flex-wrap gap-1.5">
                              {item.tags.map((tag) => (
                                <span key={tag} className="rounded-full border-2 border-[var(--secondary)] px-2 py-0.5 text-[10px] font-extrabold uppercase text-[var(--secondary)]">
                                  {tag}
                                </span>
                              ))}
                            </p>
                          ) : null}
                        </div>
                        {item.price ? (
                          <p className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-extrabold text-[var(--text)] shadow-[0_4px_0_var(--text)]">
                            {item.price.replace("$", "")}
                          </p>
                        ) : null}
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {record.gallery ? (
        <section id="fun" aria-labelledby="fun-heading" className="poc-container pb-16 md:pb-24">
          <div className="mb-10 text-center">
            <Reveal>
              <h2 id="fun-heading" className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
                {record.gallery.title ?? "The fun wall"}
              </h2>
            </Reveal>
            <div className="mt-5 flex justify-center">
              <Squiggle flip />
            </div>
          </div>
          <StaggerGroup className="grid grid-cols-2 gap-5 lg:grid-cols-4" gap={0.1}>
            {record.gallery.images.slice(0, 4).map((image, index) => (
              <StaggerItem key={image.url} className={index % 2 === 1 ? "lg:translate-y-5" : ""}>
                <div
                  className="overflow-hidden border-[4px] border-[var(--text)] shadow-[6px_6px_0_var(--text)]"
                  style={{
                    borderRadius: index % 2 === 0 ? "44% 56% 52% 48% / 48% 44% 56% 52%" : "56% 44% 48% 52% / 44% 56% 44% 56%",
                  }}
                >
                  <SmartImage
                    image={image}
                    width={600}
                    height={560}
                    sizes="(min-width: 1024px) 24vw, 48vw"
                    className="h-auto w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-110"
                    attributionClassName="sr-only"
                  />
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      ) : null}

      {record.reputation && record.reputation.reviews.length > 0 ? (
        <section aria-labelledby="reviews-heading" className="poc-container pb-16 md:pb-24">
          <StaggerGroup className="grid gap-6 md:grid-cols-3" gap={0.12}>
            {record.reputation.reviews.slice(0, 3).map((review, index) => (
              <StaggerItem key={review.id}>
                <figure
                  className={`relative rounded-[var(--radius)] border-[3px] border-[var(--text)] bg-white p-6 shadow-[6px_6px_0_var(--text)] ${
                    index === 1 ? "md:-rotate-1" : index === 2 ? "md:rotate-1" : ""
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-3 left-6 h-6 w-6 rotate-12 rounded-full"
                    style={{ background: cardTints[(index + 1) % cardTints.length], border: "3px solid var(--text)" }}
                  />
                  <div className="mb-2 flex" aria-label={`${review.rating} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((step) => (
                      <Star key={step} size={14} strokeWidth={2} className={step <= review.rating ? "fill-[var(--accent)] text-[var(--accent)]" : "text-[var(--border)]"} />
                    ))}
                  </div>
                  <blockquote className="text-[14.5px] font-bold leading-relaxed">
                    &ldquo;{review.text}&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 inline-block rounded-full bg-[var(--primary)]/10 px-3 py-1 text-[11.5px] font-extrabold uppercase tracking-wide text-[var(--primary)]">
                    {review.authorName}
                  </figcaption>
                  {review.attribution ? (
                    <AttributionLine attribution={review.attribution} className="mt-2 block text-[10.5px] text-[var(--muted)]" />
                  ) : null}
                </figure>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>
      ) : null}

      {record.about || record.services.length + record.amenities.length > 0 ? (
        <section aria-label="About" className="poc-container max-w-3xl pb-16 text-center md:pb-24">
          <div className="rounded-[var(--radius)] border-[3px] border-dashed border-[var(--primary)] bg-white/70 p-8 md:p-10">
            {record.about ? (
              <Reveal>
                <h2 className="font-display text-2xl font-extrabold tracking-tight">{record.about.title}</h2>
                <p className="mt-4 text-[14.5px] font-medium leading-relaxed text-[var(--muted)]">{record.about.body}</p>
              </Reveal>
            ) : null}
            {record.services.length + record.amenities.length > 0 ? (
              <Reveal delay={0.1}>
                <ul className={`flex flex-wrap justify-center gap-2.5 ${record.about ? "mt-7" : ""}`}>
                  {[...record.services, ...record.amenities].slice(0, 6).map((item) => (
                    <li key={item.key + item.label} className="rounded-full bg-[var(--accent)]/25 px-3.5 py-1.5 text-[12px] font-extrabold text-[var(--text)]">
                      {item.label}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}
          </div>
        </section>
      ) : null}

      <section id="visit" aria-labelledby="visit-heading" className="poc-container grid gap-10 pb-20 lg:grid-cols-2">
        <Reveal>
          <div className="rounded-[var(--radius)] border-[3px] border-[var(--text)] bg-white p-7 shadow-[8px_8px_0_var(--primary)]">
            <h2 id="visit-heading" className="font-display text-2xl font-extrabold tracking-tight">
              Come get loud
            </h2>
            {record.hours ? (
              <div className="mt-6">
                <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--primary)]">Hours</p>
                <HoursList hours={record.hours} className="space-y-1.5 text-[14px] font-semibold" />
              </div>
            ) : null}
            {record.contact.phone ? (
              <p className="mt-6 flex items-center gap-2.5 text-[14.5px] font-extrabold">
                <Phone size={16} strokeWidth={2} aria-hidden="true" />
                <a href={`tel:${record.contact.phone.replace(/[^\d+]/g, "")}`} className="hover:text-[var(--primary)]">
                  {record.contact.phone}
                </a>
              </p>
            ) : null}
            {record.contact.socials.length > 0 ? (
              <ul className="mt-4 flex gap-3">
                {record.contact.socials.map((social) => (
                  <li key={social.url}>
                    <a
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-full border-2 border-[var(--text)] px-4 py-1.5 text-[12.5px] font-extrabold transition-transform hover:-translate-y-0.5"
                    >
                      {social.label ?? social.platform}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </Reveal>
        {record.location ? (
          <Reveal delay={0.12}>
            <div className="rounded-[var(--radius)] border-[3px] border-[var(--text)] bg-white shadow-[8px_8px_0_var(--secondary)]">
              <MapSection
                location={record.location}
                businessName={record.identity.name}
                directionsCta={record.cta.secondary.find((cta) => cta.kind === "directions") ?? null}
                embedClassName="h-[300px] w-full rounded-t-[19px] border-0"
                cardClassName="p-7"
                addressClassName="text-[14px] font-bold"
                buttonClassName="mt-2 inline-block rounded-full bg-[var(--secondary)] px-6 py-2.5 text-[12.5px] font-extrabold text-white shadow-[0_4px_0_var(--text)]"
              />
            </div>
          </Reveal>
        ) : null}
      </section>

      <footer className="border-t-2 border-dashed border-[var(--border)] bg-[var(--text)] py-12 text-[var(--bg)]">
        <div className="poc-container flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-4" aria-hidden="true">
            <span className="h-4 w-4 rounded-full bg-[var(--secondary)]" />
            <span className="h-3 w-3 rotate-45 bg-[var(--accent)]" />
            <span className="h-4 w-4 rounded-full bg-[var(--primary)]" />
          </div>
          <p className="font-display text-3xl font-extrabold tracking-tight text-[var(--accent)]">
            {record.wordmark.text}
          </p>
          <ConceptNotice
            record={record}
            labelClassName="text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-[#9c9890]"
            bodyClassName="mt-2 max-w-md text-[12px] font-medium leading-relaxed text-[#b5b1a8]"
          />
        </div>
      </footer>

      <MobileActionBar record={record} />
    </div>
  );
}
