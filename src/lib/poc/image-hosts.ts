/**
 * Single source of truth for allowed external image hosts. Shared by URL
 * validation (isAllowedImageUrl) and the Content-Security-Policy img-src
 * directive in next.config.ts, so an approved host can never pass one gate
 * and be blocked by the other.
 *
 * Pure module: no server-only imports, safe for config files and tests.
 */

export const BASE_IMAGE_HOSTS: readonly string[] = [
  "picsum.photos",
  "fastly.picsum.photos",
  "i.picsum.photos",
];

const HOSTNAME_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(?:\.[a-z0-9-]{1,63})+$/;

/**
 * Validates one hostname candidate. Rejects protocols, paths, ports, CSP
 * separators, whitespace, wildcards, and anything that is not a plain
 * lowercase DNS hostname.
 */
export function isValidImageHostname(candidate: string): boolean {
  if (candidate.length === 0 || candidate.length > 253) return false;
  if (candidate !== candidate.toLowerCase()) return false;
  if (/[:/;\s*"'><@?\\]/.test(candidate)) return false;
  if (candidate.includes("..") || candidate.includes("--")) return false;
  return HOSTNAME_PATTERN.test(candidate);
}

export interface ParsedHosts {
  hosts: string[];
  rejected: string[];
}

/** Parses a comma-separated host list safely. Invalid entries are rejected. */
export function parseImageHostAllowlist(raw: string | undefined): ParsedHosts {
  const hosts: string[] = [];
  const rejected: string[] = [];
  if (!raw) return { hosts, rejected };
  for (const entry of raw.split(",")) {
    const candidate = entry.trim().toLowerCase();
    if (candidate === "") continue;
    if (isValidImageHostname(candidate)) {
      hosts.push(candidate);
    } else {
      rejected.push(entry.trim());
    }
  }
  return { hosts, rejected };
}

/** Extracts and validates a hostname from a base URL like an R2 public URL. */
export function hostnameFromBaseUrl(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    return isValidImageHostname(host) ? host : null;
  } catch {
    return null;
  }
}

/**
 * Resolves the full allowlist for the given environment: base placeholder
 * hosts, POC_IMAGE_HOST_ALLOWLIST entries, and the R2 public hostname when
 * configured. Deduplicated, order-stable.
 */
export function resolveImageHosts(env: Record<string, string | undefined> = {}): string[] {
  const fromList = parseImageHostAllowlist(env.POC_IMAGE_HOST_ALLOWLIST).hosts;
  const fromR2 = env.R2_PUBLIC_BASE_URL
    ? [hostnameFromBaseUrl(env.R2_PUBLIC_BASE_URL)].filter((host): host is string => host !== null)
    : [];
  return [...new Set([...BASE_IMAGE_HOSTS, ...fromList, ...fromR2])];
}

/**
 * Server runtime resolution. URL validation calls this (never a defaulted
 * empty environment) so POC_IMAGE_HOST_ALLOWLIST and R2_PUBLIC_BASE_URL are
 * honored at runtime exactly as they are at build time for the CSP.
 */
export function getRuntimeImageHosts(): string[] {
  return resolveImageHosts(process.env);
}

/**
 * Builds the CSP img-src directive value from the same validated host
 * collection. Used by next.config.ts and by tests proving CSP/runtime
 * agreement.
 */
export function cspImgSrc(env: Record<string, string | undefined> = {}): string {
  const hosts = resolveImageHosts(env);
  return `'self' data: blob: ${hosts.map((host) => `https://${host}`).join(" ")}`;
}
