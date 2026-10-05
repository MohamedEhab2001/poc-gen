import "server-only";

import { z } from "zod";
import { UNSPLASH_IMAGE_HOST } from "@/lib/poc/image-hosts";
import { CONCEPT_LABEL_PREFIX, stableHash } from "@/lib/poc/media";
import { MediaProviderError, fetchProviderJson } from "./types";
import type { PocResolvedImage } from "./types";

/**
 * Unsplash concept photography. Images illustrate the CATEGORY, never the
 * business: every result is marked source "unsplash", isBusinessSpecific
 * false, and carries a "Concept imagery · Photo by … on Unsplash" credit
 * linking the photographer and Unsplash (with the required UTM referral).
 *
 * Unsplash API guidelines honored here:
 * - the access key is sent server-side only (Authorization: Client-ID …);
 * - images are hotlinked from the returned photo.urls (never downloaded,
 *   re-uploaded, or proxied) — dynamic sizing uses the documented imgix
 *   parameters on urls.raw, which keeps the tracking ixid parameter;
 * - the returned download_location endpoint is triggered for each photo
 *   selected for a POC hero or gallery.
 *
 * Runs at generation time so the stored selection stays stable.
 * https://unsplash.com/documentation
 */

const SEARCH_URL = "https://api.unsplash.com/search/photos";
const API_HOST = "api.unsplash.com";
const PER_PAGE = 15;
const HERO_WIDTH = 1920;
const GALLERY_WIDTH = 1200;
/** Unsplash referral attribution: links must carry utm_source/utm_medium. */
export const UNSPLASH_UTM_SOURCE = "poc_gen";

/**
 * Category-aware templates, first match wins. Each query only restates the
 * verified category in visual terms: no invented services, menu items, or
 * claims about the business.
 */
const TEMPLATES: Array<{ match: RegExp; query: string; subject: string }> = [
  {
    match: /bubble\s*tea|\bboba\b/i,
    query: "colorful bubble tea boba drinks cafe",
    subject: "colorful bubble tea drinks",
  },
  { match: /\b(coffee|caf[eé]|espresso|roaster)/i, query: "cozy independent coffee shop interior", subject: "a cozy coffee shop interior" },
  { match: /\btea\b|tea ?room|tea ?house/i, query: "calm tea room interior", subject: "a calm tea room" },
  { match: /bakery|bakeries|pastr|patisserie|boulangerie/i, query: "local bakery pastries", subject: "bakery pastries" },
  { match: /dessert|ice cream|gelato|sweets|confection/i, query: "dessert shop sweets", subject: "a dessert counter" },
  { match: /ramen|noodle|pho\b/i, query: "steaming noodle bowl restaurant", subject: "a steaming noodle bowl" },
  { match: /sushi|japanese/i, query: "japanese restaurant food", subject: "Japanese dishes" },
  { match: /taco|taqueria|mexican|cantina/i, query: "mexican street tacos", subject: "street tacos" },
  { match: /pizz/i, query: "wood fired pizza restaurant", subject: "a wood-fired pizza" },
  { match: /brew(ery|pub)|craft beer/i, query: "craft brewery taproom", subject: "a brewery taproom" },
  { match: /wine bar|wine shop|winery|vineyard/i, query: "wine bar interior", subject: "a wine bar" },
  { match: /cocktail|\bbar\b|\bpub\b|lounge|speakeasy|supper club/i, query: "cocktail bar interior evening", subject: "a cocktail bar in the evening" },
  { match: /diner/i, query: "classic american diner interior", subject: "a classic diner interior" },
  { match: /brunch|breakfast/i, query: "bright brunch table", subject: "a brunch table" },
  { match: /restaurant|bistro|eatery|kitchen|grill|dining|taverna|trattoria|brasserie|food/i, query: "modern neighborhood restaurant food", subject: "restaurant dishes" },
  { match: /dentist|dental|orthodont/i, query: "professional dental clinic interior", subject: "a dental clinic interior" },
  { match: /medical|clinic|doctor|physician|physio|chiropract|health/i, query: "modern medical clinic interior", subject: "a medical clinic interior" },
  { match: /yoga|pilates/i, query: "calm yoga studio", subject: "a yoga studio" },
  { match: /gym|fitness|crossfit|training|boxing/i, query: "boutique fitness studio", subject: "a fitness studio" },
  { match: /barber/i, query: "barbershop interior", subject: "a barbershop interior" },
  { match: /salon|hair|nail|beauty|spa\b|esthetic/i, query: "modern beauty salon interior", subject: "a salon interior" },
  { match: /florist|flower/i, query: "flower shop bouquets", subject: "flower bouquets" },
  { match: /law|attorney|legal|account|bookkeep|tax|consult|insurance|real estate|agency|financ/i, query: "professional office workspace", subject: "a professional office" },
  { match: /plumb|electric|hvac|contractor|repair|roof|handyman/i, query: "professional tradesperson tools", subject: "professional tools" },
  { match: /pet|groom|veterinar/i, query: "pet grooming salon", subject: "a pet care studio" },
  { match: /shop|store|boutique|retail/i, query: "independent boutique shop interior", subject: "a boutique interior" },
];

