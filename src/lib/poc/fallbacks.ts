import type { ThemeId } from "./schema";

/**
 * Placeholder and fallback material. Theme placeholder artwork is a local,
 * non-photographic SVG per theme: abstract pattern work that stands in for
 * missing imagery without implying it depicts the actual business.
 */
export const themePlaceholderHero: Record<ThemeId, string> = {
  "heritage-bistro": "/poc-placeholders/heritage-bistro-hero.svg",
  "neon-night": "/poc-placeholders/neon-night-hero.svg",
  "minimal-japanese": "/poc-placeholders/minimal-japanese-hero.svg",
  "mediterranean-sun": "/poc-placeholders/mediterranean-sun-hero.svg",
  "coffee-editorial": "/poc-placeholders/coffee-editorial-hero.svg",
  "american-diner": "/poc-placeholders/american-diner-hero.svg",
  "luxury-fine-dining": "/poc-placeholders/luxury-fine-dining-hero.svg",
  "street-food-poster": "/poc-placeholders/street-food-poster-hero.svg",
  "botanical-brunch": "/poc-placeholders/botanical-brunch-hero.svg",
  "modern-industrial": "/poc-placeholders/modern-industrial-hero.svg",
  "deco-supper-club": "/poc-placeholders/deco-supper-club-hero.svg",
  "atelier-lookbook": "/poc-placeholders/atelier-lookbook-hero.svg",
  "memphis-play": "/poc-placeholders/memphis-play-hero.svg",
};

export const SAMPLE_MENU_NOTICE =
  "This menu is illustrative sample content for demonstration purposes. Prices and availability are not confirmed.";

export const HOURS_NOT_PROVIDED = "Hours not provided";

/** Neutral, category-informed hero copy used when the record supplies none. */
export function fallbackHeadline(input: {
  name: string;
  primaryCategory: string;
  city: string | null;
}): string {
  const place = input.city ? ` in ${input.city}` : "";
  return `${input.primaryCategory}${place}`;
}

export function fallbackSubheadline(input: {
  primaryCategory: string;
  city: string | null;
}): string {
  const place = input.city ? ` in ${input.city}` : "";
  return `A welcoming spot for ${input.primaryCategory.toLowerCase()}${place}.`;
}

/** Outcome for a sourced value given its origin and confidence. */
export function outcomeForSourced(sourced: {
  source: string;
  verified?: boolean;
  confidence?: number | null;
}): "verified" | "unverified" | "derived" | "fallback" {
  if (sourced.source === "fallback") return "fallback";
  if (sourced.source === "ai_derived") {
    const confidence = sourced.confidence ?? 0;
    return confidence >= 0.7 ? "derived" : "fallback";
  }
  if (sourced.verified) return "verified";
  return "unverified";
}

/** Confidence threshold for showing derived values. */
export const DERIVED_CONFIDENCE_THRESHOLD = 0.7;
