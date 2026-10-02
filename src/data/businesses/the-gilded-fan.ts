import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const theGildedFan: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-gilded-fan",
  slug: "the-gilded-fan",
  status: "active",
  themeId: "deco-supper-club",

  identity: {
    placeId: "place_gf_demo_016",
    name: sv("The Gilded Fan", "google_places", { verified: true }),
    shortName: sv("The Gilded Fan", "business_owner", { verified: true }),
    primaryCategory: sv("Supper club", "google_places", { verified: true }),
    categories: sv(["Supper club", "Cocktail bar", "Jazz club"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-24T18:00:00Z" }),
  },

  brand: {
    wordmark: sv("The Gilded Fan", "business_owner", { verified: true }),
    tagline: sv("Supper, cocktails, and a little brass", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Frenchmen Street", "manual"),
    headline: sv("An evening, dressed to the nines", "business_owner", { verified: true }),
    subheadline: sv("Cold plates, low lighting, and a house trio that starts when the street quiets down.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "gf-hero",
        "https://picsum.photos/seed/gilded-fan-hero/1600/1000",
        "The Gilded Fan dining room with brass fixtures and deep green banquettes",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Reserve for the evening",
      href: "https://thegildedfan.example.com/reserve",
      kind: "reserve",
      external: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (504) 555-0121", "google_places", { verified: true }),
    email: sv("evenings@thegildedfan.example.com", "business_owner", { verified: true }),
    socialLinks: [
      { platform: "instagram", url: "https://www.instagram.com/thegildedfan.example", label: "Instagram" },
    ],
  },

  location: {
    formattedAddress: sv("514 Frenchmen St, New Orleans, LA 70116", "google_places", { verified: true }),
    shortAddress: sv("Frenchmen Street, New Orleans", "google_places"),
    city: sv("New Orleans", "google_places", { verified: true }),
    region: sv("Louisiana", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(29.9646, "google_places", { verified: true }),
    longitude: sv(-90.0610, "google_places", { verified: true }),
    timezone: sv("America/Chicago", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=514+Frenchmen+St+New+Orleans+LA", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-24T18:00:00Z" }),
    statusLabel: sv("Open until 1 AM", "google_places", { retrievedAt: "2026-09-24T18:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: Closed",
        "Tuesday: Closed",
        "Wednesday: 6 PM to 12 AM",
        "Thursday: 6 PM to 1 AM",
        "Friday: 6 PM to 1 AM",
        "Saturday: 5 PM to 1 AM",
        "Sunday: 5 PM to 11 PM",
      ],
      "business_owner",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.7, "google_places", { verified: true }),
    reviewCount: sv(514, "google_places", { verified: true }),
    reviews: [
      {
        id: "gf-r1",
        authorName: "Cordelia Ames",
        rating: 5,
        text: "The oysters and the Sazerac and the trio at ten. It is a whole production and worth every dollar.",
        publishedAt: "2026-09-02",
      },
      {
        id: "gf-r2",
        authorName: "R. Beaumont",
        rating: 5,
        text: "Booked the corner banquette for an anniversary. They remembered our names at the door.",
        publishedAt: "2026-08-16",
      },
      {
        id: "gf-r3",
        authorName: "Yuki Tanabe",
        rating: 4,
        text: "Smart, dark, and unhurried. The duck for two is the move; arrive hungry.",
        publishedAt: "2026-07-29",
      },
    ],
  },

  media: {
    images: [
      img("gf-g1", "https://picsum.photos/seed/gilded-fan-bar/1200/900", "The brass bar top under low amber light", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("gf-g2", "https://picsum.photos/seed/gilded-fan-oysters/1200/1200", "Chilled oysters on a silver tray with mignonette", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("gf-g3", "https://picsum.photos/seed/gilded-fan-trio/1200/900", "The house trio set up under a gold sconce", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 900,
        attribution: { label: "Guest photo via Google Maps", authorName: "R. Beaumont" },
      }),
      img("gf-g4", "https://picsum.photos/seed/gilded-fan-table/1200/1500", "A set table with a candle and gold-rimmed glassware", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
    ],
    galleryTitle: sv("The room at midnight", "manual"),
  },

  offering: {
    priceLevel: sv("$$$", "google_places", { verified: true }),
    priceRange: sv("$16 to $52", "business_owner", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      reservable: sv(true, "business_owner", { verified: true }),
    },
    mealTypes: ["Dinner", "Late-night drinks"],
    menu: {
      mode: "verified",
      source: "business_owner",
      verified: true,
      sections: [
        {
          id: "gf-cold",
          name: "The Cold Kitchen",
          description: "To begin, with champagne",
          items: [
            mi("gf-m1", "Chilled oysters, six", "$21", "Gulf mignonette, lemon, horseradish", { featured: true }),
            mi("gf-m2", "Crab remoulade", "$17", "Toasted brioche, pickle, herb oil"),
            mi("gf-m3", "Steak tartare", "$18", "Egg yolk, capers, sourdough crisps"),
          ],
        },
        {
          id: "gf-supper",
          name: "Supper",
          items: [
            mi("gf-m4", "Duck for two", "$52", "Cherry gastrique, chicory, duck-fat potatoes", { featured: true }),
            mi("gf-m5", "Redfish meunière", "$34", "Brown butter, pecans, lemon"),
            mi("gf-m6", "Fan chop", "$39", "Pork chop, charred apple, mustard greens", { tags: ["Gluten-free option"] }),
            mi("gf-m7", "Braised greens and grits", "$22", "A proper plate on its own", { tags: ["Vegetarian"] }),
          ],
        },
        {
          id: "gf-cocktails",
          name: "From the Brass Bar",
          items: [
            mi("gf-m8", "The Gilded Fan", "$17", "Cognac, orgeat, fan of orange"),
            mi("gf-m9", "Frenchmen Sazerac", "$16", "Rye, absinthe, Herbsaint rinse"),
            mi("gf-m10", "Champagne cobbler", "$15", "Cobbler sherry, sugar, berries"),
          ],
        },
      ],
    },
  },

  amenities: {
    liveMusic: sv(true, "business_owner", { verified: true }),
    goodForGroups: sv(true, "manual"),
    restroom: sv(true, "manual", { verified: true }),
    paymentMethods: sv(["Visa", "Mastercard", "Amex"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("A room built for the late set", "business_owner", { verified: true }),
    aboutBody: sv(
      "The Gilded Fan keeps Frenchmen Street hours: supper from six, the bar until one, and a house trio most Thursdays through Saturdays. The kitchen leans cold and coastal to start, deliberate and buttery after. Banquettes are deep, the ceiling is low, and nobody hurries you out of a chair.",
      "business_owner",
      { verified: true },
    ),
    announcement: sv("The Fan Room trio plays Thursday through Saturday, from 9 PM.", "business_owner", {
      verified: true,
    }),
  },

  callsToAction: {
    reserve: {
      label: "Reserve for the evening",
      href: "https://thegildedfan.example.com/reserve",
      kind: "reserve",
      external: true,
    },
    call: { label: "Call the maître d'", href: "+1 (504) 555-0121", kind: "call" },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-24T18:00:00Z",
    leadId: "lead-gf-0307",
  },
};
