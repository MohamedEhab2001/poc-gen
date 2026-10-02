import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const foundryCoffeeLab: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-foundry",
  slug: "foundry-coffee-lab",
  status: "active",
  themeId: "modern-industrial",
  themeOverrides: {
    density: "compact",
  },

  identity: {
    placeId: "place_fc_demo_010",
    name: sv("Foundry Coffee Lab", "google_places", { verified: true }),
    shortName: sv("Foundry", "business_owner", { verified: true }),
    primaryCategory: sv("Coffee shop", "google_places", { verified: true }),
    categories: sv(["Coffee shop", "Bakery", "Micro roastery"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-23T08:00:00Z" }),
  },

  brand: {
    wordmark: sv("FOUNDRY", "business_owner", { verified: true }),
    tagline: sv("Coffee as a process", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Corktown · 42.3122 N, 83.0740 W", "manual"),
    headline: sv("Coffee treated like a process, not a habit", "business_owner", { verified: true }),
    subheadline: sv("Batch brews on a timer, espresso on a scale, bread on a stone. Data on the wall.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "fc-hero",
        "https://picsum.photos/seed/foundry-lab-hero/1600/1000",
        "The Foundry lab counter with scales, brew bars, and stainless equipment",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Order beans and bread",
      href: "https://shop.foundrylab.example.com",
      kind: "order",
      external: true,
    source: "manual",
    verified: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (313) 555-0138", "google_places", { verified: true }),
    email: sv("lab@foundrylab.example.com", "business_owner", { verified: true }),
    socialLinks: sv([
      { platform: "instagram", url: "https://www.instagram.com/foundry.lab.example", label: "Instagram" },
      { platform: "youtube", url: "https://www.youtube.com/@foundrylab.example", label: "YouTube" },
    ], "google_places", { verified: true }),
  },

  location: {
    formattedAddress: sv("1755 Trumbull St, Detroit, MI 48216", "google_places", { verified: true }),
    shortAddress: sv("Corktown, Detroit", "google_places"),
    city: sv("Detroit", "google_places", { verified: true }),
    region: sv("Michigan", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(42.3122, "google_places", { verified: true }),
    longitude: sv(-83.0740, "google_places", { verified: true }),
    timezone: sv("America/Detroit", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=1755+Trumbull+St+Detroit+MI", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-23T08:00:00Z" }),
    statusLabel: sv("Open until 5 PM", "google_places", { retrievedAt: "2026-09-23T08:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: 7 AM to 5 PM",
        "Tuesday: 7 AM to 5 PM",
        "Wednesday: 7 AM to 5 PM",
        "Thursday: 7 AM to 5 PM",
        "Friday: 7 AM to 6 PM",
        "Saturday: 8 AM to 6 PM",
        "Sunday: 8 AM to 2 PM",
      ],
      "google_places",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.5, "google_places", { verified: true }),
    reviewCount: sv(389, "google_places", { verified: true }),
    reviews: [
      {
        id: "fc-r1",
        source: "google_places",
        authorName: "Nadia Petrou",
        rating: 5,
        text: "They publish the brew ratios on a chalk wall. The naturally processed Ethiopia was stellar.",
        publishedAt: "2026-09-11",
      },
      {
        id: "fc-r2",
        source: "google_places",
        authorName: "Cal Whitmore",
        rating: 4,
        text: "Seating is stools and steel, laptop crowd is thick, but the bread program is no joke.",
        publishedAt: "2026-08-30",
      },
    ],
  },

  media: {
    images: [
      img("fc-g1", "https://picsum.photos/seed/foundry-scales/1200/1500", "Brew bar with scales and glass carafes under task lighting", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
      img("fc-g2", "https://picsum.photos/seed/foundry-bread/1200/900", "Country loaves scoring on a stone hearth", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("fc-g3", "https://picsum.photos/seed/foundry-board/1200/900", "The chalk wall of weekly brew parameters", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("fc-g4", "https://picsum.photos/seed/foundry-room/1200/900", "The concrete lab room with steel tables", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 900,
        attribution: { label: "Guest photo via Google Maps", authorName: "Cal W." },
      }),
    ],
    galleryTitle: sv("The lab", "manual"),
  },

  offering: {
    priceLevel: sv("$", "google_places", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      takeout: sv(true, "google_places", { verified: true }),
      curbsidePickup: sv(true, "business_owner", { verified: true }),
    },
    menu: {
      mode: "verified",
      source: "business_owner",
      verified: true,
      sections: [
        {
          id: "fc-brew",
          name: "Brew Bar",
          items: [
            mi("fc-m1", "Batch brew", "$4", "Rotating single origin, 1:16, 4:30 contact"),
            mi("fc-m2", "Pour over", "$6", "V60 or Origami, choose the bean"),
            mi("fc-m3", "Espresso", "$3.50", "Seasonal blend, 18 g in, 38 g out", { featured: true }),
            mi("fc-m4", "Oat flat white", "$5.50", "Barista oat, 5.5 oz"),
          ],
        },
        {
          id: "fc-bread",
          name: "Hearth",
          description: "Baked on stone, from 7 AM",
          items: [
            mi("fc-m5", "Country loaf", "$10", "70 percent hydration, 14 hour ferment", { featured: true }),
            mi("fc-m6", "Seeded rye", "$11", "Rye, sunflower, flax"),
            mi("fc-m7", "Cardamom knot", "$5", "Laminated, not sweet"),
          ],
        },
        {
          id: "fc-retail",
          name: "Retail",
          items: [
            mi("fc-m8", "Lab blend, 250 g", "$16", "Cocoa, dried cherry, demerara"),
            mi("fc-m9", "Process series, 250 g", "$22", "Rotating; washed, honey, and natural lots"),
          ],
        },
      ],
    },
  },

  amenities: {
    restroom: sv(true, "manual", { verified: true }),
    accessibility: sv(["Step-free entrance", "Accessible restroom"], "business_owner", { verified: true }),
    paymentMethods: sv(["Visa", "Mastercard", "Amex", "Cash"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("Specification: a café", "business_owner", { verified: true }),
    aboutBody: sv(
      "Foundry occupies a former machine shop with the original concrete intact. Coffee is dialed in by weight and time, posted weekly on the wall, and adjusted when the weather shifts. The hearth program runs one baker, two ovens, and a 14 hour ferment. The building does the decorating.",
      "business_owner",
      { verified: true },
    ),
  },

  callsToAction: {
    order: {
      label: "Order beans and bread",
      href: "https://shop.foundrylab.example.com",
      kind: "order",
      external: true,
    source: "manual",
    verified: true,
    },
    call: { label: "Call the lab", href: "+1 (313) 555-0138", kind: "call", source: "manual", verified: true },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-23T08:00:00Z",
    leadId: "lead-fc-0918",
  },
};
