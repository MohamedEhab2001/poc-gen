import "server-only";

import { pickBestHero } from "@/lib/poc/media";
import { normalizeRecord } from "@/lib/poc/normalize";
import { placeIdSchema } from "@/lib/poc/schema";
import type { BusinessPocRecord, PocImage } from "@/lib/poc/schema";
import type { ResolvedImage } from "@/lib/poc/types";
import { fetchGooglePlacePhotos } from "./google-places-provider";
import { buildConceptQuery, searchUnsplashPhotos, selectUnsplashImages, trackUnsplashDownloads } from "./unsplash-provider";
import { DEFAULT_MEDIA_TIMEOUT_MS, MediaProviderError } from "./types";
import type { MediaDeps, PocMediaResolution, PocResolvedImage } from "./types";

/**
 * Automated POC media resolution, in strict priority order:
 *
 *   1. verified business media already in the record (never replaced)
 *   2. Google Places photos of the exact place (trusted place id only)
 *   3. Unsplash concept photography (category imagery, never the business)
 *   4. ConceptHeroArt (normalization's zero-network fallback)
 *
 * Every provider is optional: a missing key, timeout, quota error, or bad
 * response only moves resolution to the next tier and is never thrown.
 */

function fromResolved(image: ResolvedImage, role: "hero" | "gallery"): PocResolvedImage {
  return {
    url: image.url,
    alt: image.alt,
    role,
    source: image.mediaSource,
    isBusinessSpecific: image.isBusinessSpecific,
    ...(image.attribution ? { attribution: image.attribution } : {}),
    ...(image.width ? { width: image.width } : {}),
    ...(image.height ? { height: image.height } : {}),
    ...(image.averageColor ? { averageColor: image.averageColor } : {}),
  };
}

function reasonCode(error: unknown): string {
  return error instanceof MediaProviderError ? error.code : "unexpected";
}

export interface ResolvePocMediaInput {
  record: BusinessPocRecord;
  /** Trusted Google place id, or null to skip Google entirely. */
  placeId: string | null;
  desiredHeroCount?: number;
  desiredGalleryCount?: number;
  /**
   * Live Unsplash search. Enabled at generation (results are stored for
   * stability); disabled at render, which reuses the stored selection.
   */
  conceptSearch?: boolean;
  deps?: MediaDeps;
}

export async function resolvePocMedia(input: ResolvePocMediaInput): Promise<PocMediaResolution> {
  const desiredHero = Math.max(0, Math.min(1, input.desiredHeroCount ?? 1));
  const desiredGallery = Math.max(0, Math.min(3, input.desiredGalleryCount ?? 3));
  const env = input.deps?.env ?? process.env;
  const fetchImpl = input.deps?.fetch ?? fetch;
  const timeoutMs = input.deps?.timeoutMs ?? DEFAULT_MEDIA_TIMEOUT_MS;
  const notes: string[] = [];

  // Tier 1: the record's own media through the same policy/host gates and
  // tiering the theme renderer uses.
  const model = normalizeRecord(input.record);
  const name = model.identity.name;
  const recordHero = model.hero.image;
  const recordGallery = model.gallery?.images ?? [];
  const businessGallery = recordGallery.filter((image) => image.isBusinessSpecific);

  let hero: PocResolvedImage | null = recordHero?.isBusinessSpecific ? fromResolved(recordHero, "hero") : null;
  let promotedHeroUrl: string | null = null;
  if (!hero && desiredHero > 0) {
    // A real gallery photo beats any stock or concept hero.
    const promoted = pickBestHero(businessGallery);
    if (promoted) {
      hero = fromResolved(promoted, "hero");
      promotedHeroUrl = promoted.url;
    }
  }
  let gallery = businessGallery
    .filter((image) => image.url !== promotedHeroUrl)
    .slice(0, desiredGallery)
    .map((image) => fromResolved(image, "gallery"));

  // Tier 2: Google Places photos of the exact place.
  const needHero = desiredHero > 0 && !hero;
  const needGallery = Math.max(0, desiredGallery - gallery.length);
  if (needHero || needGallery > 0) {
    const apiKey = env.GOOGLE_PLACES_API_KEY?.trim();
    if (!input.placeId || !placeIdSchema.safeParse(input.placeId).success) {
      notes.push("google_places:no_trusted_place_id");
    } else if (!apiKey) {
      notes.push("google_places:no_key");
    } else {
      try {
        const photos = await fetchGooglePlacePhotos({
          placeId: input.placeId,
          apiKey,
          count: (needHero ? 1 : 0) + needGallery,
          businessName: name,
          fetchImpl,
          timeoutMs,
        });
        const queue = photos.filter((photo) => photo.url !== hero?.url && !gallery.some((g) => g.url === photo.url));
        if (needHero && queue.length > 0) hero = { ...queue.shift()!, role: "hero" };
        gallery = [...gallery, ...queue.slice(0, needGallery).map((photo) => ({ ...photo, role: "gallery" as const }))];
        notes.push(`google_places:ok:${photos.length}`);
      } catch (error) {
        notes.push(`google_places:${reasonCode(error)}`);
      }
    }
  }

  // Tier 3: Unsplash concept imagery, only where no real photo exists (concept
  // stock never mixes into a gallery of real business photos).
  let conceptQuery: string | null = null;
  const wantConceptHero = desiredHero > 0 && !hero;
  const wantConceptGallery = desiredGallery > 0 && gallery.length === 0;
  if (wantConceptHero || wantConceptGallery) {
    // Stored concept selection first (stable across renders and rebuilds).
    if (wantConceptHero && recordHero?.mediaSource === "unsplash") hero = fromResolved(recordHero, "hero");
    const storedConcept = recordGallery.filter((image) => image.mediaSource === "unsplash");
    if (wantConceptGallery && storedConcept.length > 0) {
      gallery = storedConcept.slice(0, desiredGallery).map((image) => fromResolved(image, "gallery"));
    }

    const stillHero = wantConceptHero && !hero;
    const stillGallery = wantConceptGallery && gallery.length === 0;
    const concept = buildConceptQuery({
      primaryCategory: model.identity.primaryCategory,
      categories: model.identity.categories,
    });
    conceptQuery = input.record.media.resolution?.conceptQuery ?? concept.query;
    const apiKey = env.UNSPLASH_ACCESS_KEY?.trim();
    if ((stillHero || stillGallery) && input.conceptSearch !== false) {
      if (!apiKey) {
        notes.push("unsplash:no_key");
      } else {
        try {
          const photos = await searchUnsplashPhotos({ query: concept.query, apiKey, fetchImpl, timeoutMs });
          const selected = selectUnsplashImages(photos, {
            seed: input.record.id || input.record.slug,
            heroCount: stillHero ? 1 : 0,
            galleryCount: stillGallery ? desiredGallery : 0,
            subject: concept.subject,
            businessName: name,
          });
          if (stillHero && selected.hero) hero = selected.hero;
          if (stillGallery) gallery = selected.gallery;
          conceptQuery = concept.query;
          notes.push("unsplash:ok");
          // Selected for use as POC hero/gallery: register the downloads.
          await trackUnsplashDownloads({
            images: [stillHero ? selected.hero : null, ...(stillGallery ? selected.gallery : [])],
            apiKey,
            fetchImpl,
            timeoutMs,
          });
        } catch (error) {
          notes.push(`unsplash:${reasonCode(error)}`);
        }
      }
    }
  }

  return {
    hero,
    gallery,
    heroSource: hero ? hero.source : "concept_art",
    promotedHeroUrl,
    conceptQuery,
    notes,
  };
}