export interface ConceptQuery {
  query: string;
  /** Human phrase for alt text, e.g. "a cozy coffee shop interior". */
  subject: string;
}

/** Deterministic, category-aware search query from verified category data. */
export function buildConceptQuery(input: { primaryCategory: string | null; categories: readonly string[] }): ConceptQuery {
  const haystack = [input.primaryCategory ?? "", ...input.categories].join(" | ");
  const template = TEMPLATES.find((entry) => entry.match.test(haystack));
  if (template) return { query: template.query, subject: template.subject };
  const category = (input.primaryCategory ?? "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");
  return category
    ? { query: `${category} small business`, subject: `a ${category} setting` }
    : { query: "welcoming local storefront", subject: "a local storefront" };
}

const unsplashPhotoSchema = z.object({
  id: z.string().min(1).max(64),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  color: z.string().nullable().optional(),
  urls: z.object({ raw: z.string().max(2048), regular: z.string().max(2048).optional() }),
  links: z.object({ html: z.string().max(2048), download_location: z.string().max(2048) }),
  user: z.object({
    name: z.string().min(1).max(120),
    links: z.object({ html: z.string().max(2048) }),
  }),
});

const unsplashSearchSchema = z.object({ results: z.array(unsplashPhotoSchema).max(80) });

export type UnsplashPhoto = z.infer<typeof unsplashPhotoSchema>;

/** https unsplash.com link with the required referral parameters, or null. */
function referralUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || (url.hostname !== "unsplash.com" && url.hostname !== "www.unsplash.com")) {
      return null;
    }
    url.searchParams.set("utm_source", UNSPLASH_UTM_SOURCE);
    url.searchParams.set("utm_medium", "referral");
    return url.toString();
  } catch {
    return null;
  }
}

/** Hotlinked urls.raw on the single trusted image host, sized via imgix params. */
function sizedImageUrl(raw: string, width: number): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== UNSPLASH_IMAGE_HOST) return null;
    url.searchParams.set("auto", "format");
    url.searchParams.set("fit", "crop");
    url.searchParams.set("q", "80");
    url.searchParams.set("w", String(width));
    return url.toString();
  } catch {
    return null;
  }
}

/** The download-tracking endpoint, only on the official API host. */
function trustedDownloadLocation(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.hostname === API_HOST ? url.toString() : null;
  } catch {
    return null;
  }
}

