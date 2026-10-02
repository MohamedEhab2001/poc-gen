import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const afterglowDessertBar: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-afterglow",
  slug: "afterglow-dessert-bar",
  status: "active",
  themeId: "neon-night",

  identity: {
    placeId: "place_ag_demo_002",
    name: sv("Afterglow", "google_places", { verified: true }),
    shortName: sv("Afterglow", "business_owner", { verified: true }),
    primaryCategory: sv("Dessert bar", "google_places", { verified: true }),
    categories: sv(["Dessert bar", "Cocktail bar", "Late-night food"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-20T22:00:00Z" }),
  },

  brand: {
    wordmark: sv("AFTERGLOW", "business_owner", { verified: true }),
    tagline: sv("Sweets until 2 AM", "business_owner", { verified: true }),
    palette: {
      accent: sv("#c8ff3d", "business_owner", { verified: true }),
    },
  },

  hero: {
    eyebrow: sv("East 6th Street · Until 2 AM", "manual"),
    headline: sv("Sugar, neon, and bass", "business_owner", { verified: true }),
    subheadline: sv("Late desserts, thick shakes, and low-lit booths for the end of the night.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "ag-hero",
        "https://picsum.photos/seed/afterglow-neon-hero/1600/1000",
        "Afterglow counter glowing magenta and cyan at night",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Order for pickup",
      href: "https://order.afterglow.example.com",
      kind: "order",
      external: true,
    source: "manual",
    verified: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (512) 555-0182", "google_places", { verified: true }),
    email: sv("night@afterglow.example.com", "business_owner", { verified: true }),
    socialLinks: sv([
      { platform: "instagram", url: "https://www.instagram.com/afterglow.example", label: "Instagram" },
      { platform: "tiktok", url: "https://www.tiktok.com/@afterglow.example", label: "TikTok" },
    ], "google_places", { verified: true }),
  },

  location: {
    formattedAddress: sv("2109 E 6th St, Austin, TX 78702", "google_places", { verified: true }),
    shortAddress: sv("East 6th, Austin", "google_places"),
    city: sv("Austin", "google_places", { verified: true }),
    region: sv("Texas", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(30.2586, "google_places", { verified: true }),
    longitude: sv(-97.7204, "google_places", { verified: true }),
    timezone: sv("America/Chicago", "google_places"),
    embedUrl: sv("https://www.google.com/maps/embed?pb=afterglow_demo", "manual"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-20T22:00:00Z" }),
    statusLabel: sv("Open until 2 AM", "google_places", { retrievedAt: "2026-09-20T22:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: Closed",
        "Tuesday: 6 PM to 12 AM",
        "Wednesday: 6 PM to 12 AM",
        "Thursday: 6 PM to 2 AM",
        "Friday: 6 PM to 2 AM",
        "Saturday: 6 PM to 2 AM",
        "Sunday: 5 PM to 12 AM",
      ],
      "google_places",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.4, "google_places", { verified: true }),
    reviewCount: sv(327, "google_places", { verified: true }),
    reviews: [
      {
        id: "ag-r1",
        source: "google_places",
        authorName: "Priya N.",
        rating: 5,
        text: "The midnight brownie sundae is absurd. The room feels like a music video.",
        publishedAt: "2026-08-30",
      },
      {
        id: "ag-r2",
        source: "google_places",
        authorName: "Deshaun Wells",
        rating: 4,
        text: "Great DJ sets on Fridays. Seating is scarce after 10, so come early or order ahead.",
        publishedAt: "2026-09-12",
      },
      {
        id: "ag-r3",
        source: "google_places",
        authorName: "Marisol Vega",
        rating: 5,
        text: "Miso caramel shake. That is the review.",
        publishedAt: "2026-07-22",
      },
    ],
  },

  media: {
    images: [
      img("ag-g1", "https://picsum.photos/seed/afterglow-booth/1200/1500", "A vinyl booth under a cyan neon tube", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
      img("ag-g2", "https://picsum.photos/seed/afterglow-sundae/1200/1200", "A brownie sundae with torched meringue", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("ag-g3", "https://picsum.photos/seed/afterglow-dj/1200/900", "A DJ setup against a magenta wall", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 900,
        attribution: { label: "Guest photo via Google Maps", authorName: "Deshaun W." },
      }),
      img("ag-g4", "https://picsum.photos/seed/afterglow-shake/1200/1500", "Two thick shakes with lit sparklers", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
    ],
    galleryTitle: sv("After dark", "manual"),
  },

  offering: {
    priceLevel: sv("$", "google_places", { verified: true }),
    services: {
      takeout: sv(true, "google_places", { verified: true }),
      delivery: sv(true, "google_places", { verified: true }),
      dineIn: sv(true, "google_places", { verified: true }),
    },
    mealTypes: sv(["Dessert", "Late-night drinks"], "business_owner", { verified: true }),
    menu: {
      mode: "verified",
      source: "business_owner",
      verified: true,
      sections: [
        {
          id: "ag-sweets",
          name: "Late Sweets",
          description: "Served until close",
          items: [
            mi("ag-m1", "Midnight brownie sundae", "$12", "Fudge brownie, torched meringue, malt crumble", { featured: true }),
            mi("ag-m2", "Miso caramel shake", "$9", "Salted miso caramel, whipped cream"),
            mi("ag-m3", "Basque burnt cheesecake", "$10", "Caramelized top, cherry compote"),
            mi("ag-m4", "Molten chocolate cube", "$11", "Valrhona core, olive oil, sea salt", { tags: ["Contains nuts"] }),
          ],
        },
        {
          id: "ag-drinks",
          name: "Night Caps",
          items: [
            mi("ag-m5", "Espresso cola", "$7", "House cola, double shot, orange peel"),
            mi("ag-m6", "Yuzu spritz", "$11", "Yuzu, soda, zero-proof by default"),
            mi("ag-m7", "Cold brew float", "$8", "Cold brew, vanilla soft serve"),
          ],
        },
      ],
    },
  },

  amenities: {
    liveMusic: sv(true, "google_places", { verified: true }),
    goodForGroups: sv(true, "manual"),
    restroom: sv(true, "manual", { verified: true }),
  },

  content: {
    aboutTitle: sv("The last stop of the night", "business_owner", { verified: true }),
    aboutBody: sv(
      "Afterglow is a dessert bar built for the end of the evening: booths you can sink into, DJs on Thursdays and Fridays, and a pastry kitchen that treats 1 AM like a deadline. Everything on the sweet menu is made in house.",
      "business_owner",
      { verified: true },
    ),
    announcement: sv("Friday late sets with guest DJs, 11 PM to close.", "business_owner", { verified: true }),
  },

  callsToAction: {
    order: {
      label: "Order for pickup",
      href: "https://order.afterglow.example.com",
      kind: "order",
      external: true,
    source: "manual",
    verified: true,
    },
    call: { label: "Call the bar", href: "+1 (512) 555-0182", kind: "call", source: "manual", verified: true },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-20T22:00:00Z",
    leadId: "lead-ag-0089",
  },
};
