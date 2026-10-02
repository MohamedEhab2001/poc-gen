import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const lobaTaqueria: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-loba",
  slug: "loba-taqueria",
  status: "active",
  themeId: "street-food-poster",

  identity: {
    placeId: "place_lt_demo_008",
    name: sv("Loba Taqueria", "google_places", { verified: true }),
    shortName: sv("Loba", "business_owner", { verified: true }),
    primaryCategory: sv("Food truck", "google_places", { verified: true }),
    categories: sv(["Food truck", "Tacos", "Street food"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-26T12:00:00Z" }),
  },

  brand: {
    wordmark: sv("LOBA", "business_owner", { verified: true }),
    tagline: sv("Tacos from an orange truck", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Truck stop of the week", "manual"),
    headline: sv("LOUD TACOS", "business_owner", { verified: true }),
    subheadline: sv("Salsa macha, charred pineapple, and a line that moves fast.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "lt-hero",
        "https://picsum.photos/seed/loba-truck-hero/1600/1000",
        "The Loba orange taco truck parked with its window open and queue forming",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Order ahead",
      href: "https://order.loba.example.com",
      kind: "order",
      external: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (213) 555-0155", "google_places", { verified: true }),
    socialLinks: [
      { platform: "instagram", url: "https://www.instagram.com/loba.tacos.example", label: "Instagram" },
      { platform: "tiktok", url: "https://www.tiktok.com/@loba.example", label: "TikTok" },
    ],
  },

  location: {
    formattedAddress: sv("Corner of York Blvd and Figueroa St, Highland Park, Los Angeles, CA 90042", "google_places", {
      verified: true,
    }),
    shortAddress: sv("York and Fig, Highland Park", "google_places"),
    city: sv("Los Angeles", "google_places", { verified: true }),
    region: sv("California", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(34.1190, "google_places", { verified: true }),
    longitude: sv(-118.2030, "google_places", { verified: true }),
    timezone: sv("America/Los_Angeles", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=34.1190,-118.2030", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-26T12:00:00Z" }),
    statusLabel: sv("Truck is out until 9 PM", "google_places", { retrievedAt: "2026-09-26T12:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: Closed",
        "Tuesday: 11 AM to 9 PM, York and Fig",
        "Wednesday: 11 AM to 9 PM, York and Fig",
        "Thursday: 11 AM to 9 PM, Figueroa at Avenue 60",
        "Friday: 11 AM to 10 PM, York and Fig",
        "Saturday: 11 AM to 10 PM, York and Fig",
        "Sunday: 12 PM to 7 PM, Filled with Gold lot",
      ],
      "business_owner",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.7, "google_places", { verified: true }),
    reviewCount: sv(2103, "google_places", { verified: true }),
    reviews: [
      {
        id: "lt-r1",
        authorName: "Gigi Marín",
        rating: 5,
        text: "The mushroom al pastor is the best thing on York. Cash and card both fine.",
        publishedAt: "2026-09-18",
      },
      {
        id: "lt-r2",
        authorName: "Rob Feld",
        rating: 5,
        text: "Order ahead and skip the line. The salsa macha bottles sell out by 2.",
        publishedAt: "2026-08-27",
      },
      {
        id: "lt-r3",
        authorName: "Andrea Solis",
        rating: 4,
        text: "Follow the tracker for the Thursday spot. Tacos are worth the crossing.",
        publishedAt: "2026-07-19",
      },
    ],
  },

  media: {
    images: [
      img("lt-g1", "https://picsum.photos/seed/loba-tacos/1200/1200", "Three tacos on butcher paper with lime and salsa", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("lt-g2", "https://picsum.photos/seed/loba-grill/1200/900", "The planxa griddle with al pastor trompo behind", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("lt-g3", "https://picsum.photos/seed/loba-line/1200/1500", "The lunch queue beside the orange truck", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 1500,
        attribution: { label: "Guest photo via Google Maps", authorName: "Andrea S." },
      }),
      img("lt-g4", "https://picsum.photos/seed/loba-salsa/1200/900", "Jars of salsa macha on the service shelf", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
    ],
    galleryTitle: sv("Off the truck", "manual"),
  },

  offering: {
    priceLevel: sv("$", "google_places", { verified: true }),
    services: {
      takeout: sv(true, "google_places", { verified: true }),
      delivery: sv(true, "business_owner", { verified: true }),
    },
    dietaryOptions: ["Vegetarian options", "Vegan options"],
    menu: {
      mode: "sample",
      sections: [
        {
          id: "lt-tacos",
          name: "Tacos",
          description: "Two per order, onion, cilantro, salsa on request",
          items: [
            mi("lt-m1", "Al pastor", "$5", "Trompo shaved, charred pineapple", { featured: true }),
            mi("lt-m2", "Mushroom al pastor", "$5", "Oyster mushroom, achiote, pineapple", { tags: ["Vegan"], featured: true }),
            mi("lt-m3", "Asada", "$6", "Chopped steak, salsa verde"),
            mi("lt-m4", "Carnitas", "$5.50", "Crisped pork, pickled onion"),
          ],
        },
        {
          id: "lt-extras",
          name: "Extras and Bottles",
          items: [
            mi("lt-m5", "Elote cup", "$6", "Cotija, tajin, lime", { tags: ["Vegetarian"] }),
            mi("lt-m6", "Agua de jamaica", "$4", "Hibiscus, not too sweet", { tags: ["Vegan"] }),
            mi("lt-m7", "Salsa macha, 8 oz", "$12", "Chile, peanut, sesame. Limited daily jars"),
          ],
        },
      ],
    },
  },

  amenities: {
    allowsDogs: sv(true, "manual"),
    restroom: sv(false, "manual"),
    paymentMethods: sv(["Visa", "Mastercard", "Cash"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("One truck, one trompo", "business_owner", { verified: true }),
    aboutBody: sv(
      "Loba runs a single truck with a gas-fired trompo and a menu that fits on the window. Corn tortillas are pressed to order, salsas are made in the morning and gone when they are gone, and the truck posts its corner schedule every Sunday.",
      "business_owner",
      { verified: true },
    ),
    announcement: sv("Today: York and Fig until 9 PM. Salsa macha jars are limited.", "business_owner", {
      verified: true,
    }),
  },

  callsToAction: {
    order: {
      label: "Order ahead",
      href: "https://order.loba.example.com",
      kind: "order",
      external: true,
    },
    directions: {
      label: "Find the truck",
      href: "https://www.google.com/maps/dir/?api=1&destination=34.1190,-118.2030",
      kind: "directions",
      external: true,
    },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-26T12:00:00Z",
    leadId: "lead-lt-2201",
  },
};