function toPocImage(image: PocResolvedImage, id: string, retrievedAt: string): PocImage {
  return {
    id,
    url: image.url,
    alt: image.alt,
    role: image.role === "logo" ? "gallery" : image.role,
    source: image.source === "unsplash" ? "unsplash" : "google_places",
    verified: false,
    retrievedAt,
    ...(image.attribution ? { attribution: image.attribution } : {}),
    ...(image.width ? { width: image.width } : {}),
    ...(image.height ? { height: image.height } : {}),
    ...(image.averageColor ? { averageColor: image.averageColor } : {}),
    ...(image.providerId ? { providerId: image.providerId } : {}),
  };
}

/**
 * Generation-time application. Stores ONLY what may be persisted: the
 * trusted place id, the concept query, Unsplash concept images, and (when a
 * real gallery photo was promoted) that image's hero role. Google photos are
 * never written here. Caller-supplied resolution metadata is overwritten.
 */
export function applyGenerationMedia(
  record: BusinessPocRecord,
  resolution: PocMediaResolution,
  trustedPlaceId: string | null,
  now: Date,
): BusinessPocRecord {
  const retrievedAt = now.toISOString();
  const existingUrls = new Set(record.media.images.map((image) => image.url));
  const images = record.media.images.map((image) =>
    resolution.promotedHeroUrl && image.url === resolution.promotedHeroUrl ? { ...image, role: "hero" as const } : image,
  );
  const concept = [resolution.hero, ...resolution.gallery].filter(
    (image): image is PocResolvedImage => image !== null && image.source === "unsplash" && !existingUrls.has(image.url),
  );
  for (const [index, image] of concept.entries()) {
    if (images.length >= 24) break;
    const id = `concept-${image.role}-${(image.providerId ?? String(index)).replace(/[^A-Za-z0-9_-]/g, "-")}`;
    images.push(toPocImage(image, id, retrievedAt));
  }
  return {
    ...record,
    media: {
      ...record.media,
      images,
      resolution: {
        trustedPlaceId,
        conceptQuery: images.some((image) => image.source === "unsplash") ? resolution.conceptQuery : null,
      },
    },
  };
}

/**
 * Render-time Google resolution. Returns a TRANSIENT copy of the record with
 * Google place photos appended for this request only — the stored record is
 * never mutated and photo URIs are never persisted. No trusted place id, no
 * key, or any provider failure returns the record unchanged.
 */
export async function withRuntimeMedia(record: BusinessPocRecord, deps?: MediaDeps): Promise<BusinessPocRecord> {
  const placeId = record.media.resolution?.trustedPlaceId ?? null;
  if (!placeId || !(deps?.env ?? process.env).GOOGLE_PLACES_API_KEY) return record;
  try {
    const resolution = await resolvePocMedia({ record, placeId, conceptSearch: false, deps });
    const google = [resolution.hero, ...resolution.gallery].filter(
      (image): image is PocResolvedImage => image !== null && image.source === "google_places",
    );
    const failed = resolution.notes.find((note) => note.startsWith("google_places:") && !note.startsWith("google_places:ok"));
    if (failed) console.warn(`[media] Google place photos unavailable (${failed.slice("google_places:".length)}); using fallback tiers.`);
    if (google.length === 0) return record;
    const retrievedAt = new Date().toISOString();
    return {
      ...record,
      media: {
        ...record.media,
        images: [
          ...record.media.images,
          ...google.map((image, index) => toPocImage(image, `google-runtime-${index}`, retrievedAt)),
        ],
      },
    };
  } catch {
    console.warn("[media] Runtime media resolution failed; using stored media.");
    return record;
  }
}
