import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const tavernaOnda: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-onda",
  slug: "taverna-onda",
  status: "active",
  themeId: "mediterranean-sun",

  identity: {
    placeId: "place_od_demo_004",
    name: sv("Taverna Onda", "google_places", { verified: true }),
    shortName: sv("Onda", "business_owner", { verified: true }),
    primaryCategory: sv("Mediterranean restaurant", "google_places", { verified: true }),
    categories: sv(["Mediterranean", "Seafood", "Family restaurant"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-22T12:00:00Z" }),
  },

  brand: {
    wordmark: sv("Taverna Onda", "business_owner", { verified: true }),
    tagline: sv("Long tables, sea breeze, good oil", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Pacific Beach", "manual"),
    headline: sv("Eat like the coast is watching", "business_owner", { verified: true }),
    subheadline: sv("Grilled fish, big mezze boards, and a patio that catches every sunset.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "od-hero",
        "https://picsum.photos/seed/taverna-onda-hero/1600/1000",
        "Sunlit patio of Taverna Onda with blue chairs and terracotta pots",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Book the patio",
      href: "https://tavernaonda.example.com/book",
      kind: "reserve",
      external: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (619) 555-0173", "google_places", { verified: true }),
    email: sv("yamas@tavernaonda.example.com", "business_owner", { verified: true }),
    socialLinks: [
      { platform: "instagram", url: "https://www.instagram.com/tavernaonda.example", label: "Instagram" },
      { platform: "facebook", url: "https://www.facebook.com/tavernaonda.example", label: "Facebook" },
    ],
  },

  location: {
    formattedAddress: sv("1166 Garnet Ave, San Diego, CA 92109", "google_places", { verified: true }),
    shortAddress: sv("Garnet Ave, San Diego", "google_places"),
    city: sv("San Diego", "google_places", { verified: true }),
    region: sv("California", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(32.7977, "google_places", { verified: true }),
    longitude: sv(-117.2417, "google_places", { verified: true }),
    timezone: sv("America/Los_Angeles", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=1166+Garnet+Ave+San+Diego+CA", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-22T12:00:00Z" }),
    statusLabel: sv("Open until 10 PM", "google_places", { retrievedAt: "2026-09-22T12:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: 11:30 AM to 9 PM",
        "Tuesday: 11:30 AM to 9 PM",
        "Wednesday: 11:30 AM to 9 PM",
        "Thursday: 11:30 AM to 10 PM",
        "Friday: 11:30 AM to 11 PM",
        "Saturday: 10 AM to 11 PM",
        "Sunday: 10 AM to 9 PM",
      ],
      "google_places",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.5, "google_places", { verified: true }),
    reviewCount: sv(1204, "google_places", { verified: true }),
    reviews: [
      {
        id: "od-r1",
        authorName: "Nikos Petrakis",
        rating: 5,
        text: "The whole fish for two is a proper event. Bring people you like.",
        publishedAt: "2026-08-25",
      },
      {
        id: "od-r2",
        authorName: "Bethany Cruz",
        rating: 4,
        text: "Patio at sunset with a plate of watermelon and feta. Hard to beat.",
        publishedAt: "2026-09-08",
      },
      {
        id: "od-r3",
        authorName: "A. Whitfield",
        rating: 5,
        text: "Kids were welcomed, bread kept coming, nobody rushed us out.",
        publishedAt: "2026-07-30",
      },
    ],
  },

  media: {
    images: [
      img("od-g1", "https://picsum.photos/seed/onda-mezze/1200/1200", "A mezze board with hummus, olives, and warm flatbread", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("od-g2", "https://picsum.photos/seed/onda-fish/1200/1500", "Grilled whole fish with lemon on a blue platter", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 1500,
        attribution: { label: "Guest photo via Google Maps", authorName: "Nikos P." },
      }),
      img("od-g3", "https://picsum.photos/seed/onda-patio/1200/900", "The patio strung with lights before service", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("od-g4", "https://picsum.photos/seed/onda-halloumi/1200/1200", "Seared halloumi with honey and thyme", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("od-g5", "https://picsum.photos/seed/onda-family/1200/900", "A long table of guests sharing plates", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 900,
      }),
    ],
    galleryTitle: sv("Sunset, shared", "manual"),
  },

  offering: {
    priceLevel: sv("$$", "google_places", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      takeout: sv(true, "google_places", { verified: true }),
      reservable: sv(true, "business_owner", { verified: true }),
    },
    mealTypes: ["Lunch", "Dinner"],
    dietaryOptions: ["Vegetarian options", "Gluten-free options"],
    menu: {
      mode: "verified",
      source: "business_owner",
      verified: true,
      sections: [
        {
          id: "od-mezze",
          name: "Mezze",
          description: "For the middle of the table",
          items: [
            mi("od-m1", "Whipped feta and honey", "$11", "Sesame crisp, oregano", { tags: ["Vegetarian"], featured: true }),
            mi("od-m2", "Grilled halloumi", "$12", "Thyme honey, charred lemon", { tags: ["Vegetarian"] }),
            mi("od-m3", "Watermelon and feta", "$10", "Mint, olive oil, black sesame", { tags: ["Vegetarian", "Gluten-free"] }),
            mi("od-m4", "Warm flatbread and dips", "$13", "Hummus, muhammara, tzatziki", { tags: ["Vegetarian"] }),
          ],
        },
        {
          id: "od-grill",
          name: "From the Grill",
          items: [
            mi("od-m5", "Whole fish for two", "$46", "Sea bass or bream, lemon, capers", { featured: true }),
            mi("od-m6", "Lamb souvlaki", "$21", "Pita, red onion, tzatziki"),
            mi("od-m7", "Charred octopus", "$19", "Saffron aioli, potato, paprika"),
            mi("od-m8", "Chicken skewers", "$18", "Oregano, garlic, rice pilaf", { tags: ["Gluten-free"] }),
          ],
        },
        {
          id: "od-sweets",
          name: "Sweets",
          items: [
            mi("od-m9", "Olive oil cake", "$9", "Citrus glaze, pistachio", { tags: ["Vegetarian"] }),
            mi("od-m10", "Baklava, two pieces", "$8", "Walnut, orange blossom syrup", { tags: ["Vegetarian"] }),
          ],
        },
      ],
    },
  },

  amenities: {
    outdoorSeating: sv(true, "google_places", { verified: true }),
    goodForChildren: sv(true, "google_places", { verified: true }),
    goodForGroups: sv(true, "google_places", { verified: true }),
    restroom: sv(true, "manual", { verified: true }),
    parking: sv(["Neighborhood street parking"], "manual"),
  },

  content: {
    aboutTitle: sv("A taverna by the Pacific", "business_owner", { verified: true }),
    aboutBody: sv(
      "Onda cooks the food of coastal Greece with Californian produce next door from the harbor. Mezze boards for the middle of the table, fish over charcoal, and a wine list heavy on islands. The patio seats forty and the sunset does the decorating.",
      "business_owner",
      { verified: true },
    ),
    announcement: sv("Patio season: sunset seatings book out two weekends ahead.", "business_owner", { verified: true }),
  },

  callsToAction: {
    reserve: {
      label: "Book the patio",
      href: "https://tavernaonda.example.com/book",
      kind: "reserve",
      external: true,
    },
    call: { label: "Call", href: "+1 (619) 555-0173", kind: "call" },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-22T12:00:00Z",
    leadId: "lead-od-0455",
  },
};
