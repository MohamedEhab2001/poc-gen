import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import {
  ContactKeyError,
  contactAddressHash,
  decryptContactAddress,
  encryptContactAddress,
  hashesMatch,
  parseContactKeys,
  rotateContactEnvelope,
  unsubscribeToken,
  verifyUnsubscribeToken,
} from "./crypto";

function keySpec(ids: string[]): string {
  return ids.map((id) => `${id}:${randomBytes(32).toString("base64")}`).join(",");
}

describe("contact encryption", () => {
  it("parses well-formed key specs and rejects weak/malformed keys", () => {
    expect(parseContactKeys(keySpec(["k1", "k2"])).size).toBe(2);
    expect(parseContactKeys("").size).toBe(0);
    expect(parseContactKeys(undefined).size).toBe(0);
    expect(() => parseContactKeys("short:AAAA")).toThrow(ContactKeyError); // < 32 bytes
    expect(() => parseContactKeys("no-separator")).toThrow(ContactKeyError);
    expect(() => parseContactKeys("bad id with spaces:AAAA")).toThrow(ContactKeyError);
    expect(() => parseContactKeys(`${keySpec(["dup"])},${keySpec(["dup"])}`)).toThrow(/Duplicate/);
  });

  it("round-trips an address through AES-256-GCM", () => {
    const keys = parseContactKeys(keySpec(["k1"]));
    const envelope = encryptContactAddress("owner@example.com", "k1", keys.get("k1")!);
    expect(envelope.startsWith("aead:v1:k1:")).toBe(true);
    expect(envelope).not.toContain("owner@example.com");
    expect(decryptContactAddress(envelope, keys)).toBe("owner@example.com");
  });

  it("rotation: re-encrypt under the new key, old key still decrypts the original", () => {
    const keys = parseContactKeys(keySpec(["k1", "k2"]));
    const original = encryptContactAddress("a@b.co", "k1", keys.get("k1")!);
    const rotated = rotateContactEnvelope(original, keys, "k2");
    expect(rotated.startsWith("aead:v1:k2:")).toBe(true);
    expect(decryptContactAddress(rotated, keys)).toBe("a@b.co");
  });

  it("fails closed on wrong key, tampered envelope, and unknown format", () => {
    const keys = parseContactKeys(keySpec(["k1"]));
    const envelope = encryptContactAddress("a@b.co", "k1", keys.get("k1")!);
    const other = parseContactKeys(keySpec(["other"]));
    expect(() => decryptContactAddress(envelope, other)).toThrow(ContactKeyError);
    // Flip ciphertext characters: authentication must fail closed.
    const parts = envelope.split(":");
    expect(parts).toHaveLength(6);
    const ct = parts[4]!;
    const flipped = ct.slice(0, -2) + (ct.endsWith("AA") ? "BB" : "AA");
    const tampered = [...parts.slice(0, 4), flipped, parts[5]!].join(":");
    expect(() => decryptContactAddress(tampered, keys)).toThrow(ContactKeyError);
    expect(() => decryptContactAddress("plaintext", keys)).toThrow(ContactKeyError);
  });

  it("address hashes are stable across active-key rotation and key additions", () => {
    const k1 = randomBytes(32).toString("base64");
    const k2 = randomBytes(32).toString("base64");
    const before = parseContactKeys(`k1:${k1}`);
    const after = parseContactKeys(`k1:${k1},k2:${k2}`);
    const hash = contactAddressHash("owner@example.com", before);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // The hash key derives from the lexicographically-first key id, so
    // adding keys (rotation) never invalidates stored hashes.
    expect(contactAddressHash("owner@example.com", after)).toBe(hash);
    expect(contactAddressHash("owner2@example.com", before)).not.toBe(hash);
  });

  it("constant-time hash comparison behaves", () => {
    expect(hashesMatch("abc", "abc")).toBe(true);
    expect(hashesMatch("abc", "abd")).toBe(false);
    expect(hashesMatch("abc", "abcd")).toBe(false);
  });

  it("unsubscribe tokens verify and reject forgeries", () => {
    const keys = parseContactKeys(keySpec(["k1"]));
    const hash = contactAddressHash("owner@example.com", keys);
    const token = unsubscribeToken(hash, keys);
    expect(verifyUnsubscribeToken(token, keys)).toBe(hash);
    expect(verifyUnsubscribeToken(`${hash}.${"A".repeat(43)}`, keys)).toBeNull();
    expect(verifyUnsubscribeToken("garbage", keys)).toBeNull();
    const otherKeys = parseContactKeys(keySpec(["k2"]));
    expect(verifyUnsubscribeToken(token, otherKeys)).toBeNull();
  });
});
