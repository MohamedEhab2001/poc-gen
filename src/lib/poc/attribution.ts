import type { Attribution } from "./schema";

/**
 * Formats a human-readable attribution line for required credits.
 * Returns null when no attribution object exists.
 */
export function attributionLine(attribution: Attribution | null | undefined): string | null {
  if (!attribution) return null;
  const parts: string[] = [];
  if (attribution.authorName) parts.push(attribution.authorName);
  parts.push(attribution.label);
  return parts.join(" · ");
}

/** True when the attribution is legally required to be visible. */
export function isRequiredAttribution(attribution: Attribution | null | undefined): boolean {
  return Boolean(attribution && attribution.label.length > 0);
}
