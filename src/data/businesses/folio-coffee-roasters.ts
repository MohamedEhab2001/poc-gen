import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const folioCoffeeRoasters: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-folio",
  slug: "folio-coffee-roasters",
  status: "active",
  themeId: "coffee-editorial",

  identity: {
    placeId: "place_fo_demo_005",
    name: sv("Folio Coffee Roasters", "google_places", { verified: true }),
    shortName: sv("Folio", "business_owner", { verified: true }),
    primaryCategory: sv("Coffee shop", "google_places", { verified: true }),
    categories: sv(["Coffee shop", "Roastery", "Bakery"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-10T08:00:00Z" }),
  },

  brand: {
    wordmark: sv("Folio", "business_owner", { verified: true }),
    tagline: sv("Volume One, brewed daily", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Issue No. 1 · RiNo District", "manual"),
    headline: sv("Roasted in small batches, poured with intent", "business_owner", { verified: true }),
    subheadline: sv("A working roastery, a reading room, and the best cardamom bun in the district.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "fo-hero",
        "https://picsum.photos/seed/folio-roastery-hero/1600/1000",
        "The Folio roastery floor with a drum roaster and burlap sacks of green coffee",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Shop beans",
      href: "https://shop.foliocoffee.example.com",
      kind: "order",
      external: true,
    source: "manual",
    verified: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (720) 555-0129", "google_places", { verified: true }),
    email: sv("editors@foliocoffee.example.com", "business_owner", { verified: true }),
    socialLinks: sv([
      { platform: "instagram", url: "https://www.instagram.com/folio.roasters.example", label: "Instagram" },
      { platform: "youtube", url: "https://www.youtube.com/@foliocoffee.example", label: "YouTube" },
    ], "google_places", { verified: true }),
  },

  location: {
    formattedAddress: sv("3401 Larimer St, Denver, CO 80205", "google_places", { verified: true }),
    shortAddress: sv("RiNo, Denver", "google_places"),
    city: sv("Denver", "google_places", { verified: true }),
    region: sv("Colorado", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(39.7692, "google_places", { verified: true }),
    longitude: sv(-104.9808, "google_places", { verified: true }),
    timezone: sv("America/Denver", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=3401+Larimer+St+Denver+CO", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-10T08:00:00Z" }),
    statusLabel: sv("Open until 6 PM", "google_places", { retrievedAt: "2026-09-10T08:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: 7 AM to 5 PM",
        "Tuesday: 7 AM to 5 PM",
        "Wednesday: 7 AM to 5 PM",
        "Thursday: 7 AM to 6 PM",
        "Friday: 7 AM to 6 PM",
        "Saturday: 8 AM to 6 PM",
        "Sunday: 8 AM to 3 PM",
      ],
      "google_places",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.7, "google_places", { verified: true }),
    reviewCount: sv(542, "google_places", { verified: true }),
    reviews: [
      {
        id: "fo-r1",
        source: "google_places",
        authorName: "Marta Quill",
        rating: 5,
        text: "The cardamom bun and a washed Ethiopian filter. I get more done here than at my desk.",
        publishedAt: "2026-09-02",
      },
      {
        id: "fo-r2",
        source: "google_places",
        authorName: "D. Osei",
        rating: 5,
        text: "You can watch them roast on Tuesdays. Bags are dated, shots are dialed in by 7:15.",
        publishedAt: "2026-08-11",
      },
      {
        id: "fo-r3",
        source: "google_places",
        authorName: "Hanna Lindqvist",
        rating: 4,
        text: "Busy at peak but the line moves. Reading room in back is a gift.",
        publishedAt: "2026-07-28",
      },
    ],
  },

  media: {
    images: [
      img("fo-g1", "https://picsum.photos/seed/folio-roaster-machine/1200/1500", "Close crop of the drum roaster mid-batch", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
      img("fo-g2", "https://picsum.photos/seed/folio-pour/1200/1200", "A barista pouring a filter brew into a glass carafe", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("fo-g3", "https://picsum.photos/seed/folio-buns/1200/900", "Cardamom buns cooling on a sheet pan", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("fo-g4", "https://picsum.photos/seed/folio-reading/1200/900", "The back reading room with lamps and magazines", {
        role: "gallery",
        source: "licensed_asset",
        width: 1200,
        height: 900,
        attribution: { label: "Licensed stock photography", authorName: "Rowan Peck" },
      }),
    ],
    galleryTitle: sv("Field notes", "manual"),
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
          id: "fo-espresso",
          name: "Espresso and Filter",
          items: [
            mi("fo-m1", "Espresso", "$3.50", "Seasonal blend, 18 g in, 36 g out"),
            mi("fo-m2", "Filter of the week", "$5", "Single origin, brewed to order", { featured: true }),
            mi("fo-m3", "Cortado", "$4.50", "Equal parts espresso and steamed milk"),
            mi("fo-m4", "Cardamom latte", "$6", "House cardamom syrup, whole or oat milk"),
          ],
        },
        {
          id: "fo-bakery",
          name: "Bakery",
          items: [
            mi("fo-m5", "Cardamom bun", "$5", "Twisted, buttery, pulled from the oven at 7 AM", { featured: true }),
            mi("fo-m6", "Rye shortbread", "$4", "Browned butter, sea salt"),
            mi("fo-m7", "Sourdough loaf", "$9", "Available after 11 AM, whole loaves only"),
          ],
        },
        {
          id: "fo-beans",
          name: "Beans to Go",
          items: [
            mi("fo-m8", "Volume One blend, 250 g", "$17", "Milk chocolate, plum, cane sugar sweetness"),
            mi("fo-m9", "Single origin, 250 g", "$21", "Rotating; this month, washed Ethiopia Guji"),
          ],
        },
      ],
    },
  },

  amenities: {
    restroom: sv(true, "manual", { verified: true }),
    allowsDogs: sv(true, "manual"),
    accessibility: sv(["Step-free entrance", "Accessible restroom"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("The story so far", "business_owner", { verified: true }),
    aboutBody: sv(
      "Folio started as a Saturday market stall with one borrowed roaster and a folding table. The Larimer street roastery now runs two batches a morning, five days a week, and the reading room in back holds the archive: every bag label we have ever printed, shelved like issues. Coffee is roasted for the shop, not the warehouse.",
      "business_owner",
      { verified: true },
    ),
    neighborhoodSummary: sv("On Larimer Street between the print shops and the climbing gym.", "manual"),
  },

  callsToAction: {
    order: {
      label: "Shop beans",
      href: "https://shop.foliocoffee.example.com",
      kind: "order",
      external: true,
    source: "manual",
    verified: true,
    },
    call: { label: "Call the bar", href: "+1 (720) 555-0129", kind: "call", source: "manual", verified: true },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-10T08:00:00Z",
    leadId: "lead-fo-0311",
  },
};
