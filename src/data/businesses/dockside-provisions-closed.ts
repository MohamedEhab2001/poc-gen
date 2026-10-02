import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

/**
 * Temporarily closed fixture: active record, temporarily_closed status.
 * Themes render a closure notice; the POC must not sell an "open" experience.
 */
export const docksideProvisionsClosed: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-dockside",
  slug: "dockside-provisions",
  status: "active",
  themeId: "botanical-brunch",

  identity: {
    placeId: "place_dp_demo_013",
    name: sv("Dockside Provisions", "google_places", { verified: true }),
    shortName: sv("Dockside", "business_owner", { verified: true }),
    primaryCategory: sv("Brunch café", "google_places", { verified: true }),
    categories: sv(["Brunch café", "Bakery"], "google_places"),
    businessStatus: sv("temporarily_closed", "google_places", { verified: true, retrievedAt: "2026-09-27T09:00:00Z" }),
  },

  brand: {
    wordmark: sv("Dockside", "business_owner", { verified: true }),
  },

  hero: {
    headline: sv("Brunch at the ferry dock", "business_owner", { verified: true }),
    subheadline: sv("A small café and bakery on the Anacortes ferry plaza.", "business_owner", { verified: true }),
    image: {
      value: img(
        "dp-hero",
        "https://picsum.photos/seed/dockside-hero/1600/1000",
        "A shuttered café storefront on a foggy morning by the ferry dock",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
    },
    primaryAction: null,
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (360) 555-0126", "google_places", { verified: true }),
    email: sv("hello@docksideprovisions.example.com", "business_owner", { verified: true }),
  },

  location: {
    formattedAddress: sv("1030 Commercial Ave, Anacortes, WA 98221", "google_places", { verified: true }),
    city: sv("Anacortes", "google_places", { verified: true }),
    region: sv("Washington", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(48.5073, "google_places", { verified: true }),
    longitude: sv(-122.6770, "google_places", { verified: true }),
  },

  hours: {
    openNow: sv(false, "google_places", { retrievedAt: "2026-09-27T09:00:00Z" }),
    statusLabel: sv("Temporarily closed", "google_places", { verified: true }),
  },

  reputation: {
    rating: sv(4.4, "google_places", { verified: true }),
    reviewCount: sv(258, "google_places", { verified: true }),
  },

  media: {
    images: [
      img("dp-g1", "https://picsum.photos/seed/dockside-case/1200/900", "The bakery case, empty between services", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("dp-g2", "https://picsum.photos/seed/dockside-dock/1200/900", "The ferry plaza in front of the café", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 900,
      }),
    ],
  },

  offering: {
    services: {
      takeout: sv(true, "google_places"),
    },
    menu: {
      mode: "verified",
      sections: [
        {
          id: "dp-brunch",
          name: "When We Reopen",
          items: [
            mi("dp-m1", "Ferry egg sandwich", "$11", "Sharp cheddar, hot honey, brioche"),
            mi("dp-m2", "Morning bun", "$5", "Orange sugar, laminated"),
          ],
        },
      ],
    },
  },

  content: {
    announcement: sv(
      "Closed for kitchen repairs. We expect to reopen in November; follow our socials for the date.",
      "business_owner",
      { verified: true },
    ),
  },

  callsToAction: {
    call: { label: "Call", href: "+1 (360) 555-0126", kind: "call" },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-27T09:00:00Z",
  },
};
