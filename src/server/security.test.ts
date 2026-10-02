import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getRecordDisposition } from "@/lib/poc/disposition";
import { policyAllows, renderPolicy } from "@/lib/poc/policy";
import { buildPreviewQuery, parsePreviewQuery } from "@/lib/poc/preview-query";
import { isAllowedImageUrl, isTrustedMapEmbed } from "@/lib/poc/url";
import { InMemoryShareLinkStore, getShareLinkStore, setShareLinkStore } from "@/server/share/store";
import {
  consumeShareLink,
  createShareLink,
  peekShareLink,
  revokeShareLink,
} from "@/server/share/service";
import { hashShareToken, tokenHashMatches } from "@/server/share/tokens";
import { merchantAndVine } from "@/data/businesses/merchant-and-vine";
import { junosDiner } from "@/data/businesses/junos-diner";
import { sunsetRamenExpired } from "@/data/businesses/sunset-ramen-expired";
import type { BusinessPocRecord } from "@/lib/poc/schema";

describe("request-time expiration (disposition)", () => {
  const now = new Date("2026-10-02T12:00:00Z");

  it("blocks records whose expiresAt is in the past even when status is active", () => {
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      expiresAt: "2026-10-01T00:00:00Z",
    };
    expect(getRecordDisposition(record, now)).toBe("expired");
  });

  it("renders records whose expiresAt is in the future", () => {
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      expiresAt: "2026-12-01T00:00:00Z",
    };
    expect(getRecordDisposition(record, now)).toBe("render");
  });

  it("treats expiresAt exactly equal to now as expired (boundary is inclusive)", () => {
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      expiresAt: "2026-10-02T12:00:00Z",
    };
    expect(getRecordDisposition(record, now)).toBe("expired");
  });

  it("still honors explicit expired status regardless of timestamps", () => {
    expect(getRecordDisposition(sunsetRamenExpired, now)).toBe("expired");
  });
});

describe("central render policy", () => {
  it("blocks low-confidence ai_derived values", () => {
    expect(renderPolicy("narrative", { source: "ai_derived", confidence: 0.4 })).toBe("blocked");
    expect(renderPolicy("factual", { source: "ai_derived", confidence: 0.4 })).toBe("blocked");
  });

  it("treats missing confidence on ai_derived as untrusted", () => {
    expect(renderPolicy("narrative", { source: "ai_derived" })).toBe("blocked");
  });

  it("allows ai_derived values at or above the threshold as derived", () => {
    expect(renderPolicy("narrative", { source: "ai_derived", confidence: 0.7 })).toBe("derived");
    expect(renderPolicy("narrative", { source: "ai_derived", confidence: 0.9 })).toBe("derived");
  });

  it("blocks unverified provider narrative but allows business-origin narrative", () => {
    expect(renderPolicy("narrative", { source: "google_places" })).toBe("blocked");
    expect(renderPolicy("narrative", { source: "business_owner" })).toBe("unverified");
    expect(renderPolicy("narrative", { source: "official_website" })).toBe("unverified");
    expect(renderPolicy("narrative", { source: "manual" })).toBe("unverified");
  });

  it("allows unverified provider data for factual fields, flagged as unverified", () => {
    expect(renderPolicy("factual", { source: "google_places" })).toBe("unverified");
  });

  it("verified values render as verified regardless of source", () => {
    expect(renderPolicy("narrative", { source: "google_places", verified: true })).toBe("verified");
  });

  it("policyAllows only rejects blocked", () => {
    expect(policyAllows("blocked")).toBe(false);
    expect(policyAllows("fallback")).toBe(true);
  });
});

