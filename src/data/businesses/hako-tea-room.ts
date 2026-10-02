import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const hakoTeaRoom: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-hako",
  slug: "hako-tea-room",
  status: "active",
  themeId: "minimal-japanese",

  identity: {
    placeId: "place_hk_demo_003",
    name: sv("Hako", "google_places", { verified: true }),
    shortName: sv("Hako", "business_owner", { verified: true }),
    primaryCategory: sv("Tea room", "google_places", { verified: true }),
    categories: sv(["Tea room", "Small plates", "Vegetarian-friendly"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-15T09:00:00Z" }),
  },

  brand: {
    wordmark: sv("HAKO", "business_owner", { verified: true }),
    tagline: sv("Tea, quietly", "business_owner", { verified: true }),
  },

  hero: {
    headline: sv("Tea, quietly", "business_owner", { verified: true }),
    subheadline: sv("A small room for slow tea and considered plates in Pioneer Square.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "hk-hero",
        "https://picsum.photos/seed/hako-tea-room-hero/1600/1000",
        "A single ceramic tea bowl on a blond wood counter in soft daylight",
        { role: "hero", source: "licensed_asset", width: 1600, height: 1000, attribution: { label: "Licensed stock photography", authorName: "Mika Sato", authorUrl: "https://satophotos.example.com" } },
      ),
      source: "licensed_asset",
      verified: true,
    },
    primaryAction: {
      label: "Reserve",
      href: "https://hako.example.com/reserve",
      kind: "reserve",
      external: true,
    source: "manual",
    verified: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (206) 555-0147", "google_places", { verified: true }),
    email: sv("tea@hako.example.com", "business_owner", { verified: true }),
    socialLinks: sv([
      { platform: "instagram", url: "https://www.instagram.com/hako.tea.example", label: "Instagram" },
    ], "google_places", { verified: true }),
  },

  location: {
    formattedAddress: sv("88 Yesler Way, Seattle, WA 98104", "google_places", { verified: true }),
    shortAddress: sv("Pioneer Square, Seattle", "google_places"),
    city: sv("Seattle", "google_places", { verified: true }),
    region: sv("Washington", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(47.6003, "google_places", { verified: true }),
    longitude: sv(-122.3323, "google_places", { verified: true }),
    timezone: sv("America/Los_Angeles", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=88+Yesler+Way+Seattle+WA", "google_places"),
  },

  hours: {
    openNow: sv(false, "google_places", { retrievedAt: "2026-09-15T09:00:00Z" }),
    statusLabel: sv("Opens Wednesday 11 AM", "google_places"),
    weekdayDescriptions: sv(
      [
        "Monday: Closed",
        "Tuesday: Closed",
        "Wednesday: 11 AM to 5 PM",
        "Thursday: 11 AM to 5 PM",
        "Friday: 11 AM to 7 PM",
        "Saturday: 10 AM to 7 PM",
        "Sunday: 10 AM to 4 PM",
      ],
      "google_places",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.8, "google_places", { verified: true }),
    reviewCount: sv(196, "google_places", { verified: true }),
    reviews: [
      {
        id: "hk-r1",
        source: "google_places",
        authorName: "Ellis Tanaka",
        rating: 5,
        text: "The gyokuro service is explained with real care. The room stays hushed, which is the point.",
        publishedAt: "2026-08-14",
      },
      {
        id: "hk-r2",
        source: "google_places",
        authorName: "Amara L.",
        rating: 5,
        text: "Sesame tofu is worth planning a whole afternoon around.",
        publishedAt: "2026-09-01",
      },
    ],
  },

  media: {
    images: [
      img("hk-g1", "https://picsum.photos/seed/hako-room/1200/1500", "Minimal dining room with one wooden table and paper shade", {
        role: "gallery",
        source: "licensed_asset",
        width: 1200,
        height: 1500,
        attribution: { label: "Licensed stock photography", authorName: "Mika Sato" },
      }),
      img("hk-g2", "https://picsum.photos/seed/hako-plate/1200/1200", "Sesame tofu with a single shiso leaf on grey ceramic", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("hk-g3", "https://picsum.photos/seed/hako-tea-cans/1200/900", "Tins of loose leaf tea lined on a shelf", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
    ],
    galleryTitle: sv("The room", "manual"),
  },

  offering: {
    priceLevel: sv("$$", "google_places", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      takeout: sv(true, "business_owner", { verified: true }),
      reservable: sv(true, "business_owner", { verified: true }),
    },
    dietaryOptions: sv(["Vegetarian options", "Vegan options", "Gluten-free options"], "business_owner", { verified: true }),
    menu: {
      mode: "verified",
      source: "business_owner",
      verified: true,
      sections: [
        {
          id: "hk-tea",
          name: "Tea",
          description: "Brewed to order, pot by pot",
          items: [
            mi("hk-m1", "Gyokuro", "$9", "Shaded green, sweet and oceanic", { featured: true }),
            mi("hk-m2", "Hōjicha", "$7", "Roasted green, low caffeine, toasty"),
            mi("hk-m3", "Genmaicha", "$7", "Green tea with toasted rice"),
            mi("hk-m4", "Sencha of the month", "$8", "Ask for the current prefecture"),
          ],
        },
        {
          id: "hk-plates",
          name: "Small Plates",
          items: [
            mi("hk-m5", "Sesame tofu", "$8", "House-made, dashi gelée, mustard greens", { tags: ["Vegan"], featured: true }),
            mi("hk-m6", "Onigiri set", "$9", "Two rice balls, pickled plum or kombu", { tags: ["Vegetarian"] }),
            mi("hk-m7", "Chawanmushi", "$10", "Savory egg custard, mushroom, yuzu", { tags: ["Vegetarian"] }),
            mi("hk-m8", "Warabi mochi", "$6", "Kinako and brown sugar syrup", { tags: ["Vegan"] }),
          ],
        },
      ],
    },
  },

  amenities: {
    allowsDogs: sv(false, "manual"),
    restroom: sv(true, "manual", { verified: true }),
    accessibility: sv(["Step-free entrance"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("A small room", "business_owner", { verified: true }),
    aboutBody: sv(
      "Hako serves tea the slow way: leaves measured in front of you, water temperature by the tea, and a calendar that changes with the harvest. The kitchen keeps to a handful of small plates that let the tea lead. Twelve seats, two sittings, no rush.",
      "business_owner",
      { verified: true },
    ),
  },

  callsToAction: {
    reserve: {
      label: "Reserve",
      href: "https://hako.example.com/reserve",
      kind: "reserve",
      external: true,
    source: "manual",
    verified: true,
    },
    call: { label: "Call", href: "+1 (206) 555-0147", kind: "call", source: "manual", verified: true },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-15T09:00:00Z",
    leadId: "lead-hk-0210",
  },
};
