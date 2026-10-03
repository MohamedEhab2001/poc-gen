import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, sv } from "./helpers";

/**
 * Partial-data fixture: no logo, no menu, two images, no email,
 * phone and directions CTAs only. Exercises the fallback engine.
 */
export const fjordCoffeePartial: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-fjord",
  slug: "fjord-coffee",
  status: "active",
  themeId: "coffee-editorial",

  identity: {
    placeId: "place_fc_demo_011",
    name: sv("Fjord Coffee", "google_places", { verified: true }),
    primaryCategory: sv("Coffee shop", "google_places", { verified: true }),
    categories: sv(["Coffee shop"], "google_places"),
    businessStatus: sv("operational", "google_places", { retrievedAt: "2026-09-24T10:00:00Z" }),
  },

  hero: {
    image: {
      value: img(
        "fj-hero",
        "https://picsum.photos/seed/fjord-coffee-hero/1600/1000",
        "A small espresso bar with two stools and a window",
        {
          role: "hero",
          source: "google_places",
          width: 1600,
          height: 1000,
          attribution: { label: "Listing photo via Google Maps" },
        },
      ),
      source: "google_places",
    },
    primaryAction: null,
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (206) 555-0172", "google_places", { verified: true }),
    socialLinks: sv([{ platform: "instagram", url: "https://www.instagram.com/fjordcoffee.example", label: "Instagram" }], "google_places", { verified: true }),
  },

  location: {
    formattedAddress: sv("5409 Ballard Ave NW, Seattle, WA 98107", "google_places", { verified: true }),
    city: sv("Seattle", "google_places", { verified: true }),
    region: sv("Washington", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(47.6665, "google_places", { verified: true }),
    longitude: sv(-122.3831, "google_places", { verified: true }),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-24T10:00:00Z" }),
  },

  media: {
    images: [
      img("fj-g1", "https://picsum.photos/seed/fjord-window/1200/900", "Espresso machine seen through the front window", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 900,
        attribution: { label: "Guest photo via Google Maps", authorName: "Petra L." },
      }),
      img("fj-g2", "https://picsum.photos/seed/fjord-cups/1200/1200", "Two paper cups on the bar", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 1200,
        attribution: { label: "Guest photo via Google Maps" },
      }),
    ],
  },

  offering: {
    services: {
      takeout: sv(true, "google_places", { verified: true }),
    },
  },

  callsToAction: {
    call: { label: "Call", href: "+1 (206) 555-0172", kind: "call", source: "manual", verified: true },
    directions: {
      label: "Directions",
      href: "https://www.google.com/maps/dir/?api=1&destination=5409+Ballard+Ave+NW+Seattle+WA",
      kind: "directions",
      external: true,
    source: "manual",
    verified: true,
    },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-24T10:00:00Z",
  },
};