function toConceptImage(
  photo: UnsplashPhoto,
  role: "hero" | "gallery",
  context: { subject: string; businessName: string },
): PocResolvedImage | null {
  const targetWidth = Math.min(photo.width, role === "hero" ? HERO_WIDTH : GALLERY_WIDTH);
  const url = sizedImageUrl(photo.urls.raw, targetWidth);
  if (!url) return null;
  const photographer = photo.user.name.trim();
  const photographerUrl = referralUrl(photo.user.links.html);
  const averageColor = photo.color && /^#[0-9a-fA-F]{6}$/.test(photo.color) ? photo.color : undefined;
  const downloadLocation = trustedDownloadLocation(photo.links.download_location);
  return {
    url,
    alt: `Concept photo of ${context.subject}: illustrative stock imagery, not a photo of ${context.businessName}`,
    role,
    source: "unsplash",
    isBusinessSpecific: false,
    attribution: {
      label: `${CONCEPT_LABEL_PREFIX} · Photo by ${photographer} on Unsplash`,
      // The credit's "Unsplash" link: the platform with the referral params.
      url: referralUrl("https://unsplash.com/")!,
      authorName: photographer,
      ...(photographerUrl ? { authorUrl: photographerUrl } : {}),
    },
    width: targetWidth,
    height: Math.round((targetWidth * photo.height) / photo.width),
    ...(averageColor ? { averageColor } : {}),
    providerId: `unsplash:${photo.id}`,
    ...(downloadLocation ? { downloadLocation } : {}),
  };
}

/**
 * Deterministic selection: the same seed (record id or slug) over the same
 * search results always yields the same hero and gallery, so rebuilding a
 * POC does not reshuffle its imagery. Hero candidates must be large landscape.
 */
export function selectUnsplashImages(
  photos: readonly UnsplashPhoto[],
  options: { seed: string; heroCount: number; galleryCount: number; subject: string; businessName: string },
): { hero: PocResolvedImage | null; gallery: PocResolvedImage[] } {
  const unique = photos.filter((photo, index) => photos.findIndex((other) => other.id === photo.id) === index);
  const offset = stableHash(options.seed);
  const context = { subject: options.subject, businessName: options.businessName };

  let hero: PocResolvedImage | null = null;
  let heroId: string | null = null;
  if (options.heroCount > 0) {
    const heroCandidates = unique.filter((photo) => photo.width >= 1600 && photo.width / photo.height >= 1.3);
    for (let attempt = 0; attempt < heroCandidates.length && !hero; attempt += 1) {
      const photo = heroCandidates[(offset + attempt) % heroCandidates.length]!;
      hero = toConceptImage(photo, "hero", context);
      if (hero) heroId = photo.id;
    }
  }

  const rest = unique.filter((photo) => photo.id !== heroId && photo.width >= 800);
  const gallery: PocResolvedImage[] = [];
  for (let index = 0; index < rest.length && gallery.length < options.galleryCount; index += 1) {
    const image = toConceptImage(rest[(offset + 1 + index) % rest.length]!, "gallery", context);
    if (image) gallery.push(image);
  }
  return { hero, gallery };
}

function authHeaders(accessKey: string): Record<string, string> {
  return { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" };
}

export async function searchUnsplashPhotos(input: {
  query: string;
  apiKey: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}): Promise<UnsplashPhoto[]> {
  const params = new URLSearchParams({
    query: input.query,
    orientation: "landscape",
    content_filter: "high",
    per_page: String(PER_PAGE),
  });
  const parsed = unsplashSearchSchema.safeParse(
    await fetchProviderJson(input.fetchImpl, `${SEARCH_URL}?${params.toString()}`, authHeaders(input.apiKey), input.timeoutMs),
  );
  if (!parsed.success) throw new MediaProviderError("invalid_response");
  if (parsed.data.results.length === 0) throw new MediaProviderError("no_photos");
  return parsed.data.results;
}

/**
 * Triggers download_location for every selected photo (required by the
 * Unsplash API guidelines when a photo is used). Best effort: tracking
 * failures never affect the POC.
 */
export async function trackUnsplashDownloads(input: {
  images: ReadonlyArray<PocResolvedImage | null>;
  apiKey: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}): Promise<number> {
  const locations = [
    ...new Set(
      input.images.flatMap((image) => (image?.source === "unsplash" && image.downloadLocation ? [image.downloadLocation] : [])),
    ),
  ];
  const settled = await Promise.allSettled(
    locations.map((location) => fetchProviderJson(input.fetchImpl, location, authHeaders(input.apiKey), input.timeoutMs)),
  );
  return settled.filter((result) => result.status === "fulfilled").length;
}
