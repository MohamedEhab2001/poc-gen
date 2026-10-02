import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const merchantAndVine: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-merchant-vine",
  slug: "merchant-vine",
  status: "active",
  expiresAt: "2027-03-01T00:00:00Z",
  themeId: "heritage-bistro",

  identity: {
    placeId: "place_mv_demo_001",
    name: sv("Merchant & Vine", "google_places", { verified: true, retrievedAt: "2026-09-18T10:00:00Z" }),
    shortName: sv("Merchant & Vine", "business_owner", { verified: true }),
    primaryCategory: sv("Bistro", "google_places", { verified: true }),
    categories: sv(["Bistro", "Wine bar", "Restaurant"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-18T10:00:00Z" }),
  },

  brand: {
    wordmark: sv("Merchant & Vine", "business_owner", { verified: true }),
    tagline: sv("Neighborhood cooking and a serious cellar", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Mississippi Avenue", "manual"),
    headline: sv("Neighborhood cooking, done with patience", "business_owner", { verified: true }),
    subheadline: sv(
      "A seasonal bistro menu, a wall of natural wine, and a room built for long evenings.",
      "business_owner",
      { verified: true },
    ),
    image: {
      value: img("mv-hero", "https://picsum.photos/seed/merchant-vine-hero/1600/1000", "Dining room at Merchant & Vine with set tables and warm lamplight", {
        role: "hero",
        source: "business_owner",
        width: 1600,
        height: 1000,
      }),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Reserve a table",
      href: "https://merchantandvine.example.com/reserve",
      kind: "reserve",
      external: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (503) 555-0114", "google_places", { verified: true }),
    email: sv("hello@merchantandvine.example.com", "business_owner", { verified: true }),
    website: sv("https://merchantandvine.example.com", "business_owner", { verified: true }),
    socialLinks: [
      { platform: "instagram", url: "https://www.instagram.com/merchantandvine.example", label: "Instagram" },
    ],
  },

  location: {
    formattedAddress: sv("3824 N Mississippi Ave, Portland, OR 97227", "google_places", { verified: true }),
    shortAddress: sv("Mississippi Ave, Portland", "google_places"),
    city: sv("Portland", "google_places", { verified: true }),
    region: sv("Oregon", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(45.5479, "google_places", { verified: true }),
    longitude: sv(-122.6750, "google_places", { verified: true }),
    timezone: sv("America/Los_Angeles", "google_places"),
    mapsUrl: sv("https://maps.google.com/?cid=mv_demo", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=3824+N+Mississippi+Ave+Portland+OR", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-18T10:00:00Z" }),
    statusLabel: sv("Open until 10 PM", "google_places", { retrievedAt: "2026-09-18T10:00:00Z" }),
    nextCloseTime: sv("10:00 PM", "google_places"),
    weekdayDescriptions: sv(
      [
        "Monday: 5 PM to 10 PM",
        "Tuesday: 5 PM to 10 PM",
        "Wednesday: 5 PM to 10 PM",
        "Thursday: 5 PM to 10 PM",
        "Friday: 5 PM to 11 PM",
        "Saturday: 4 PM to 11 PM",
        "Sunday: 4 PM to 9 PM",
      ],
      "google_places",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.6, "google_places", { verified: true }),
    reviewCount: sv(812, "google_places", { verified: true }),
    summary: sv("Guests mention the wine list, the pork chop, and the unhurried service.", "ai_derived", {
      confidence: 0.82,
    }),
    reviews: [
      {
        id: "mv-r1",
        authorName: "Rosalind A.",
        rating: 5,
        text: "The pork chop alone is worth the trip. Staff steered us to a Jura wine we are still thinking about.",
        publishedAt: "2026-08-02",
        sourceUrl: "https://maps.google.com/reviews/mv-r1.example",
      },
      {
        id: "mv-r2",
        authorName: "Theo Marchetti",
        rating: 4,
        text: "Cozy room, serious cellar, and a menu that changes often enough to keep it interesting.",
        publishedAt: "2026-07-19",
        sourceUrl: "https://maps.google.com/reviews/mv-r2.example",
      },
      {
        id: "mv-r3",
        authorName: "June Okafor",
        rating: 5,
        text: "Sat at the bar on a rainy Tuesday. Bread, butter, and a glass of something funky. Perfect.",
        publishedAt: "2026-09-05",
        sourceUrl: "https://maps.google.com/reviews/mv-r3.example",
      },
    ],
    reviewsUrl: sv("https://maps.google.com/reviews/merchantandvine.example", "google_places"),
  },

  media: {
    images: [
      img("mv-g1", "https://picsum.photos/seed/merchant-vine-bar/1200/900", "The marble bar with wine glasses hanging overhead", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("mv-g2", "https://picsum.photos/seed/merchant-vine-plate/1200/1500", "A plated pork chop with charred apples", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 1500,
        attribution: { label: "Guest photo via Google Maps", authorName: "Rosalind A." },
      }),
      img("mv-g3", "https://picsum.photos/seed/merchant-vine-room/1200/900", "Banquette seating along the window at dusk", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("mv-g4", "https://picsum.photos/seed/merchant-vine-cellar/1200/900", "Shelves of natural wine in the back room", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
    ],
    galleryTitle: sv("The room and the table", "manual"),
  },

  offering: {
    priceLevel: sv("$$", "google_places", { verified: true }),
    priceRange: sv("$18 to $36", "business_owner", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      takeout: sv(true, "google_places", { verified: true }),
      reservable: sv(true, "business_owner", { verified: true }),
    },
    mealTypes: ["Dinner", "Drinks"],
    menu: {
      mode: "verified",
      source: "business_owner",
      verified: true,
      sections: [
        {
          id: "mv-first",
          name: "First Courses",
          description: "To start, for the table",
          items: [
            mi("mv-m1", "Bread and cultured butter", "$9", "Toast wheat sourdough, seaweed butter"),
            mi("mv-m2", "Beet tartare", "$14", "Smoked crème fraîche, rye crisp, horseradish", { tags: ["Vegetarian"], featured: true }),
            mi("mv-m3", "Grilled sardines", "$15", "Salsa verde, lemon, grilled bread"),
          ],
        },
        {
          id: "mv-mains",
          name: "Mains",
          items: [
            mi("mv-m4", "Pork chop", "$32", "Charred apple, mustard greens, cider jus", { featured: true }),
            mi("mv-m5", "Ricotta dumplings", "$24", "Brown butter, sage, hazelnut", { tags: ["Vegetarian"] }),
            mi("mv-m6", "Steak frites", "$34", "Hanger steak, peppercorn butter, duck-fat fries"),
            mi("mv-m7", "Day boat fish", "$31", "Whatever landed today, fennel, brown butter"),
          ],
        },
        {
          id: "mv-pud",
          name: "Puddings",
          items: [
            mi("mv-m8", "Sticky toffee", "$11", "Date cake, muscovado sauce, crème fraîche"),
            mi("mv-m9", "Bay leaf panna cotta", "$10", "Poached pear, oat crisp"),
          ],
        },
      ],
    },
  },

  amenities: {
    goodForGroups: sv(true, "google_places"),
    restroom: sv(true, "manual", { verified: true }),
    parking: sv(["Street parking", "Neighborhood lot"], "manual"),
    paymentMethods: sv(["Visa", "Mastercard", "Amex"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("A corner bistro, kept the hard way", "business_owner", { verified: true }),
    aboutBody: sv(
      "Merchant & Vine cooks a tight seasonal menu over fire and casts a wide net through low-intervention wine. The room seats forty, the bar seats eight, and the pastry team starts before sunrise. Menus change with the market, not with the season's marketing calendar.",
      "business_owner",
      { verified: true },
    ),
    neighborhoodSummary: sv("On Mississippi Avenue, a short walk from the Albina shops.", "manual"),
  },

  callsToAction: {
    reserve: {
      label: "Reserve a table",
      href: "https://merchantandvine.example.com/reserve",
      kind: "reserve",
      external: true,
    },
    call: { label: "Call the host stand", href: "+1 (503) 555-0114", kind: "call" },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-18T10:00:00Z",
    updatedAt: "2026-09-28T10:00:00Z",
    leadId: "lead-mv-0142",
  },
};
