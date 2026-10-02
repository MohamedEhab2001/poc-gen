/**
 * URL safety helpers. Every action rendered on a POC page must pass through
 * one of these. JavaScript URLs, data URLs, and malformed protocols are
 * rejected before they can reach an href.
 */

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
