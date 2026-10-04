import "server-only";

import type { Attribution } from "@/lib/poc/schema";
import type { PocMediaSource } from "@/lib/poc/media";

export type { PocMediaSource };

/**
 * One image chosen by the media resolver. Attribution reuses the record's
 * existing Attribution shape (authorName/authorUrl carry the photographer or
 * Google contributor) so resolved images map 1:1 onto PocImage.
 */
export interface PocResolvedImage {
  url: string;
  alt: string;
  role: "hero" | "gallery" | "logo";
  source: PocMediaSource;
  isBusinessSpecific: boolean;
  attribution?: Attribution;
  width?: number;
  height?: number;
  averageColor?: string;
  /** Provider asset id (Unsplash photo id) for deduplication. */
  providerId?: string;
  /** Unsplash download-tracking endpoint; transient, never persisted. */
  downloadLocation?: string;
}

export interface PocMediaResolution {
  hero: PocResolvedImage | null;
  gallery: PocResolvedImage[];
  /** Tier that supplied the hero; concept_art when nothing else qualified. */
  heroSource: PocMediaSource;
  /** URL of a business gallery image promoted to hero, when that happened. */
  promotedHeroUrl: string | null;
  /** Deterministic Unsplash query, when concept imagery was considered. */
  conceptQuery: string | null;
  /** Safe diagnostics only (provider + reason codes, never URLs or keys). */
  notes: string[];
}

export interface MediaDeps {
  fetch?: typeof fetch;
  env?: Record<string, string | undefined>;
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number;
}

export const DEFAULT_MEDIA_TIMEOUT_MS = 3500;

/** Provider failure carrying only a safe reason code. */
export class MediaProviderError extends Error {
  constructor(readonly code: string) {
    super(`media provider error: ${code}`);
    this.name = "MediaProviderError";
  }
}

/**
 * Bounded, uncached JSON request. Keys travel in headers only (never in the
 * URL), redirects are refused, and every failure collapses to a reason code
 * so neither URLs nor credentials can reach logs or error messages.
 */
export async function fetchProviderJson(
  fetchImpl: typeof fetch,
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers,
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new MediaProviderError(response.status === 429 ? "quota" : `http_${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof MediaProviderError) throw error;
    throw new MediaProviderError(controller.signal.aborted ? "timeout" : "network");
  } finally {
    clearTimeout(timer);
  }
}
