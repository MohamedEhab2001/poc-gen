import "server-only";

import { z } from "zod";
import { GOOGLE_PHOTO_HOST } from "@/lib/poc/image-hosts";
import { pickBestHero } from "@/lib/poc/media";
import { placeIdSchema } from "@/lib/poc/schema";
import type { Attribution } from "@/lib/poc/schema";
import { MediaProviderError, fetchProviderJson } from "./types";
import type { PocResolvedImage } from "./types";

/**
 * Google Places (New) photos for ONE exact business, identified by a place
 * id confirmed against the lead's own Google evidence.
 *
 * Compliance: photo resource names expire and must not be cached, so this
 * provider only ever runs at render time; neither the names nor the returned
 * photo URIs are persisted. Requests are server-side, uncached, and send the
 * key in the X-Goog-Api-Key header — the key never appears in a URL, the
 * HTML, or a log line. The media endpoint is called with skipHttpRedirect so
 * the browser receives a keyless googleusercontent URI.
 *
 * https://developers.google.com/maps/documentation/places/web-service/place-photos
 */

const PLACES_BASE = "https://places.googleapis.com/v1";
const MAX_PHOTOS = 4;
const MIN_WIDTH = 800;
const MIN_HEIGHT = 450;
const MAX_WIDTH_PX = 1600;

const photoNameSchema = z
  .string()
  .max(512)
  .regex(/^places\/[A-Za-z0-9_-]{4,256}\/photos\/[A-Za-z0-9_-]{4,400}$/);

const placePhotosSchema = z.object({
  photos: z
    .array(
      z.object({
        name: photoNameSchema,
        widthPx: z.number().int().positive(),
        heightPx: z.number().int().positive(),
        authorAttributions: z
          .array(
            z.object({
              displayName: z.string().max(120).optional(),
              uri: z.string().max(2048).optional(),
            }),
          )
          .max(5)
          .optional(),
      }),
    )
    .max(10)
    .optional(),
});

const photoMediaSchema = z.object({ photoUri: z.string().max(4096) });

type GooglePhoto = NonNullable<z.infer<typeof placePhotosSchema>["photos"]>[number];

/** Only https Google profile links render as attribution links. */
function safeAuthorUri(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    return url.protocol === "https:" && /(^|\.)google\.com$/.test(url.hostname) ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Keyless photo URI on the single trusted Google photo host, or null. */
function trustedPhotoUri(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== GOOGLE_PHOTO_HOST) return null;
    if (url.searchParams.has("key")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function googleAttribution(photo: GooglePhoto): Attribution {
  const author = photo.authorAttributions?.find((entry) => entry.displayName?.trim());
  const authorUrl = safeAuthorUri(author?.uri);
  return {
    label: "Photo via Google Maps",
    ...(author?.displayName ? { authorName: author.displayName.trim() } : {}),
    ...(authorUrl ? { authorUrl } : {}),
  };
}

/** Best landscape photo first, then Google's own relevance order. */
export function orderGooglePhotos(photos: readonly GooglePhoto[]): GooglePhoto[] {
  const usable = photos.filter((photo) => photo.widthPx >= MIN_WIDTH && photo.heightPx >= MIN_HEIGHT);
  const hero = pickBestHero(usable.map((photo) => ({ photo, width: photo.widthPx, height: photo.heightPx })));
  if (!hero) return [];
  return [hero.photo, ...usable.filter((photo) => photo !== hero.photo)];
}

export interface GooglePhotosInput {
  placeId: string;
  apiKey: string;
  /** Total images wanted (hero first). Capped at four. */
  count: number;
  businessName: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
}

/**
 * Returns up to `count` photos of the place, hero candidate first. Throws a
 * MediaProviderError (reason code only) on any provider problem; the caller
 * falls through to the next tier.
 */
export async function fetchGooglePlacePhotos(input: GooglePhotosInput): Promise<PocResolvedImage[]> {
  if (!placeIdSchema.safeParse(input.placeId).success) throw new MediaProviderError("invalid_place_id");
  const count = Math.max(0, Math.min(MAX_PHOTOS, input.count));
  if (count === 0) return [];
  const headers = { "X-Goog-Api-Key": input.apiKey, "X-Goog-FieldMask": "photos" };

  const details = placePhotosSchema.safeParse(
    await fetchProviderJson(
      input.fetchImpl,
      `${PLACES_BASE}/places/${encodeURIComponent(input.placeId)}`,
      headers,
      input.timeoutMs,
    ),
  );
  if (!details.success) throw new MediaProviderError("invalid_response");
  const chosen = orderGooglePhotos(details.data.photos ?? []).slice(0, count);
  if (chosen.length === 0) throw new MediaProviderError("no_photos");

  const settled = await Promise.allSettled(
    chosen.map(async (photo) => {
      const media = photoMediaSchema.safeParse(
        await fetchProviderJson(
          input.fetchImpl,
          `${PLACES_BASE}/${photo.name}/media?maxWidthPx=${MAX_WIDTH_PX}&skipHttpRedirect=true`,
          { "X-Goog-Api-Key": input.apiKey },
          input.timeoutMs,
        ),
      );
      const url = media.success ? trustedPhotoUri(media.data.photoUri) : null;
      if (!url) throw new MediaProviderError("invalid_photo_uri");
      const scale = Math.min(1, MAX_WIDTH_PX / photo.widthPx);
      return { photo, url, width: Math.round(photo.widthPx * scale), height: Math.round(photo.heightPx * scale) };
    }),
  );

  const images: PocResolvedImage[] = [];
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    const { photo, url, width, height } = result.value;
    images.push({
      url,
      alt: `Photo of ${input.businessName} from its Google Maps listing`,
      role: images.length === 0 ? "hero" : "gallery",
      source: "google_places",
      isBusinessSpecific: true,
      attribution: googleAttribution(photo),
      width,
      height,
    });
  }
  if (images.length === 0) throw new MediaProviderError("no_usable_photos");
  return images;
}
