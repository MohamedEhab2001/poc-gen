import type {
  ActionKind,
  Attribution,
  BusinessPocRecord,
  DataOrigin,
  PocImage,
  SocialLink,
  ThemeId,
} from "./schema";

export type { BusinessPocRecord, DataOrigin, ThemeId };

/**
 * The outcome of resolving one piece of record data. Themes and the internal
 * preview overlay consume these to decide visibility and provenance display.
 */
export type Outcome =
  | "verified"
  | "unverified"
  | "derived"
  | "fallback"
  | "hidden"
  | "sample";

export interface ResolvedImage {
  url: string;
  alt: string;
  role: PocImage["role"];
  source: DataOrigin;
  outcome: Outcome;
  width: number | null;
  height: number | null;
  attribution: Attribution | null;
  focalPoint: { x: number; y: number } | null;
}

export interface ResolvedCta {
  label: string;
  href: string;
  kind: ActionKind;
  external: boolean;
}

export interface ResolvedReview {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  publishedAt: string | null;
  sourceUrl: string | null;
  attribution: Attribution | null;
}

export interface ResolvedMenuSection {
  id: string;
  name: string;
  description: string | null;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    price: string | null;
    tags: string[];
    featured: boolean;
  }>;
}

export interface ResolvedMenu {
  mode: "verified" | "sample";
  notice: string | null;
  sections: ResolvedMenuSection[];
}

export interface ResolvedHours {
  descriptions: string[];
  openNow: boolean | null;
  statusLabel: string | null;
  missing: boolean;
}

export interface ResolvedLocation {
  formattedAddress: string | null;
  shortAddress: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  mapsUrl: string | null;
  directionsUrl: string | null;
  embedUrl: string | null;
  /** True when at least an address or coordinates exist. */
  hasPlace: boolean;
}

export interface ResolvedContact {
  phone: string | null;
  email: string | null;
  website: string | null;
  socials: SocialLink[];
}

export interface ServiceFlag {
  key: string;
  label: string;
}

export interface ProvenanceEntry {
  field: string;
  source: DataOrigin;
  outcome: Outcome;
  note?: string;
}

export interface ThemePalette {
  background: string;
  surface: string;
  text: string;
  muted: string;
  primary: string;
  secondary: string;
  accent: string;
  border: string;
}

/**
 * Normalized view model every theme consumes. All fallback rules from the
 * placeholder engine have already been applied; themes never inspect raw
 * nested record fields.
 */
export interface ResolvedBusiness {
  id: string;
  slug: string;
  status: BusinessPocRecord["status"];
  themeId: ThemeId;
  themeWasOverridden: boolean;

  palette: ThemePalette;
  density: "compact" | "comfortable" | "spacious";
  motion: "none" | "subtle" | "expressive";

  identity: {
    name: string;
    shortName: string;
    primaryCategory: string;
    categories: string[];
    businessStatus: "operational" | "temporarily_closed" | "permanently_closed" | "unknown";
  };

  wordmark: {
    text: string;
    image: ResolvedImage | null;
    outcome: Outcome;
  };

  tagline: string | null;

  hero: {
    eyebrow: string | null;
    headline: string;
    subheadline: string | null;
    image: ResolvedImage | null;
  };

  cta: {
    primary: ResolvedCta | null;
    secondary: ResolvedCta[];
    mobile: ResolvedCta[];
  };

  reputation: {
    rating: number;
    reviewCount: number;
    summary: string | null;
    reviews: ResolvedReview[];
    reviewsUrl: string | null;
  } | null;

  services: ServiceFlag[];
  amenities: ServiceFlag[];
  compactServiceStrip: boolean;

  about: { title: string; body: string } | null;

  menu: ResolvedMenu | null;

  gallery: { title: string | null; images: ResolvedImage[] } | null;

  hours: ResolvedHours | null;

  location: ResolvedLocation | null;

  contact: ResolvedContact;

  announcement: string | null;

  offering: {
    priceLevel: string | null;
    priceRange: string | null;
    mealTypes: string[];
    dietaryOptions: string[];
  };

  poc: {
    conceptLabel: string;
    disclaimer: string;
    createdAt: string;
  };

  provenance: ProvenanceEntry[];
  warnings: string[];
}

export interface ThemeProps {
  record: ResolvedBusiness;
}
