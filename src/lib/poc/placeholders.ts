import type { ResolvedBusiness } from "./types";

export interface PlaceholderReport {
  field: string;
  source: string;
  outcome: string;
  note?: string;
}

/**
 * Typed helper for internal review: returns every field that resolved to a
 * fallback, derivation, sample, or was hidden, so the outreach team can see
 * what a POC page is standing in for missing owner data.
 */
export function listUnresolved(record: ResolvedBusiness): PlaceholderReport[] {
  const report: PlaceholderReport[] = record.provenance
    .filter((entry) => entry.outcome !== "verified" && entry.outcome !== "unverified")
    .map(({ field, source, outcome, note }) => ({ field, source, outcome, note }));

  if (record.wordmark.outcome === "fallback") {
    report.push({
      field: "brand.logo",
      source: "fallback",
      outcome: "fallback",
      note: "Typographic wordmark in use",
    });
  }
  if (record.hero.image?.outcome === "fallback") {
    report.push({
      field: "hero.image",
      source: "fallback",
      outcome: "fallback",
      note: "Honest theme concept artwork in use; prefer licensed business media when available",
    });
  }
  if (!record.gallery) {
    report.push({ field: "media.images", source: "none", outcome: "hidden", note: "Gallery hidden" });
  }
  if (!record.menu) {
    report.push({ field: "offering.menu", source: "none", outcome: "hidden", note: "Menu hidden" });
  }
  if (!record.reputation) {
    report.push({
      field: "reputation",
      source: "none",
      outcome: "hidden",
      note: "Reviews hidden",
    });
  }
  if (!record.hours) {
    report.push({
      field: "hours",
      source: "none",
      outcome: "hidden",
      note: "Hours section hidden",
    });
  }
  if (!record.contact.phone) {
    report.push({
      field: "contact.phone",
      source: "none",
      outcome: "hidden",
      note: "Call actions removed",
    });
  }
  if (record.compactServiceStrip) {
    report.push({
      field: "services+amenities",
      source: "none",
      outcome: "fallback",
      note: "Compact strip: fewer than three entries",
    });
  }

  return report;
}
