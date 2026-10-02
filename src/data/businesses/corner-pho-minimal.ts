import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, sv } from "./helpers";

/**
 * Minimal-data fixture: name, category, phone, address, coordinates.
 * No imagery, no hours, no reviews, no menu. The hardest fallback case.
 */
export const cornerPhoMinimal: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-corner-pho",
  slug: "corner-pho",
  status: "active",
  themeId: "minimal-japanese",

  identity: {
    placeId: "place_cp_demo_012",
    name: sv("Corner Phở", "google_places", { verified: true }),
    primaryCategory: sv("Vietnamese restaurant", "google_places", { verified: true }),
    categories: sv(["Vietnamese restaurant"], "google_places"),
    businessStatus: sv("operational", "google_places", { retrievedAt: "2026-09-19T11:00:00Z" }),
  },

  hero: {
    primaryAction: null,
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (718) 555-0134", "google_places", { verified: true }),
  },

  location: {
    formattedAddress: sv("8102 37th Ave, Jackson Heights, Queens, NY 11372", "google_places", { verified: true }),
    city: sv("Queens", "google_places", { verified: true }),
    region: sv("New York", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(40.7476, "google_places", { verified: true }),
    longitude: sv(-73.8814, "google_places", { verified: true }),
  },

  media: {
    images: [],
  },

  callsToAction: {
    call: { label: "Call", href: "+1 (718) 555-0134", kind: "call" },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-19T11:00:00Z",
  },
};
