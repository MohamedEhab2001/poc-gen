import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const sageAndSparrow: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-sage-sparrow",
  slug: "sage-and-sparrow",
  status: "active",
  themeId: "botanical-brunch",

  identity: {
    placeId: "place_ss_demo_009",
    name: sv("Sage & Sparrow", "google_places", { verified: true }),
    shortName: sv("Sage & Sparrow", "business_owner", { verified: true }),
    primaryCategory: sv("Brunch café", "google_places", { verified: true }),
    categories: sv(["Brunch café", "Bakery", "Vegetarian-friendly"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-21T09:00:00Z" }),
  },

  brand: {
    wordmark: sv("Sage & Sparrow", "business_owner", { verified: true }),
    tagline: sv("Brunch with the garden in mind", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("West Asheville", "manual"),
    headline: sv("Slow mornings, green plates", "business_owner", { verified: true }),
    subheadline: sv("A garden-side brunch café and bakery with a very good cat. He is on the porch.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "ss-hero",
        "https://picsum.photos/seed/sage-sparrow-hero/1600/1000",
        "A sunlit brunch table beside a window full of potted herbs",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: {
      label: "Book a table",
      href: "https://sageandsparrow.example.com/book",
      kind: "reserve",
      external: true,
    },
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (828) 555-0141", "google_places", { verified: true }),
    email: sv("hello@sageandsparrow.example.com", "business_owner", { verified: true }),
    socialLinks: [
      { platform: "instagram", url: "https://www.instagram.com/sageandsparrow.example", label: "Instagram" },
    ],
  },

  location: {
    formattedAddress: sv("602 Haywood Rd, Asheville, NC 28806", "google_places", { verified: true }),
    shortAddress: sv("Haywood Road, Asheville", "google_places"),
    city: sv("Asheville", "google_places", { verified: true }),
    region: sv("North Carolina", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(35.5835, "google_places", { verified: true }),
    longitude: sv(-82.5618, "google_places", { verified: true }),
    timezone: sv("America/New_York", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=602+Haywood+Rd+Asheville+NC", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-21T09:00:00Z" }),
    statusLabel: sv("Open until 2 PM", "google_places", { retrievedAt: "2026-09-21T09:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: Closed",
        "Tuesday: 8 AM to 2 PM",
        "Wednesday: 8 AM to 2 PM",
        "Thursday: 8 AM to 2 PM",
        "Friday: 8 AM to 2 PM",
        "Saturday: 8 AM to 3 PM",
        "Sunday: 8 AM to 3 PM",
      ],
      "google_places",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.6, "google_places", { verified: true }),
    reviewCount: sv(733, "google_places", { verified: true }),
    reviews: [
      {
        id: "ss-r1",
        authorName: "Wren Hollis",
        rating: 5,
        text: "The garden toast is a meal and a view. Dog friendly porch, endless coffee.",
        publishedAt: "2026-09-06",
      },
      {
        id: "ss-r2",
        authorName: "Tomás Riera",
        rating: 5,
        text: "Best gluten-free biscuits I have had anywhere, and I do not say that lightly.",
        publishedAt: "2026-08-15",
      },
      {
        id: "ss-r3",
        authorName: "Alma Dawson",
        rating: 4,
        text: "Weekend wait is real but the porch and the cat make it fine.",
        publishedAt: "2026-07-26",
      },
    ],
  },

  media: {
    images: [
      img("ss-g1", "https://picsum.photos/seed/sage-garden-toast/1200/1200", "Garden toast with ricotta and herbs on a ceramic plate", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1200,
      }),
      img("ss-g2", "https://picsum.photos/seed/sage-porch/1200/1500", "The dog friendly porch with wicker chairs", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
      img("ss-g3", "https://picsum.photos/seed/sage-bakery/1200/900", "The bakery case with galettes and buns", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("ss-g4", "https://picsum.photos/seed/sage-herbs/1200/900", "Window shelves of potted herbs in morning light", {
        role: "gallery",
        source: "licensed_asset",
        width: 1200,
        height: 900,
        attribution: { label: "Licensed stock photography", authorName: "Iris Beaumont" },
      }),
      img("ss-g5", "https://picsum.photos/seed/sage-latte/1200/1500", "A lavender latte beside a sprig of thyme", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
    ],
    galleryTitle: sv("From the garden", "manual"),
  },

  offering: {
    priceLevel: sv("$$", "google_places", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      takeout: sv(true, "google_places", { verified: true }),
    },
    mealTypes: ["Breakfast", "Brunch", "Lunch"],
    dietaryOptions: ["Vegetarian options", "Vegan options", "Gluten-free options"],
    menu: {
      mode: "verified",
      sections: [
        {
          id: "ss-brunch",
          name: "Brunch Plates",
          items: [
            mi("ss-m1", "Garden toast", "$13", "Whipped ricotta, herbs, honey, seeded sourdough", { tags: ["Vegetarian"], featured: true }),
            mi("ss-m2", "Sweet potato hash", "$15", "Crispy edges, sage, fried egg or tofu", { tags: ["Gluten-free", "Vegan option"] }),
            mi("ss-m3", "Biscuit + plant sausage gravy", "$14", "Chive biscuit, mushroom gravy", { tags: ["Vegetarian"] }),
            mi("ss-m4", "Galette of the day", "$11", "Ask at the counter; fruit or savory"),
          ],
        },
        {
          id: "ss-bakery",
          name: "Bakery Case",
          items: [
            mi("ss-m5", "Brown butter cardamom snail", "$5", "Morning bake", { tags: ["Vegetarian"], featured: true }),
            mi("ss-m6", "GF biscuits, two", "$6", "Made in house", { tags: ["Gluten-free", "Vegetarian"] }),
            mi("ss-m7", "Lavender shortbread", "$4", "Dried flowers from the porch pots", { tags: ["Vegetarian"] }),
          ],
        },
      ],
    },
  },

  amenities: {
    outdoorSeating: sv(true, "google_places", { verified: true }),
    allowsDogs: sv(true, "business_owner", { verified: true }),
    goodForChildren: sv(true, "google_places"),
    restroom: sv(true, "manual", { verified: true }),
    accessibility: sv(["Step-free entrance"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("A café with a garden habit", "business_owner", { verified: true }),
    aboutBody: sv(
      "Sage & Sparrow keeps a small kitchen garden out back and uses every last sprig of it. The bakery case is restocked twice a morning, the coffee is roasted forty minutes east, and the porch is open whenever the weather agrees. The cat's name is Biscuit and he accepts admiration, not pets.",
      "business_owner",
      { verified: true },
    ),
    neighborhoodSummary: sv("On Haywood Road, next to the bookbinder.", "manual"),
  },

  callsToAction: {
    reserve: {
      label: "Book a table",
      href: "https://sageandsparrow.example.com/book",
      kind: "reserve",
      external: true,
    },
    call: { label: "Call the café", href: "+1 (828) 555-0141", kind: "call" },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-21T09:00:00Z",
    leadId: "lead-ss-0612",
  },
};
