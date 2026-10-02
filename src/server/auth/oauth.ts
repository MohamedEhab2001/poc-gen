import "server-only";

/** Shared OAuth state helpers for the Google login flow. */

export const STATE_COOKIE = "poc_oauth_state";
export const STATE_MAX_AGE = 600;

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function sanitizeNextPath(value: string | null | undefined): string {
  if (!value) return "/themes";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/themes";
}
