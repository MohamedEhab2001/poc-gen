import "server-only";

import { timingSafeEqual } from "node:crypto";

/** Constant-time string comparison (Node crypto, server-only). */
export function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    // Compare against self to keep timing uniform, then fail.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
