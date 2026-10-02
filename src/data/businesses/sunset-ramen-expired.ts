import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, sv } from "./helpers";

/**
 * Expired fixture. POC concepts have a selling window; after it, the demo
 * route renders the expired state instead of the themed site.
 */
export const sunsetRamenExpired: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-sunset-ramen",
  slug: "sunset-ramen",
  status: "expired",
  expiresAt: "2026-09-01T00:00:00Z",
  themeId: "neon-night",

  identity: {
    placeId: "place_sr_demo_015",
    name: sv("Sunset Ramen", "google_places", { verified: true }),
    primaryCategory: sv("Ramen restaurant", "google_places", { verified: true }),
    categories: sv(["Ramen restaurant"], "google_places"),
    businessStatus: sv("operational", "google_places", { verified: true }),
  },

  hero: {
    image: {
      value: img(
        "srm-hero",
        "https://picsum.photos/seed/sunset-ramen-hero/1600/1000",
        "A ramen counter glowing warm at dusk",
        { role: "hero", source: "google_places", width: 1600, height: 1000 },
      ),
      source: "google_places",
    },
    primaryAction: null,
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (415) 555-0193", "google_places", { verified: true }),
  },

  location: {
    formattedAddress: sv("1224 Irving St, San Francisco, CA 94122", "google_places", { verified: true }),
    city: sv("San Francisco", "google_places", { verified: true }),
    region: sv("California", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(37.7633, "google_places", { verified: true }),
    longitude: sv(-122.4737, "google_places", { verified: true }),
  },

  hours: {
    openNow: sv(false, "google_places"),
    statusLabel: sv("Closed", "google_places"),
  },

  media: {
    images: [],
  },

  callsToAction: {
    call: { label: "Call", href: "+1 (415) 555-0193", kind: "call", source: "manual", verified: true },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-07-15T00:00:00Z",
  },
};
