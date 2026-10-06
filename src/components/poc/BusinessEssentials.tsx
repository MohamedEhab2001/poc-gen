import { Clock3, Mail, MapPin, Phone, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ActionLink } from "@/components/poc/ActionLink";
import { Reveal } from "@/components/poc/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/poc/motion/StaggerGroup";
import type { ResolvedBusiness, ThemeId } from "@/lib/poc/types";

type VisualVariant = "classic" | "dark" | "minimal" | "poster" | "playful";

const variants: Record<
  VisualVariant,
  { section: string; eyebrow: string; heading: string; grid: (facts: number) => string; card: string; icon: string; label: string; value: string; note: string; action: string }
> = {
  classic: {
    section: "border-y border-[var(--border)] bg-[var(--surface)] py-16 md:py-20",
    eyebrow: "text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--primary)]",
    heading: "mt-3 font-display text-4xl leading-tight text-[var(--text)] md:text-5xl",
    grid: (facts) =>
      `mt-10 grid gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 ${columnsFor(facts)}`,
    card: "min-h-44 bg-[var(--bg)] p-6 md:p-7",
    icon: "text-[var(--primary)]",
    label: "mt-8 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]",
    value: "mt-2 text-[15px] font-semibold leading-snug text-[var(--text)]",
    note: "mt-2 text-[12.5px] leading-relaxed text-[var(--muted)]",
    action: "border border-[var(--primary)] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-[var(--on-primary)]",
  },
  dark: {
    section: "border-y border-[var(--border)] bg-[var(--surface)] py-16 text-[var(--text)] md:py-20",
    eyebrow: "text-[10.5px] font-semibold uppercase tracking-[0.26em] text-[var(--accent)]",
    heading: "mt-3 font-display text-4xl leading-tight text-[var(--text)] md:text-5xl",
    grid: (facts) => `mt-10 grid gap-4 sm:grid-cols-2 ${columnsFor(facts)}`,
    card: "min-h-44 border border-[var(--border)] bg-[var(--bg)] p-6",
    icon: "text-[var(--accent)]",
    label: "mt-8 text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]",
    value: "mt-2 text-[14.5px] font-medium leading-snug text-[var(--text)]",
    note: "mt-2 text-[12px] leading-relaxed text-[var(--muted)]",
    action: "border border-[var(--accent)] px-5 py-2.5 text-[10.5px] uppercase tracking-[0.2em] text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--on-accent)]",
  },
  minimal: {
    section: "border-y border-[var(--border)] bg-[var(--bg)] py-20 md:py-24",
    eyebrow: "text-[10px] uppercase tracking-[0.28em] text-[var(--muted)]",
    heading: "mt-4 font-display text-4xl font-normal leading-tight text-[var(--text)] md:text-5xl",
    grid: (facts) =>
      `mt-12 grid border-t border-l border-[var(--border)] sm:grid-cols-2 ${columnsFor(facts)}`,
    card: "min-h-48 border-b border-r border-[var(--border)] bg-[var(--bg)] p-7",
    icon: "text-[var(--accent)]",
    label: "mt-10 text-[9.5px] uppercase tracking-[0.24em] text-[var(--muted)]",
    value: "mt-3 text-[14px] leading-relaxed text-[var(--text)]",
    note: "mt-2 text-[11.5px] leading-relaxed text-[var(--muted)]",
    action: "border-b border-[var(--text)] py-2 text-[10px] uppercase tracking-[0.22em] text-[var(--text)]",
  },
  poster: {
    section: "border-y-4 border-[var(--text)] bg-[var(--primary)] py-14 text-[var(--on-primary)] md:py-18",
    eyebrow: "inline-block -rotate-1 bg-[var(--accent)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--on-accent)]",
    heading: "mt-4 font-display text-5xl uppercase leading-none tracking-tight md:text-6xl",
    grid: (facts) => `mt-10 grid gap-5 sm:grid-cols-2 ${columnsFor(facts)}`,
    card: "min-h-44 border-4 border-[var(--text)] bg-[var(--bg)] p-6 text-[var(--text)] shadow-[6px_6px_0_var(--text)]",
    icon: "text-[var(--secondary)]",
    label: "mt-7 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]",
    value: "mt-2 text-[15px] font-extrabold uppercase leading-snug",
    note: "mt-2 text-[12px] font-semibold leading-relaxed text-[var(--muted)]",
    action: "border-2 border-[var(--text)] bg-[var(--accent)] px-6 py-3 text-[11.5px] font-extrabold uppercase tracking-[0.12em] text-[var(--on-accent)] shadow-[4px_4px_0_var(--text)]",
  },
  playful: {
    section: "border-y-2 border-dashed border-[var(--border)] bg-[var(--surface)] py-16 md:py-20",
    eyebrow: "inline-flex rounded-full bg-[var(--accent)] px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[var(--on-accent)]",
    heading: "mt-4 font-display text-4xl font-bold leading-tight text-[var(--text)] md:text-5xl",
    grid: (facts) => `mt-10 grid gap-5 sm:grid-cols-2 ${columnsFor(facts)}`,
    card: "min-h-44 rounded-[var(--radius)] border-2 border-[var(--text)] bg-[var(--bg)] p-6 shadow-[0_5px_0_var(--text)]",
    icon: "text-[var(--primary)]",
    label: "mt-7 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]",
    value: "mt-2 text-[15px] font-bold leading-snug text-[var(--text)]",
    note: "mt-2 text-[12px] font-medium leading-relaxed text-[var(--muted)]",
    action: "rounded-full bg-[var(--primary)] px-6 py-3 text-[12px] font-bold text-[var(--on-primary)] shadow-[0_4px_0_var(--text)]",
  },
};

