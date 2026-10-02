/**
 * Stateless HMAC-signed session tokens. Edge-safe: uses Web Crypto only, so
 * the same verification runs in middleware and in Node server contexts.
 *
 * Token format: v1.<base64url(payload)>.<base64url(hmacSHA256(secret, header + payload))>
 */

import { SESSION_MAX_AGE_SECONDS, getSessionSecret } from "./config";

export interface SessionPayload {
  email: string;
  name: string;
  /** Expiry as unix seconds. */
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return b64urlEncode(new Uint8Array(signature));
}

/** Constant-time equality for signature comparison. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(
  payload: Omit<SessionPayload, "exp">,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;
  const full: SessionPayload = { ...payload, exp: nowSeconds + SESSION_MAX_AGE_SECONDS };
  const header = "v1";
  const body = b64urlEncode(new TextEncoder().encode(JSON.stringify(full)));
  const signature = await sign(secret, `${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const secret = getSessionSecret();
  if (!secret) return null;
  const body = parts[1];
  const signature = parts[2];
  if (!body || !signature) return null;
  const expected = await sign(secret, `v1.${body}`);
  if (!timingSafeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) return null;
    if (typeof payload.email !== "string" || payload.email.length === 0) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(nowSeconds = Math.floor(Date.now() / 1000)) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: new Date((nowSeconds + SESSION_MAX_AGE_SECONDS) * 1000),
  };
}