describe("normalize applies the policy (integration)", () => {
  it("replaces a low-confidence ai_derived headline with the fallback", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      hero: {
        ...merchantAndVine.hero,
        headline: {
          value: "Award-winning since forever",
          source: "ai_derived",
          confidence: 0.3,
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.hero.headline).not.toContain("Award-winning");
    expect(vm.provenance).toContainEqual(
      expect.objectContaining({ field: "hero.headline", outcome: "hidden" }),
    );
  });

  it("hides an unverified provider announcement", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      content: {
        announcement: { value: "Best bistro in Portland!", source: "google_places" },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.announcement).toBeNull();
  });

  it("keeps verified owner announcements", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const vm = normalizeRecord(junosDiner);
    expect(vm.announcement).toContain("Biscuit week");
  });

  it("blocks a low-confidence ai_derived phone and removes Call CTAs", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      contact: {
        ...merchantAndVine.contact,
        phone: { value: "+1 555 0100", source: "ai_derived", confidence: 0.3 },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.contact.phone).toBeNull();
    expect(vm.cta.mobile.some((cta) => cta.kind === "call")).toBe(false);
    expect(vm.provenance).toContainEqual(
      expect.objectContaining({ field: "contact.phone", outcome: "hidden" }),
    );
  });

  it("blocks a low-confidence ai_derived rating and hides reputation", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      reputation: {
        ...merchantAndVine.reputation,
        rating: { value: 4.9, source: "ai_derived", confidence: 0.2 },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.reputation).toBeNull();
  });

  it("blocks a low-confidence ai_derived city and keeps it out of the fallback headline", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      location: {
        ...merchantAndVine.location!,
        city: { value: "Neptune City", source: "ai_derived", confidence: 0.1 },
      },
      hero: { ...merchantAndVine.hero, headline: undefined },
    };
    const vm = normalizeRecord(record);
    expect(vm.location?.city).toBeNull();
    expect(vm.hero.headline).not.toContain("Neptune City");
  });

  it("blocks a low-confidence ai_derived palette color and keeps the theme default", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      brand: {
        ...merchantAndVine.brand,
        palette: {
          primary: { value: "#123456", source: "ai_derived", confidence: 0.25 },
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.palette.primary).toBe("#71272b");
    expect(vm.provenance).toContainEqual(
      expect.objectContaining({ field: "brand.palette.primary", outcome: "hidden" }),
    );
  });

  it("blocks a low-confidence ai_derived hero image and uses the theme placeholder", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      hero: {
        ...merchantAndVine.hero,
        image: {
          value: {
            id: "ai-hero",
            url: "https://picsum.photos/seed/ai/1600/1000",
            alt: "Generated hero",
            source: "ai_derived",
            confidence: 0.3,
          },
          source: "ai_derived",
          confidence: 0.3,
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.hero.image?.outcome).toBe("fallback");
    expect(vm.hero.image?.url).toBe("/poc-placeholders/heritage-bistro-hero.svg");
  });

  it("renders a confidently derived image as derived", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      hero: {
        ...merchantAndVine.hero,
        image: {
          value: {
            id: "ai-hero-ok",
            url: "https://picsum.photos/seed/ai-ok/1600/1000",
            alt: "Derived hero",
            source: "ai_derived",
            confidence: 0.85,
          },
          source: "ai_derived",
          confidence: 0.85,
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.hero.image?.outcome).toBe("derived");
  });

  it("downgrades a verified menu from an untrusted source to sample", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      offering: {
        ...merchantAndVine.offering!,
        menu: {
          ...merchantAndVine.offering!.menu!,
          mode: "verified",
          source: "google_places",
          verified: false,
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.menu?.mode).toBe("sample");
    expect(vm.menu?.notice).toBeTruthy();
    expect(vm.warnings.some((w) => w.includes("downgraded to sample"))).toBe(true);
  });

  it("blocks a low-confidence ai_derived address", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      location: {
        ...merchantAndVine.location!,
        formattedAddress: { value: "1 Made Up Street", source: "ai_derived", confidence: 0.2 },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.location?.formattedAddress).toBeNull();
  });

  it("renders a confidently derived name as derived", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      identity: {
        ...merchantAndVine.identity,
        name: { value: "Merchant & Vine Derived", source: "ai_derived", confidence: 0.8 },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.identity.name).toBe("Merchant & Vine Derived");
    expect(vm.provenance).toContainEqual(
      expect.objectContaining({ field: "identity.name", outcome: "derived" }),
    );
  });
});

