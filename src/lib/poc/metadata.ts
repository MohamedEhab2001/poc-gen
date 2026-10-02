import type { Metadata } from "next";
import type { ResolvedBusiness } from "./types";

/**
 * Record-driven metadata for customer-facing POC routes. Always unindexed:
 * these are private outreach concepts, not public pages.
 */
export function buildPocMetadata(record: ResolvedBusiness): Metadata {
  const place = record.location?.city ? `, ${record.location.city}` : "";
  const title = `${record.identity.name} · Website concept`;
  const description = `A website concept for ${record.identity.name}, a ${record.identity.primaryCategory.toLowerCase()}${place}. Prepared as an unofficial demonstration.`;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: { index: false, follow: false, noimageindex: true },
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: record.identity.name,
    },
  };
}

export function pocSiteUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  return raw ? raw.replace(/\/$/, "") : null;
}
