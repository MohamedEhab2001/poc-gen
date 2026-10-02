import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Share-link token primitives. Tokens carry 256 bits of CSPRNG entropy and
 * are stored only as SHA-256 hashes; the plaintext exists once, in the API
 * response that created it.
 */

/** Generates a 256-bit share token, base64url-encoded (43 chars). */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hash of a token, hex-encoded, for at-rest lookup. */
export function hashShareToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time digest comparison. */
export function tokenHashMatches(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
