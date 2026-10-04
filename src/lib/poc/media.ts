import type { DataOrigin, PocImage } from "./schema";
import { GOOGLE_PHOTO_HOST, UNSPLASH_IMAGE_HOST } from "./image-hosts";

/**
 * Pure media-tier helpers shared by normalization (render), the server media
 * resolver (generation/render), and QA. No network, no server-only imports.
 *
 * Tiers, in priority order:
 *   1. verified_business — business-origin or licensed media in the record
 *   2. google_places     — photos of the exact place (trusted place id only)
 *   3. unsplash            — category concept photography, never the business
 *   4. concept_art       — ConceptHeroArt, the zero-network fail-safe
 */

export type PocMediaSource = "verified_business" | "google_places" | "unsplash" | "concept_art";

export const MEDIA_SOURCES: readonly PocMediaSource[] = [
  "verified_business",
  "google_places",
  "unsplash",
  "concept_art",
];

export const CONCEPT_LABEL_PREFIX = "Concept imagery";

export function mediaSourceOf(source: DataOrigin): PocMediaSource {
  if (source === "unsplash") return "unsplash";
  if (source === "fallback") return "concept_art";
  if (source === "google_places") return "google_places";
  return "verified_business";
}

/** Only real media of the business itself may ever be business-specific. */
export function isBusinessSpecificSource(source: DataOrigin): boolean {
  const tier = mediaSourceOf(source);
  return tier === "verified_business" || tier === "google_places";
}

/** Host check without throwing; null for relative or unparsable URLs. */
export function imageHost(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export const isUnsplashUrl = (url: string): boolean => imageHost(url) === UNSPLASH_IMAGE_HOST;
export const isGooglePhotoUrl = (url: string): boolean => imageHost(url) === GOOGLE_PHOTO_HOST;

/** Removes repeated URLs (and repeated provider ids), keeping first occurrence. */
export function dedupeImages<T extends Pick<PocImage, "url"> & { providerId?: string | null }>(
  images: readonly T[],
): T[] {
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const out: T[] = [];
  for (const image of images) {
    const urlKey = image.url.trim();
    if (seenUrls.has(urlKey)) continue;
    if (image.providerId && seenIds.has(image.providerId)) continue;
    seenUrls.add(urlKey);
    if (image.providerId) seenIds.add(image.providerId);
    out.push(image);
  }
  return out;
}

/**
 * Hero suitability score. Landscape, large images win; images without
 * dimensions keep a neutral score so record order decides between them.
 */
export function heroScore(image: { width?: number | null; height?: number | null }): number {
  const { width, height } = image;
  if (!width || !height) return 1;
  const ratio = width / height;
  const landscape = ratio >= 1.2 ? 2 : ratio >= 1 ? 1 : 0;
  const large = width >= 1600 ? 2 : width >= 1000 ? 1 : 0;
  return landscape * 3 + large;
}

/** Best hero candidate: highest score, ties keep the original order (stable). */
export function pickBestHero<T extends { width?: number | null; height?: number | null }>(
  images: readonly T[],
): T | null {
  let best: T | null = null;
  let bestScore = -1;
  for (const image of images) {
    const score = heroScore(image);
    if (score > bestScore) {
      best = image;
      bestScore = score;
    }
  }
  return best;
}

/** Deterministic 32-bit FNV-1a hash used for stable stock-photo selection. */
export function stableHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
