import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const maisonLumen: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-maison-lumen",
  slug: "maison-lumen",
  status: "active",
  themeId: "atelier-lookbook",

  identity: {
    placeId: "place_ml_demo_017",
    name: sv("Maison Lumen", "google_places", { verified: true }),
    shortName: sv("Lumen", "business_owner", { verified: true }),
    primaryCategory: sv("Bistro", "google_places", { verified: true }),
    categories: sv(["Bistro", "Design hotel restaurant", "Café"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-26T09:00:00Z" }),
  },

  brand: {
    wordmark: sv("Maison Lumen", "business_owner", { verified: true }),
    tagline: sv("A table, considered", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Mile End, Montréal", "manual"),
    headline: sv("A table set like a gallery", "business_owner", { verified: true }),
    subheadline: sv(
      "Daylight plates in the morning room, candlelit bistro courses after six. One long marble counter, thirty seats.",
      "business_owner",
      { verified: true },
    ),
    image: {
      value: img(
        "ml-hero",
        "https://picsum.photos/seed/maison-lumen-hero/1600/1100",
        "The Maison Lumen marble counter in raking morning light",
        { role: "hero", source: "business_owner", width: 1600, height: 1100 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Book a seat",
      href: "https://maisonlumen.example.com/book",
      kind: "reserve",
      external: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (514) 555-0186", "google_places", { verified: true }),
    email: sv("bonjour@maisonlumen.example.com", "business_owner", { verified: true }),
    socialLinks: [
      { platform: "instagram", url: "https://www.instagram.com/maisonlumen.example", label: "Instagram" },
    ],
  },

  location: {
    formattedAddress: sv("5330 Boulevard Saint-Laurent, Montréal, QC H2T 1S5", "google_places", { verified: true }),
    shortAddress: sv("Saint-Laurent, Mile End", "google_places"),
    city: sv("Montréal", "google_places", { verified: true }),
    region: sv("Quebec", "google_places"),
    country: sv("Canada", "google_places"),
    latitude: sv(45.5272, "google_places", { verified: true }),
    longitude: sv(-73.5993, "google_places", { verified: true }),
    timezone: sv("America/Toronto", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=5330+Boulevard+Saint-Laurent+Montreal", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-26T09:00:00Z" }),
    statusLabel: sv("Morning room until 3 PM", "google_places", { retrievedAt: "2026-09-26T09:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: 8 AM to 3 PM",
        "Tuesday: 8 AM to 3 PM, 5:30 PM to 10 PM",
        "Wednesday: 8 AM to 3 PM, 5:30 PM to 10 PM",
        "Thursday: 8 AM to 3 PM, 5:30 PM to 10 PM",
        "Friday: 8 AM to 3 PM, 5:30 PM to 11 PM",
        "Saturday: 9 AM to 3 PM, 5:30 PM to 11 PM",
        "Sunday: 9 AM to 3 PM",
      ],
      "business_owner",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.8, "google_places", { verified: true }),
    reviewCount: sv(342, "google_places", { verified: true }),
    reviews: [
      {
        id: "ml-r1",
        authorName: "Éloise Gagnon",
        rating: 5,
        text: "The morning room might be the most beautiful place to eat a soft egg in this city.",
        publishedAt: "2026-09-14",
      },
      {
        id: "ml-r2",
        authorName: "D. Fontaine",
        rating: 5,
        text: "Sat at the marble counter, watched the cooks plate for two hours. Dinner is a quiet spectacle.",
        publishedAt: "2026-08-21",
      },
    ],
  },

  media: {
    images: [
      img("ml-g1", "https://picsum.photos/seed/maison-lumen-morning/1200/1500", "The morning room with linen drapes and pale wood", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
      img("ml-g2", "https://picsum.photos/seed/maison-lumen-plate/1200/1200", "A single plated course on pale ceramic", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("ml-g3", "https://picsum.photos/seed/maison-lumen-counter/1200/900", "The marble counter at night with candles", {
        role: "gallery",
        source: "licensed_asset",
        width: 1200,
        height: 900,
        attribution: { label: "Licensed stock photography", authorName: "Noor Haddad" },
      }),
      img("ml-g4", "https://picsum.photos/seed/maison-lumen-door/1200/1500", "The unmarked door on Saint-Laurent", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 1500,
        attribution: { label: "Guest photo via Google Maps", authorName: "Éloise G." },
      }),
      img("ml-g5", "https://picsum.photos/seed/maison-lumen-pastry/1200/900", "Morning pastry trays under glass", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
    ],
    galleryTitle: sv("Chapters", "manual"),
  },

  offering: {
    priceLevel: sv("$$", "google_places", { verified: true }),
    priceRange: sv("$9 to $36", "business_owner", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      takeout: sv(true, "business_owner", { verified: true }),
      reservable: sv(true, "business_owner", { verified: true }),
    },
    mealTypes: ["Breakfast", "Lunch", "Dinner"],
    dietaryOptions: ["Vegetarian options", "Vegan options"],
    menu: {
      mode: "verified",
      sections: [
        {
          id: "ml-matin",
          name: "Le Matin",
          description: "The morning room, eight to three",
          items: [
            mi("ml-m1", "Soft egg, sorrel, brioche", "$14", "Six-minute egg, brown butter crumbs", { featured: true }),
            mi("ml-m2", "Pain perdu, maple, crème", "$13", "Challah, Quebec maple, whipped crème"),
            mi("ml-m3", "Porridge, brown butter, pear", "$11", "Steel cut, toasted hazelnut", { tags: ["Vegan option"] }),
            mi("ml-m4", "Marble counter granola", "$10", "House granola, yogurt, poached rhubarb", { tags: ["Vegetarian"] }),
          ],
        },
        {
          id: "ml-soir",
          name: "Le Soir",
          description: "From five thirty",
          items: [
            mi("ml-m5", "Cured trout, buttermilk, dill", "$18", "Rye, cucumber, trout roe", { featured: true }),
            mi("ml-m6", "Celeriac, entirely", "$24", "Roasted whole, hazelnut, green sauce", { tags: ["Vegetarian"] }),
            mi("ml-m7", "Duck, cherry, farro", "$36", "Confit leg, stone fruit, pickled stem"),
            mi("ml-m8", "Cod, beurre blanc, spinach", "$32", "Chive oil, lemon", { tags: ["Gluten-free option"] }),
          ],
        },
      ],
    },
  },

  amenities: {
    restroom: sv(true, "manual", { verified: true }),
    accessibility: sv(["Step-free entrance", "Accessible restroom"], "business_owner", { verified: true }),
    paymentMethods: sv(["Visa", "Mastercard", "Amex"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("One room, two services", "business_owner", { verified: true }),
    aboutBody: sv(
      "Maison Lumen sits in the former workshop of a lighting atelier, and the name stayed. Mornings are pale and quick: pastry, soft eggs, coffee roasted three blocks east. Evenings slow down around the marble counter, where the kitchen works in full view and the menu shrinks to what the market allowed that day.",
      "business_owner",
      { verified: true },
    ),
    neighborhoodSummary: sv("On Saint-Laurent between the bagel shops.", "manual"),
  },

  callsToAction: {
    reserve: {
      label: "Book a seat",
      href: "https://maisonlumen.example.com/book",
      kind: "reserve",
      external: true,
    },
    call: { label: "Call the counter", href: "+1 (514) 555-0186", kind: "call" },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-26T09:00:00Z",
    leadId: "lead-ml-0448",
  },
};
