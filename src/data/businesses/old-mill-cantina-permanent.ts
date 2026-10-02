import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, sv } from "./helpers";

/**
 * Permanently closed fixture. The demo route must render the safe internal
 * closed state, never an active-looking sales POC.
 */
export const oldMillCantinaPermanent: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-old-mill",
  slug: "old-mill-cantina",
  status: "active",
  themeId: "mediterranean-sun",

  identity: {
    placeId: "place_om_demo_014",
    name: sv("Old Mill Cantina", "google_places", { verified: true }),
    primaryCategory: sv("Mexican restaurant", "google_places", { verified: true }),
    categories: sv(["Mexican restaurant"], "google_places"),
    businessStatus: sv("permanently_closed", "google_places", { verified: true, retrievedAt: "2026-08-30T00:00:00Z" }),
  },

  hero: {
    primaryAction: null,
    secondaryAction: null,
  },

  contact: {},

  location: {
    formattedAddress: sv("77 Mill St, Chattanooga, TN 37405", "google_places", { verified: true }),
    city: sv("Chattanooga", "google_places", { verified: true }),
    region: sv("Tennessee", "google_places"),
    country: sv("United States", "google_places"),
  },

  media: {
    images: [],
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-08-30T00:00:00Z",
  },
};