/**
 * Desktop column count that matches the actual number of fact cards so a
 * sparse record never renders an empty decorative column. 2 facts pair up,
 * 3 facts get a balanced row of three, 4 facts use the full four columns.
 */
function columnsFor(facts: number): string {
  if (facts >= 4) return "lg:grid-cols-4";
  if (facts === 3) return "lg:grid-cols-3";
  return "";
}

const visualFamily: Record<ThemeId, VisualVariant> = {
  "heritage-bistro": "classic",
  "neon-night": "dark",
  "minimal-japanese": "minimal",
  "mediterranean-sun": "playful",
  "coffee-editorial": "classic",
  "american-diner": "playful",
  "luxury-fine-dining": "dark",
  "street-food-poster": "poster",
  "botanical-brunch": "playful",
  "modern-industrial": "minimal",
  "deco-supper-club": "dark",
  "atelier-lookbook": "minimal",
  "memphis-play": "playful",
};

type Fact = { key: string; label: string; value: string; note: string | null; icon: LucideIcon };

/**
 * Adds factual content depth to evidence-light POCs without inventing a menu,
 * testimonials, hours, or marketing claims. Rich records already have enough
 * bespoke sections and intentionally skip this fallback.
 */
export function BusinessEssentials({ record }: { record: ResolvedBusiness }) {
  const richSectionCount = [
    record.about,
    record.menu,
    record.gallery && record.gallery.images.length >= 2 ? record.gallery : null,
    record.reputation && record.reputation.reviews.length > 0 ? record.reputation : null,
    record.services.length + record.amenities.length >= 3 ? true : null,
  ].filter(Boolean).length;
  if (richSectionCount >= 4) return null;

  const facts: Fact[] = [];
  facts.push({
    key: "category",
    label: "Business",
    value: record.identity.primaryCategory,
    note: record.identity.categories.filter((category) => category !== record.identity.primaryCategory).slice(0, 2).join(" · ") || null,
    icon: Store,
  });

  if (record.location) {
    const locality = [record.location.city, record.location.region].filter(Boolean).join(", ");
    facts.push({
      key: "location",
      label: "Location",
      value: locality || record.location.shortAddress || record.location.formattedAddress || "",
      note: locality ? record.location.shortAddress ?? record.location.formattedAddress : null,
      icon: MapPin,
    });
  }

  const hours = record.hours;
  const hoursValue = hours?.statusLabel ?? hours?.descriptions[0];
  if (hours && hoursValue) {
    facts.push({
      key: "hours",
      label: "Hours",
      value: hoursValue,
      note: hours.statusLabel ? hours.descriptions[0] ?? null : null,
      icon: Clock3,
    });
  }

  if (record.contact.phone || record.contact.email) {
    facts.push({
      key: "contact",
      label: "Contact",
      value: record.contact.phone ?? record.contact.email ?? "",
      note: record.contact.phone ? record.contact.email : null,
      icon: record.contact.phone ? Phone : Mail,
    });
  }

  if (facts.length < 2) return null;
  const style = variants[visualFamily[record.themeId]];
  const shown = facts.slice(0, 4);
  const actions = [
    record.cta.primary,
    ...record.cta.secondary.filter((action) => action.kind === "directions" || action.kind === "call" || action.kind === "email"),
  ]
    .filter((action, index, all) => action && all.findIndex((candidate) => candidate?.href === action.href) === index)
    .slice(0, 2);

  return (
    <section aria-labelledby="essentials-heading" className={style.section}>
      <div className="poc-container">
        <Reveal>
          <p className={style.eyebrow}>Verified essentials</p>
          <h2 id="essentials-heading" className={style.heading}>At a glance</h2>
        </Reveal>
        <StaggerGroup className={style.grid(shown.length)}>
          {shown.map((fact) => {
            const Icon = fact.icon;
            return (
              <StaggerItem key={fact.key}>
                <article className={style.card}>
                  <Icon size={22} strokeWidth={1.8} aria-hidden="true" className={style.icon} />
                  <p className={style.label}>{fact.label}</p>
                  <p className={style.value}>{fact.value}</p>
                  {fact.note ? <p className={style.note}>{fact.note}</p> : null}
                </article>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
        {actions.length > 0 ? (
          <Reveal delay={0.1}>
            <div className="mt-9 flex flex-wrap gap-4">
              {actions.map((action) => <ActionLink key={action!.href} cta={action!} className={style.action} />)}
            </div>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