describe("map embed and image hardening", () => {
  it("accepts only trusted Google Maps embed origins", () => {
    expect(isTrustedMapEmbed("https://www.google.com/maps/embed?pb=x")).toBe(true);
    expect(isTrustedMapEmbed("https://maps.google.com/maps/embed/v1/place")).toBe(true);
    expect(isTrustedMapEmbed("https://evil.example.com/maps/embed")).toBe(false);
    expect(isTrustedMapEmbed("https://www.google.com/search")).toBe(false);
    expect(isTrustedMapEmbed("javascript:alert(1)")).toBe(false);
  });

  it("allows local image paths and allowlisted hosts only", () => {
    expect(isAllowedImageUrl("/poc-placeholders/x.svg")).toBe(true);
    expect(isAllowedImageUrl("https://picsum.photos/seed/x/10/10")).toBe(true);
    expect(isAllowedImageUrl("https://evil.example.com/img.jpg")).toBe(false);
    expect(isAllowedImageUrl("//picsum.photos/x")).toBe(false);
    expect(isAllowedImageUrl("http://picsum.photos/x")).toBe(false);
  });

  it("treats zero coordinates as present", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      location: {
        ...merchantAndVine.location!,
        latitude: { value: 0, source: "google_places", verified: true },
        longitude: { value: 0, source: "google_places", verified: true },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.location?.hasPlace).toBe(true);
    expect(vm.location?.latitude).toBe(0);
  });

  it("drops an untrusted embed URL in favor of the location card", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      location: {
        ...merchantAndVine.location!,
        embedUrl: { value: "https://evil.example.com/embed", source: "manual" },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.location?.embedUrl).toBeNull();
    expect(vm.warnings.some((w) => w.includes("trusted map-embed"))).toBe(true);
  });

  it("replaces a non-allowlisted hero image with the theme placeholder", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      hero: {
        ...merchantAndVine.hero,
        image: {
          value: {
            id: "bad",
            url: "https://evil.example.com/hero.jpg",
            alt: "Bad host",
            source: "manual",
          },
          source: "manual",
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.hero.image?.outcome).toBe("fallback");
    expect(vm.hero.image?.url).toBe("/poc-placeholders/heritage-bistro-hero.svg");
  });
});

