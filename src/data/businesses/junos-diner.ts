import type { BusinessPocRecord } from "@/lib/poc/schema";
import { DISCLAIMER, img, mi, sv } from "./helpers";

export const junosDiner: BusinessPocRecord = {
  schemaVersion: 1,
  id: "rec-junos",
  slug: "junos-diner",
  status: "active",
  themeId: "american-diner",

  identity: {
    placeId: "place_jd_demo_006",
    name: sv("Juno's Diner", "google_places", { verified: true }),
    shortName: sv("Juno's", "business_owner", { verified: true }),
    primaryCategory: sv("Diner", "google_places", { verified: true }),
    categories: sv(["Diner", "Breakfast spot", "Burger restaurant"], "google_places", { verified: true }),
    businessStatus: sv("operational", "google_places", { verified: true, retrievedAt: "2026-09-12T07:00:00Z" }),
  },

  brand: {
    wordmark: sv("JUNO'S", "business_owner", { verified: true }),
    tagline: sv("Hot coffee, honest plates", "business_owner", { verified: true }),
  },

  hero: {
    eyebrow: sv("Since the neon still hums", "manual"),
    headline: sv("Breakfast all day, no apologies", "business_owner", { verified: true }),
    subheadline: sv("Counter seats, bottomless drip, and a griddle that has seen some things.", "business_owner", {
      verified: true,
    }),
    image: {
      value: img(
        "jd-hero",
        "https://picsum.photos/seed/junos-diner-hero/1600/1000",
        "Juno's chrome and red signboard above the entrance in morning light",
        { role: "hero", source: "business_owner", width: 1600, height: 1000 },
      ),
      source: "business_owner",
      verified: true,
    },
    primaryAction: null,
    secondaryAction: null,
  },

  contact: {
    phone: sv("+1 (614) 555-0166", "google_places", { verified: true }),
    socialLinks: [
      { platform: "facebook", url: "https://www.facebook.com/junosdiner.example", label: "Facebook" },
    ],
  },

  location: {
    formattedAddress: sv("1440 N High St, Columbus, OH 43201", "google_places", { verified: true }),
    shortAddress: sv("North High, Columbus", "google_places"),
    city: sv("Columbus", "google_places", { verified: true }),
    region: sv("Ohio", "google_places"),
    country: sv("United States", "google_places"),
    latitude: sv(39.9985, "google_places", { verified: true }),
    longitude: sv(-83.0081, "google_places", { verified: true }),
    timezone: sv("America/New_York", "google_places"),
    directionsUrl: sv("https://www.google.com/maps/dir/?api=1&destination=1440+N+High+St+Columbus+OH", "google_places"),
  },

  hours: {
    openNow: sv(true, "google_places", { retrievedAt: "2026-09-12T07:00:00Z" }),
    statusLabel: sv("Open until 3 PM", "google_places", { retrievedAt: "2026-09-12T07:00:00Z" }),
    weekdayDescriptions: sv(
      [
        "Monday: 7 AM to 2 PM",
        "Tuesday: 7 AM to 2 PM",
        "Wednesday: 7 AM to 2 PM",
        "Thursday: 7 AM to 3 PM",
        "Friday: 7 AM to 3 PM",
        "Saturday: 8 AM to 3 PM",
        "Sunday: 8 AM to 2 PM",
      ],
      "google_places",
      { verified: true },
    ),
  },

  reputation: {
    rating: sv(4.3, "google_places", { verified: true }),
    reviewCount: sv(968, "google_places", { verified: true }),
    reviews: [
      {
        id: "jd-r1",
        authorName: "Frank Delgado",
        rating: 5,
        text: "Two eggs, rye toast, and a bottomless cup for under ten dollars. The American project.",
        publishedAt: "2026-08-18",
      },
      {
        id: "jd-r2",
        authorName: "Sarah Kaminski",
        rating: 4,
        text: "The Olympia burger with griddled onions. Sit at the counter, let Ruth take care of you.",
        publishedAt: "2026-09-03",
      },
      {
        id: "jd-r3",
        authorName: "Marcus Bell",
        rating: 4,
        text: "Busy on Saturdays but the wait is short and the pie case is full by 9.",
        publishedAt: "2026-07-11",
      },
    ],
  },

  media: {
    images: [
      img("jd-g1", "https://picsum.photos/seed/junos-counter/1200/900", "The counter with red stools and pie case behind", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("jd-g2", "https://picsum.photos/seed/junos-eggs/1200/1200", "A plate of eggs over easy with rye toast", {
        role: "gallery",
        source: "google_places",
        width: 1200,
        height: 1200,
        attribution: { label: "Guest photo via Google Maps", authorName: "Sarah K." },
      }),
      img("jd-g3", "https://picsum.photos/seed/junos-burger/1200/900", "The Olympia burger in a wax paper basket", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 900,
      }),
      img("jd-g4", "https://picsum.photos/seed/junos-pie/1200/1500", "A whole coconut cream pie in a glass case", {
        role: "gallery",
        source: "business_owner",
        width: 1200,
        height: 1500,
      }),
    ],
    galleryTitle: sv("Counter culture", "manual"),
  },

  offering: {
    priceLevel: sv("$", "google_places", { verified: true }),
    services: {
      dineIn: sv(true, "google_places", { verified: true }),
      takeout: sv(true, "google_places", { verified: true }),
      curbsidePickup: sv(true, "business_owner", { verified: true }),
    },
    mealTypes: ["Breakfast", "Lunch"],
    menu: {
      mode: "verified",
      sections: [
        {
          id: "jd-breakfast",
          name: "Breakfast All Day",
          items: [
            mi("jd-m1", "Two and two", "$8.50", "Any style eggs, toast, hash browns", { featured: true }),
            mi("jd-m2", "Buttermilk stack", "$9", "Three high, whipped butter, warm syrup"),
            mi("jd-m3", "Biscuits and gravy", "$9.50", "Chipped beef or sausage, chive biscuit"),
            mi("jd-m4", "Greek omelet", "$11", "Feta, spinach, olives, side of rye"),
            mi("jd-m5", "Oatmeal and fruit", "$7", "Steel cut, brown sugar, seasonal fruit", { tags: ["Vegetarian"] }),
          ],
        },
        {
          id: "jd-burgers",
          name: "Burgers and Sandwiches",
          items: [
            mi("jd-m6", "The Olympia burger", "$11.50", "Double smash, griddled onion, pickles", { featured: true }),
            mi("jd-m7", "Patty melt", "$12", "Rye, swiss, caramelized onion"),
            mi("jd-m8", "Grilled chicken club", "$11", "Triple decker, bacon, avocado"),
            mi("jd-m9", "BLT on sourdough", "$9.50", "Thick cut bacon, summer tomato", { tags: ["Vegetarian option"] }),
          ],
        },
        {
          id: "jd-malts",
          name: "Malts and Pies",
          items: [
            mi("jd-m10", "Chocolate malt", "$6", "Hand-spun, extra malt powder, tall spoon"),
            mi("jd-m11", "Coconut cream pie", "$5.50", "Slice, toasted coconut, whipped cream", { tags: ["Vegetarian"] }),
            mi("jd-m12", "Cherry hand pie", "$4.50", "Flaky crust, sugar top", { tags: ["Vegetarian"] }),
          ],
        },
      ],
    },
  },

  amenities: {
    goodForChildren: sv(true, "google_places", { verified: true }),
    goodForGroups: sv(true, "manual"),
    restroom: sv(true, "manual", { verified: true }),
    parking: sv(["Free lot"], "business_owner", { verified: true }),
    paymentMethods: sv(["Visa", "Mastercard", "Cash"], "business_owner", { verified: true }),
  },

  content: {
    aboutTitle: sv("The corner counter", "business_owner", { verified: true }),
    aboutBody: sv(
      "Juno's has been feeding North High since before the students discovered it. The griddle runs from seven until two, the coffee never sits longer than twenty minutes, and the pie case is restocked every morning. Booths in front, counter in back, and everyone gets a hello.",
      "business_owner",
      { verified: true },
    ),
    announcement: sv("Biscuit week: all month, ask about the special.", "business_owner", { verified: true }),
  },

  callsToAction: {
    call: { label: "Call ahead for pickup", href: "+1 (614) 555-0166", kind: "call" },
    directions: {
      label: "Find the neon sign",
      href: "https://www.google.com/maps/dir/?api=1&destination=1440+N+High+St+Columbus+OH",
      kind: "directions",
      external: true,
    },
  },

  poc: {
    disclaimer: DISCLAIMER,
    createdAt: "2026-09-12T07:00:00Z",
    leadId: "lead-jd-1077",
  },
};
