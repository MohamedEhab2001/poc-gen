import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const fizzClub: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-fizz-club",
  slug: "fizz-club",
  status: "active",
  themeId: "memphis-play",

  identity: {
    placeId: "place_fc_demo_018",
    name: sv("Fizz Club", "google_places", { verified: true }),
    shortName: sv("Fizz Club", "business_owner", { verified: true }),
    primaryCategory: sv("Bubble tea shop", "google_places", { verified: true }),
    categories: sv(["Bubble tea shop", "Dessert shop", "Ice cream shop"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-25T13:00:00Z" }),
  },

  brand: {
    wordmark: sv("FIZZ CLUB", "business_owner", { verified: true }),
    tagline: sv("Bubbles, soft serve, zero chill", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Fishtown", "manual"),
    headline: sv("Serious bubbles, unserious colors", "business_owner", { verified: true }),
    subheadline: sv("House syrups, real fruit, and soft serve that bends. Loud on purpose.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "fz-hero",
        "https://picsum.photos/seed/fizz-club-hero/1600/1000",
        "The Fizz Club counter with colorful drinks lined up under a bright awning",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Order for pickup",
      href: "https://order.fizzclub.example.com",
      kind: "order",
      external: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (215) 555-0149", "google_places", { verified: true }),
    email: sv("hi@fizzclub.example.com", "business_owner", { verified: true }),
    socialLinks: [
      { platform: "instagram", url: "https://www.instagram.com/fizzclub.example", label: "Instagram" },
      { platform: "tiktok", url: "https://www.tiktok.com/@fizzclub.example", label: "TikTok" },
    ],
  },

  location: {
    formattedAddress: sv("1208 Frankford Ave, Philadelphia, PA 19125", "google_places", { verified: true }),
    shortAddress: sv("Frankford Ave, Fishtown", "google_places"),
    city: sv("Philadelphia", "google_places", { verified: true }),
    region: sv("Pennsylvania", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(39.9697, "google_places", { verified: true }),
    longitude: sv(-75.1342, "google_places", { verified: true }),
    timezone: sv("America/New_York", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=1208+Frankford+Ave+Philadelphia+PA", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-25T13:00:00Z" }),
    statusLabel: sv("Open until 10 PM", "google_places", { retrievedAt: "2026-09-25T13:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: 1 PM to 9 PM",
        "Tuesday: 1 PM to 9 PM",
        "Wednesday: 1 PM to 9 PM",
        "Thursday: 1 PM to 10 PM",
        "Friday: 1 PM to 11 PM",
        "Saturday: 12 PM to 11 PM",
        "Sunday: 12 PM to 8 PM",
      ],
      "google_places",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.5, "google_places", { verified: true }),
    reviewCount: sv(887, "google_places", { verified: true }),
    reviews: [
      {
        id: "fz-r1",
        authorName: "Tasha Kim",
        rating: 5,
        text: "The brown sugar fizz with the oat soft serve on top. I think about it at work.",
        publishedAt: "2026-09-08",
      },
      {
        id: "fz-r2",
        authorName: "Marcus Odum",
        rating: 4,
        text: "Loud, bright, fast. Mobile orders are ready in five, even on Fridays.",
        publishedAt: "2026-08-27",
      },
      {
        id: "fz-r3",
        authorName: "Bea Lindgren",
        rating: 5,
        text: "Took my niece, she rated the sprinkle wall eleven out of ten.",
        publishedAt: "2026-07-18",
      },
    ],
  },

  media: {
    images: [
      img("fz-g1", "https://picsum.photos/seed/fizz-drinks/1200/1200", "Three colorful fizz drinks with wide straws", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("fz-g2", "https://picsum.photos/seed/fizz-softserve/1200/1500", "A tall swirl of soft serve with fruit topping", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
      img("fz-g3", "https://picsum.photos/seed/fizz-wall/1200/900", "The sprinkle wall mural inside the shop", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 900,
        attribution: { label: "Guest photo via Google Maps", authorName: "Bea L." },
      }),
      img("fz-g4", "https://picsum.photos/seed/fizz-counter/1200/900", "The counter with syrup bottles and menu board", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
    ],
    galleryTitle: sv("The fun wall", "manual"),
  },

  offering: {
    priceLevel: sv("$", "google_places", { verified: true }),
    priceRange: sv("$5 to $9", "business_owner", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      takeout: sv(true, "google_places", { verified: true }),
      delivery: sv(true, "business_owner", { verified: true }),
    },
    dietaryOptions: ["Vegan options", "Dairy-free options"],
    menu: {
      mode: "verified",
      sections: [
        {
          id: "fz-fizzes",
          name: "Fizzes",
          description: "House syrups, real fruit, topping physics",
          items: [
            mi("fz-m1", "Brown sugar fizz", "$6.50", "Brown sugar boba, oat milk, sea salt", { featured: true }),
            mi("fz-m2", "Passionfruit pop", "$6", "Passionfruit, yuzu pearls, mint", { tags: ["Vegan"], featured: true }),
            mi("fz-m3", "Matcha thunder", "$7", "Ceremonial matcha, honey boba, milk of choice"),
            mi("fz-m4", "Espresso fizz", "$6.50", "Cold brew, vanilla syrup, cascara pearls"),
          ],
        },
        {
          id: "fz-sweets",
          name: "Soft Serve and Sweets",
          items: [
            mi("fz-m5", "Oat soft serve", "$5", "Swirl, choice of fruit crunch", { tags: ["Vegan option"] }),
            mi("fz-m6", "Sprinkle summit", "$6.50", "Soft serve, full sprinkle participation", { featured: true }),
            mi("fz-m7", "Mochi trio", "$5.50", "Coconut, mango, black sesame"),
            mi("fz-m8", "Fizz float", "$7.50", "Any fizz plus a soft-serve island"),
          ],
        },
      ],
    },
  },

  amenities: {
    goodForChildren: sv(true, "google_places", { verified: true }),
    allowsDogs: sv(true, "manual"),
    restroom: sv(true, "manual", { verified: true }),
    paymentMethods: sv(["Visa", "Mastercard", "Cash", "Apple Pay"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("Built like a party", "business_owner", { verified: true }),
    aboutBody: sv(
      "Fizz Club started as a farmers market cart with one carbonator and a lot of opinions about syrup. The Frankford shop makes everything in house: syrups by the batch, pearls every two hours, and soft serve in oat and dairy. It is bright, it is loud, and the sprinkle wall is load-bearing.",
      "business_owner",
      { verified: true },
    ),
    announcement: sv("New this month: brown sugar latte fizz.", "business_owner", { verified: true }),
  },

  callsToAction: {
    order: {
      label: "Order for pickup",
      href: "https://order.fizzclub.example.com",
      kind: "order",
      external: true,
    },
    call: { label: "Call the club", href: "+1 (215) 555-0149", kind: "call" },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-25T13:00:00Z",
    leadId: "lead-fz-1290",
  },
};