describe("share links", () => {
  beforeEach(() => {
    setShareLinkStore(new InMemoryShareLinkStore());
  });
  afterEach(() => {
    setShareLinkStore(new InMemoryShareLinkStore());
  });

  it("generates 256-bit tokens and stores only hashes", async () => {
    const created = await createShareLink({
      slug: "merchant-vine",
      createdBy: "op@example.com",
      record: merchantAndVine,
    });
    expect(created).not.toBeNull();
    expect(created!.token.length).toBeGreaterThanOrEqual(40);
    expect(hashShareToken(created!.token)).toMatch(/^[0-9a-f]{64}$/);
    // At rest: the stored record contains the hash, never the token.
    const stored = await getShareLinkStore().findById(created!.id);
    expect(stored?.tokenHash).toBe(hashShareToken(created!.token));
    expect(JSON.stringify(stored)).not.toContain(created!.token.slice(0, 12));
  });

  it("peeks valid tokens without mutating, then atomically consumes", async () => {
    const created = await createShareLink({
      slug: "merchant-vine",
      createdBy: "op@example.com",
      record: merchantAndVine,
    });
    const peeked = await peekShareLink(created!.token);
    expect(peeked?.slug).toBe("merchant-vine");
    // Peek does not consume.
    expect((await getShareLinkStore().findById(created!.id))?.viewCount).toBe(0);

    const consumed = await consumeShareLink(created!.token);
    expect(consumed?.slug).toBe("merchant-vine");
    const stored = await getShareLinkStore().findById(created!.id);
    expect(stored?.viewCount).toBe(1);
    expect(stored?.lastUsedAt).not.toBeNull();
  });

  it("returns null for unknown tokens without throwing", async () => {
    expect(await peekShareLink("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBeNull();
    expect(await consumeShareLink("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toBeNull();
  });

  it("enforces expiry at request time, including the exact boundary", async () => {
    const created = await createShareLink({
      slug: "merchant-vine",
      createdBy: "op@example.com",
      record: merchantAndVine,
      expiresInDays: 1,
    });
    const createdAt = new Date((await getShareLinkStore().findById(created!.id))!.createdAt);
    const boundary = new Date(createdAt.getTime() + 86_400_000); // exactly expiresAt
    expect(await peekShareLink(created!.token, createdAt)).not.toBeNull();
    expect(await peekShareLink(created!.token, boundary)).toBeNull();
    expect(await consumeShareLink(created!.token, boundary)).toBeNull();
  });

  it("enforces revocation", async () => {
    const created = await createShareLink({
      slug: "merchant-vine",
      createdBy: "op@example.com",
      record: merchantAndVine,
    });
    expect(await revokeShareLink(created!.id)).toBe(true);
    expect(await peekShareLink(created!.token)).toBeNull();
    expect(await consumeShareLink(created!.token)).toBeNull();
    expect(await revokeShareLink(created!.id)).toBe(false);
  });

  it("enforces the maximum view cap atomically", async () => {
    const created = await createShareLink({
      slug: "merchant-vine",
      createdBy: "op@example.com",
      record: merchantAndVine,
      maxViews: 1,
    });
    const first = await consumeShareLink(created!.token);
    expect(first).not.toBeNull();
    expect(await consumeShareLink(created!.token)).toBeNull();
  });

  it("refuses to share records that must not render", async () => {
    const created = await createShareLink({
      slug: "sunset-ramen",
      createdBy: "op@example.com",
      record: sunsetRamenExpired,
    });
    expect(created).toBeNull();
  });

  it("compares token hashes in constant time without false positives", () => {
    const hashA = hashShareToken("token-a");
    const hashB = hashShareToken("token-b");
    expect(tokenHashMatches(hashA, hashA)).toBe(true);
    expect(tokenHashMatches(hashA, hashB)).toBe(false);
  });
});

describe("preview query-state preservation", () => {
  it("keeps a theme override through viewport and overlay changes", () => {
    // Step 1: user picks a theme override.
    const afterTheme = buildPreviewQuery(parsePreviewQuery(new URLSearchParams()), {
      theme: "neon-night",
    });
    expect(afterTheme).toBe("theme=neon-night");

    // Step 2: viewport changes must not drop the theme.
    const afterViewport = buildPreviewQuery(parsePreviewQuery(new URLSearchParams(afterTheme)), {
      viewport: "mobile",
    });
    expect(afterViewport).toContain("theme=neon-night");
    expect(afterViewport).toContain("viewport=mobile");

    // Step 3: toggling the overlay keeps both.
    const afterOverlay = buildPreviewQuery(parsePreviewQuery(new URLSearchParams(afterViewport)), {
      overlay: true,
    });
    expect(afterOverlay).toContain("theme=neon-night");
    expect(afterOverlay).toContain("viewport=mobile");
    expect(afterOverlay).toContain("overlay=source");
  });

  it("drops default values when returning to them", () => {
    const query = buildPreviewQuery(
      { theme: "neon-night", viewport: "mobile", overlay: true },
      { viewport: "desktop", overlay: false },
    );
    expect(query).toBe("theme=neon-night");
  });
});
