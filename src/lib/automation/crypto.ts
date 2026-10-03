import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Contact-data cryptography.
 *
 * Raw contact addresses are stored only as versioned AES-256-GCM envelopes
 * (envelope format "aead:v1:<keyId>:<iv>:<ciphertext>:<tag>", with a fixed
 * AAD binding the payload kind). Deduplication and suppression lookups use a
 * keyed HMAC-SHA256 hash so the database cannot be mined for real addresses.
 *
 * Key configuration: CONTACT_DATA_ENCRYPTION_KEYS is a comma-separated list
 * of "<keyId>:<base64 32-byte key>" entries; CONTACT_DATA_ACTIVE_KEY_ID
 * selects the key used for NEW envelopes. Rotation: add the new key, flip
 * the active id; old keys stay configured for decryption until every
 * envelope has been re-written. The address-hash key is DERIVED (HKDF) from
 * the lexicographically-first configured key id, so dedup hashes stay stable
 * across rotation — which is exactly the constraint that the oldest key must
 * remain configured while any envelope still uses it.
 *
 * Keys never live in the database or the repository.
 */

const KEY_LENGTH = 32;
const AAD = "poc-gen:contact-address";
const HASH_KEY_INFO = "poc-gen:contact-address-hash:v1";
export const ENVELOPE_PREFIX = "aead:v1:";

export class ContactKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactKeyError";
  }
}

export function parseContactKeys(spec: string | undefined): Map<string, Buffer> {
  const keys = new Map<string, Buffer>();
  if (!spec || spec.trim().length === 0) return keys;
  for (const entryRaw of spec.split(",")) {
    const entry = entryRaw.trim();
    if (entry.length === 0) continue;
    const separator = entry.indexOf(":");
    if (separator <= 0) {
      throw new ContactKeyError("Malformed CONTACT_DATA_ENCRYPTION_KEYS entry.");
    }
    const keyId = entry.slice(0, separator);
    const material = Buffer.from(entry.slice(separator + 1), "base64");
    if (!/^[A-Za-z0-9_-]{1,36}$/.test(keyId)) {
      throw new ContactKeyError("Contact key ids must be short alphanumeric ids.");
    }
    if (material.length !== KEY_LENGTH) {
      // Rejects weak (short), malformed, and accidentally-pasted keys alike.
      throw new ContactKeyError(`Contact key "${keyId}" must be exactly 32 bytes (base64).`);
    }
    if (keys.has(keyId)) {
      throw new ContactKeyError(`Duplicate contact key id "${keyId}".`);
    }
    keys.set(keyId, material);
  }
  return keys;
}

/** Stable dedup/suppression hash key: HKDF over the FIRST key id (sorted). */
function addressHashKey(keys: Map<string, Buffer>): Buffer {
  const firstId = [...keys.keys()].sort()[0];
  if (firstId === undefined) throw new ContactKeyError("No contact encryption keys are configured.");
  return Buffer.from(
    hkdfSync("sha256", keys.get(firstId)!, Buffer.alloc(0), HASH_KEY_INFO, KEY_LENGTH),
  );
}

/** Keyed hash of a normalized contact address (hex). Stable across rotation. */
export function contactAddressHash(normalizedAddress: string, keys: Map<string, Buffer>): string {
  return createHmac("sha256", addressHashKey(keys)).update(normalizedAddress, "utf8").digest("hex");
}

export function encryptContactAddress(
  normalizedAddress: string,
  keyId: string,
  key: Buffer,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(AAD, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(normalizedAddress, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["aead", "v1", keyId, iv.toString("base64"), ciphertext.toString("base64"), tag.toString("base64")].join(
    ":",
  );
}

export function decryptContactAddress(
  envelope: string,
  keys: Map<string, Buffer>,
): string {
  const parts = envelope.split(":");
  if (parts.length !== 6 || `${parts[0]}:${parts[1]}` !== "aead:v1") {
    throw new ContactKeyError("Unknown contact envelope format.");
  }
  const keyId = parts[2]!;
  const ivB64 = parts[3]!;
  const ctB64 = parts[4]!;
  const tagB64 = parts[5]!;
  const key = keys.get(keyId);
  if (!key) throw new ContactKeyError(`Contact key "${keyId}" is not configured.`);
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAAD(Buffer.from(AAD, "utf8"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new ContactKeyError("Contact envelope authentication failed.");
  }
}

/** Re-encrypts an envelope under the active key (rotation path). */
export function rotateContactEnvelope(
  envelope: string,
  keys: Map<string, Buffer>,
  activeKeyId: string,
): string {
  const active = keys.get(activeKeyId);
  if (!active) throw new ContactKeyError(`Active contact key "${activeKeyId}" is not configured.`);
  return encryptContactAddress(decryptContactAddress(envelope, keys), activeKeyId, active);
}

/** Constant-time comparison for keyed hashes of equal length. */
export function hashesMatch(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * HMAC-signed unsubscribe token for a contact hash. Stateless and keyed off
 * the same HKDF material as the address hash, so it rotates with the keys
 * without breaking stored data.
 */
export function unsubscribeToken(addressHashHex: string, keys: Map<string, Buffer>): string {
  const mac = createHmac("sha256", addressHashKey(keys)).update(`unsubscribe:${addressHashHex}`).digest("base64url");
  return `${addressHashHex}.${mac}`;
}

export function verifyUnsubscribeToken(token: string, keys: Map<string, Buffer>): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const addressHashHex = token.slice(0, dot);
  const expected = unsubscribeToken(addressHashHex, keys);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return addressHashHex;
}
