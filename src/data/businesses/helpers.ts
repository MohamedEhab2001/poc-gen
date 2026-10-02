import type { Attribution, DataOrigin, PocImage } from "@/lib/poc/schema";

type SourceOpts = {
  verified?: boolean;
  confidence?: number;
  retrievedAt?: string;
  attribution?: Attribution | null;
};

/** Builds a SourcedValue without the fixture-level boilerplate. */
export function sv<T>(value: T | null, source: DataOrigin = "manual", opts: SourceOpts = {}) {
  return {
    value,
    source,
    verified: opts.verified,
    confidence: opts.confidence,
    retrievedAt: opts.retrievedAt,
    attribution: opts.attribution,
  };
}

/** Builds a PocImage with sensible defaults. */
export function img(
  id: string,
  url: string,
  alt: string,
  opts: {
    role?: PocImage["role"];
    source?: DataOrigin;
    width?: number | null;
    height?: number | null;
    attribution?: Attribution | null;
    focalPoint?: { x: number; y: number } | null;
  } = {},
): PocImage {
  return {
    id,
    url,
    alt,
    role: opts.role,
    source: opts.source ?? "manual",
    width: opts.width ?? null,
    height: opts.height ?? null,
    attribution: opts.attribution ?? null,
    focalPoint: opts.focalPoint ?? null,
  };
}

/** Builds a menu item. */
export function mi(
  id: string,
  name: string,
  price: string | null,
  description?: string,
  opts: { tags?: string[]; featured?: boolean } = {},
): {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  tags: string[];
  featured: boolean;
} {
  return {
    id,
    name,
    price,
    description: description ?? null,
    tags: opts.tags ?? [],
    featured: opts.featured ?? false,
  };
}

export const social = (
  platform: "instagram" | "facebook" | "tiktok" | "youtube" | "x" | "other",
  url: string,
  label?: string,
): { platform: typeof platform; url: string; label?: string } => ({ platform, url, label });

export const DISCLAIMER =
  "This is an unofficial concept website created for demonstration. It is not published by or endorsed by the business.";
