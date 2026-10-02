/**
 * URL safety helpers. Every action rendered on a POC page must pass through
 * one of these. JavaScript URLs, data URLs, and malformed protocols are
 * rejected before they can reach an href.
 */

import { resolveImageHosts } from "./image-hosts";

const SAFE_PROTOCOLS = new Set(["https:"]);

/** True when the URL parses, is absolute, and uses https. */
export function isSafeExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

/** Normalizes an https URL, or returns null when unsafe. */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!isSafeExternalUrl(trimmed)) return null;
  return trimmed;
}

/** Extracts dialable digits and returns a tel: href, or null when unusable. */
export function telHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/[^\d+]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/** Returns a mailto: href for a plausible email, or null. */
export function mailtoHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return null;
  return `mailto:${trimmed}`;
}

/** Builds a Google Maps search URL from coordinates or an address. */
export function mapsQueryUrl(place: {
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
}): string | null {
  const { latitude, longitude, formattedAddress } = place;
  if (typeof latitude === "number" && typeof longitude === "number") {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }
  if (formattedAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress)}`;
  }
  return null;
}

/** Validates a hex color like #1a2b3c or #abc. */
export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

/**
 * Trusted map-embed origins. Arbitrary HTTPS iframe URLs are rejected: only
 * the explicit Google Maps embed endpoints may be framed.
 */
const TRUSTED_EMBED_ORIGINS = new Set(["https://www.google.com", "https://maps.google.com"]);
const TRUSTED_EMBED_PATH_PREFIXES = ["/maps/embed"];

export function isTrustedMapEmbed(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!TRUSTED_EMBED_ORIGINS.has(url.origin)) return false;
    return TRUSTED_EMBED_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  } catch {
    return false;
  }
}

/**
 * Image URL policy: local paths (no protocol-relative tricks) or HTTPS hosts
 * on the shared allowlist (src/lib/poc/image-hosts.ts), which also drives the
 * CSP img-src directive so the two can never drift apart.
 */
export function isAllowedImageUrl(raw: string, hosts: readonly string[] = resolveImageHosts()): boolean {
  if (raw.startsWith("/") && !raw.startsWith("//")) return true;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && hosts.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
