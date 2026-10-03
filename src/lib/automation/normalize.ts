/**
 * Deterministic normalization keys for duplicate detection and contact
 * handling. These functions are intentionally conservative and pure so the
 * dedup matrix is unit-testable and stable across processes.
 */

/** Lowercase, punctuation-free, whitespace-collapsed business name key. */
export function normalizeBusinessName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

/** Lowercase alphanumeric address key (street/city level detail preserved). */
export function normalizeAddressKey(address: string | null | undefined): string | null {
  if (address == null) return null;
  const key = address
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 190);
  return key.length > 0 ? key : null;
}

/** Registrable-domain key from a URL or bare domain; null when unusable. */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (input == null) return null;
  const raw = input.trim().toLowerCase();
  if (raw.length === 0) return null;
  let host: string;
  try {
    host = raw.includes("://") ? new URL(raw).hostname : raw.includes(".") ? new URL(`https://${raw}`).hostname : raw;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, "");
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) return null;
  return host.slice(0, 190);
}

/** Digits-plus-country-code phone key for dedup only (not validation). */
export function normalizePhoneKey(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const trimmed = raw.replace(/[^\d+]/g, "");
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `${hasPlus ? "+" : ""}${digits}`;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** RFC-lite email normalization: trim, lowercase. Null when malformed. */
export function normalizeEmailAddress(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const normalized = raw.trim().toLowerCase();
  if (normalized.length > 254 || !EMAIL_PATTERN.test(normalized)) return null;
  return normalized;
}

/** Domain part of a normalized email address, for per-domain limits. */
export function emailDomain(normalizedEmail: string): string {
  const at = normalizedEmail.lastIndexOf("@");
  return at === -1 ? normalizedEmail : normalizedEmail.slice(at + 1);
}
