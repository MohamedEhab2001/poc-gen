import { describe, expect, it } from "vitest";
import {
  emailDomain,
  normalizeAddressKey,
  normalizeBusinessName,
  normalizeDomain,
  normalizeEmailAddress,
  normalizePhoneKey,
} from "./normalize";

describe("automation normalization keys", () => {
  it("business names: punctuation, case, ampersand, diacritics", () => {
    expect(normalizeBusinessName("Café Luna & Co.")).toBe("cafe luna and co");
    expect(normalizeBusinessName("  THE   BISTRO ")).toBe("the bistro");
    expect(normalizeBusinessName("Mölkky-Bistro")).toBe("molkky bistro");
  });

  it("addresses collapse to a stable alphanumeric key", () => {
    expect(normalizeAddressKey("12 Main St., Portland, OR 97209")).toBe(
      normalizeAddressKey("12 main st portland or 97209"),
    );
    expect(normalizeAddressKey("")).toBeNull();
    expect(normalizeAddressKey(null)).toBeNull();
  });

  it("domains: url or bare, www stripped, invalid rejected", () => {
    expect(normalizeDomain("https://www.Example.com/menu")).toBe("example.com");
    expect(normalizeDomain("shop.example.co.uk")).toBe("shop.example.co.uk");
    expect(normalizeDomain("not a domain")).toBeNull();
    expect(normalizeDomain("")).toBeNull();
  });

  it("phones normalize to digits with optional plus", () => {
    expect(normalizePhoneKey("+1 (503) 555-0114")).toBe("+15035550114");
    expect(normalizePhoneKey("5035550114")).toBe("5035550114");
    expect(normalizePhoneKey("123")).toBeNull();
    expect(normalizePhoneKey(null)).toBeNull();
  });

  it("emails: trim, lowercase, validate", () => {
    expect(normalizeEmailAddress("  Owner@Example.COM ")).toBe("owner@example.com");
    expect(normalizeEmailAddress("no-at-sign")).toBeNull();
    expect(normalizeEmailAddress("a@b")).toBeNull();
  });

  it("email domains extract for per-domain limits", () => {
    expect(emailDomain("owner@example.com")).toBe("example.com");
  });

  it("duplicate-key strategies are independent", () => {
    // Two businesses with the same phone but different domains and names:
    // each key strategy answers independently.
    const a = { domain: normalizeDomain("https://a.example.com"), phone: normalizePhoneKey("+15550001") };
    const b = { domain: normalizeDomain("https://b.example.com"), phone: normalizePhoneKey("+15550001") };
    expect(a.domain).not.toBe(b.domain);
    expect(a.phone).toBe(b.phone);
  });
});
