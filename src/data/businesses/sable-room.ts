import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const sableRoom: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-sable",
  slug: "sable-room",
  status: "active",
  themeId: "luxury-fine-dining",

  identity: {
    placeId: "place_sr_demo_007",
    name: sv("Sable Room", "google_places", { verified: true }),
    shortName: sv("Sable", "business_owner", { verified: true }),
    primaryCategory: sv("Fine dining restaurant", "google_places", { verified: true }),
    categories: sv(["Fine dining", "Tasting menu", "Wine bar"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-25T17:00:00Z" }),
  },

  brand: {
    wordmark: sv("SABLE ROOM", "business_owner", { verified: true }),
    tagline: sv("Nine courses, one room", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Gold Coast", "manual"),
    headline: sv("Nine courses, one sitting", "business_owner", { verified: true }),
    subheadline: sv("A single tasting menu each evening, served in a room of thirty-two seats.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "sr-hero",
        "https://picsum.photos/seed/sable-room-hero/2000/1125",
        "Candlelit dining room of Sable Room with linen dressed tables receding into shadow",
        { role: "hero", source: "business_owner", width: 2000, height: 1125 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Request a reservation",
      href: "https://sableroom.example.com/reservations",
      kind: "reserve",
      external: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (312) 555-0198", "google_places", { verified: true }),
    email: sv("reservations@sableroom.example.com", "business_owner", { verified: true }),
    socialLinks: [
      { platform: "instagram", url: "https://www.instagram.com/sableroom.example", label: "Instagram" },
    ],
  },

  location: {
    formattedAddress: sv("21 E Cedar St, 3rd Floor, Chicago, IL 60611", "google_places", { verified: true }),
    shortAddress: sv("Gold Coast, Chicago", "google_places"),
    city: sv("Chicago", "google_places", { verified: true }),
    region: sv("Illinois", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(41.8977, "google_places", { verified: true }),
    longitude: sv(-87.6254, "google_places", { verified: true }),
    timezone: sv("America/Chicago", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=21+E+Cedar+St+Chicago+IL", "google_places"),
  },

  hours: {
    openNow: sv(false, "google_places", { retrievedAt: "2026-09-25T17:00:00Z" }),
    statusLabel: sv("First seating Wednesday, 5:30 PM", "google_places"),
    weekdayDescriptions: sv(
      [
        "Monday: Closed",
        "Tuesday: Closed",
        "Wednesday: Two seatings, 5:30 PM and 8:15 PM",
        "Thursday: Two seatings, 5:30 PM and 8:15 PM",
        "Friday: Two seatings, 5:30 PM and 8:15 PM",
        "Saturday: Two seatings, 5:00 PM and 8:15 PM",
        "Sunday: Closed",
      ],
      "business_owner",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.9, "google_places", { verified: true }),
    reviewCount: sv(412, "google_places", { verified: true }),
    reviews: [
      {
        id: "sr-r1",
        authorName: "Cornelia Voss",
        rating: 5,
        text: "The aged duck course is worth the entire evening. Service reads the table perfectly.",
        publishedAt: "2026-09-14",
      },
      {
        id: "sr-r2",
        authorName: "James Okafor",
        rating: 5,
        text: "Three hours, nine courses, not one wasted motion. The sorrel course will live in my head.",
        publishedAt: "2026-08-29",
      },
    ],
  },

  media: {
    images: [
      img("sr-g1", "https://picsum.photos/seed/sable-plating/1200/1500", "A single scallop course on a dark ceramic plate", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
      img("sr-g2", "https://picsum.photos/seed/sable-cellar/1200/900", "The wine cellar wall behind glass", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("sr-g3", "https://picsum.photos/seed/sable-kitchen/1200/900", "The open kitchen pass at service start", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("sr-g4", "https://picsum.photos/seed/sable-entry/1200/1500", "The unmarked third floor entry and stair", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 1500,
        attribution: { label: "Guest photo via Google Maps", authorName: "James O." },
      }),
      img("sr-g5", "https://picsum.photos/seed/sable-dessert/1200/1200", "The final honey course with a gold leaf shard", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
    ],
    galleryTitle: sv("The room", "manual"),
  },

  offering: {
    priceLevel: sv("$$$$", "google_places", { verified: true }),
    priceRange: sv("$185 per guest", "business_owner", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      reservable: sv(true, "business_owner", { verified: true }),
    },
    dietaryOptions: ["Vegetarian menu with notice"],
    menu: {
      mode: "verified",
      source: "business_owner",
      verified: true,
      notice: "The menu changes with the market. This is a recent evening.",
      sections: [
        {
          id: "sr-tasting",
          name: "This Evening",
          description: "Nine courses · 185 per guest · wine pairing 95",
          items: [
            mi("sr-m1", "Oyster, elderflower, cucumber", null, "Cold, mineral, first"),
            mi("sr-m2", "Scallop, smoked cream, roe", null, "Seared over binchotan"),
            mi("sr-m3", "Sorrel, sheep's milk, rye", null, "The green course"),
            mi("sr-m4", "Aged duck, blackberry, beetroot", null, "Fourteen days, dry aged", { featured: true }),
            mi("sr-m5", "Honey, wax, pear", null, "From the hive on the roof, last"),
          ],
        },
      ],
    },
  },

  amenities: {
    restroom: sv(true, "manual", { verified: true }),
    accessibility: sv(["Elevator access", "Accessible restroom"], "business_owner", { verified: true }),
    paymentMethods: sv(["Visa", "Mastercard", "Amex"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("A room above Cedar Street", "business_owner", { verified: true }),
    aboutBody: sv(
      "Sable Room seats thirty-two guests per seating around an open kitchen. One menu is written each afternoon from what arrived that morning; the wine list leans toward Burgundy and the Jura by the glass. Jacket optional, curiosity assumed.",
      "business_owner",
      { verified: true },
    ),
  },

  callsToAction: {
    reserve: {
      label: "Request a reservation",
      href: "https://sableroom.example.com/reservations",
      kind: "reserve",
      external: true,
    },
    call: { label: "Call", href: "+1 (312) 555-0198", kind: "call" },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-25T17:00:00Z",
    leadId: "lead-sr-0051",
  },
};
