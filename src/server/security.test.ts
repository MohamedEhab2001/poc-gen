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

  it("renders the closed state for trusted permanently-closed statuses", () => {
    const verifiedClosed: BusinessPocRecord = {
      ...merchantAndVine,
      identity: {
        ...merchantAndVine.identity,
        businessStatus: { value: "permanently_closed", source: "google_places", verified: true },
      },
    };
    expect(getRecordDisposition(verifiedClosed, now)).toBe("permanently_closed");

    const providerClosed: BusinessPocRecord = {
      ...merchantAndVine,
      identity: {
        ...merchantAndVine.identity,
        businessStatus: { value: "permanently_closed", source: "google_places" },
      },
    };
    expect(getRecordDisposition(providerClosed, now)).toBe("permanently_closed");
  });

  it("treats low-confidence AI-derived business status as unknown, never as trusted state", () => {
    const aiClosed: BusinessPocRecord = {
      ...merchantAndVine,
      identity: {
        ...merchantAndVine.identity,
        businessStatus: { value: "permanently_closed", source: "ai_derived", confidence: 0.3 },
      },
    };
    // Blocked status is unknown: the record renders, but the AI value can
    // never trigger the closed state (nor claim the business is open).
    expect(getRecordDisposition(aiClosed, now)).toBe("render");
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

  it("blocks AI business imagery regardless of confidence (high-confidence hero included)", async () => {
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
            confidence: 0.95,
          },
          source: "ai_derived",
          confidence: 0.95,
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.hero.image?.outcome).toBe("fallback");
    expect(vm.hero.image?.url).toBe("/poc-placeholders/heritage-bistro-hero.svg");
    expect(vm.provenance).toContainEqual(
      expect.objectContaining({
        field: "hero.image",
        outcome: "hidden",
        note: expect.stringContaining("AI-generated imagery"),
      }),
    );
  });

  it("blocks an AI-derived logo even at high confidence; the wordmark fallback applies", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      brand: {
        ...merchantAndVine.brand,
        logo: {
          value: {
            id: "ai-logo",
            url: "https://picsum.photos/seed/ai-logo/400/400",
            alt: "Generated logo",
            source: "ai_derived",
            confidence: 0.99,
          },
          source: "ai_derived",
          confidence: 0.99,
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.wordmark.image).toBeNull();
    expect(vm.wordmark.outcome).toBe("fallback");
  });

  it("rejects wrapped images whose wrapper and inner sources disagree (schema)", async () => {
    const { recordSchema } = await import("@/lib/poc/schema");
    const result = recordSchema.safeParse({
      ...merchantAndVine,
      hero: {
        ...merchantAndVine.hero,
        image: {
          value: {
            id: "mixed",
            url: "https://picsum.photos/seed/mixed/1600/1000",
            alt: "Mixed provenance",
            source: "manual",
          },
          source: "ai_derived",
          confidence: 0.2,
        },
      },
    });
    expect(result.success).toBe(false);
  });

  it("blocks AI-derived reviews regardless of confidence and provider reviews without trust", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      reputation: {
        ...merchantAndVine.reputation!,
        reviews: [
          {
            id: "ai-review",
            authorName: "Fabricated Person",
            rating: 5,
            text: "Absolutely the best experience imaginable.",
            source: "ai_derived",
            confidence: 0.99,
          },
          {
            id: "ok-review",
            authorName: "Real Guest",
            rating: 4,
            text: "Lovely room, serious cellar.",
            source: "google_places",
          },
        ],
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.reputation?.reviews).toHaveLength(1);
    expect(vm.reputation?.reviews[0]?.authorName).toBe("Real Guest");
    expect(vm.provenance).toContainEqual(
      expect.objectContaining({ field: "reputation.reviews", outcome: "hidden" }),
    );
  });

  it("rejects records whose reviews lack provenance (schema)", async () => {
    const { recordSchema } = await import("@/lib/poc/schema");
    const result = recordSchema.safeParse({
      ...merchantAndVine,
      reputation: {
        ...merchantAndVine.reputation!,
        reviews: [
          {
            id: "no-source",
            authorName: "Someone",
            rating: 5,
            text: "Great.",
          },
        ],
      },
    });
    expect(result.success).toBe(false);
  });

  it("blocks untrusted hours periods from generating displayed opening hours", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      hours: {
        periods: {
          value: [
            { day: "Monday", open: "09:00", close: "17:00" },
          ],
          source: "ai_derived",
          confidence: 0.2,
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.hours?.descriptions ?? []).toHaveLength(0);
    expect(vm.provenance).toContainEqual(
      expect.objectContaining({ field: "hours.periods", outcome: "hidden" }),
    );
  });

  it("blocks low-confidence AI-derived social links and keeps verified provider ones", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      contact: {
        ...merchantAndVine.contact,
        socialLinks: {
          value: [{ platform: "instagram", url: "https://www.instagram.com/fake.example" }],
          source: "ai_derived",
          confidence: 0.4,
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.contact.socials).toHaveLength(0);
    expect(vm.provenance).toContainEqual(
      expect.objectContaining({ field: "contact.socialLinks", outcome: "hidden" }),
    );
  });

  it("never renders AI-derived dietary claims (vegetarian, vegan, halal, gluten-free)", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    for (const claim of ["Vegetarian options", "Vegan options", "Halal options", "Gluten-free options"]) {
      const record: BusinessPocRecord = {
        ...merchantAndVine,
        offering: {
          ...merchantAndVine.offering!,
          dietaryOptions: {
            value: [claim],
            source: "ai_derived",
            confidence: 0.95,
          },
        },
      };
      const vm = normalizeRecord(record);
      expect(vm.offering.dietaryOptions, claim).toHaveLength(0);
    }
  });

  it("blocks low-confidence AI-derived meal types", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      offering: {
        ...merchantAndVine.offering!,
        mealTypes: { value: ["Dinner", "Drinks"], source: "ai_derived", confidence: 0.2 },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.offering.mealTypes).toHaveLength(0);
  });

  it("rejects menus without an explicit source (schema) and keeps AI menus as sample", async () => {
    const { recordSchema } = await import("@/lib/poc/schema");
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const menu = merchantAndVine.offering!.menu!;
    const noSource = recordSchema.safeParse({
      ...merchantAndVine,
      offering: { ...merchantAndVine.offering!, menu: { mode: "verified", sections: menu.sections } },
    });
    expect(noSource.success).toBe(false);

    const aiMenu = normalizeRecord({
      ...merchantAndVine,
      offering: {
        ...merchantAndVine.offering!,
        menu: { mode: "verified", source: "ai_derived", confidence: 0.95, sections: menu.sections },
      },
    } as BusinessPocRecord);
    expect(aiMenu.menu?.mode).toBe("sample");
    expect(aiMenu.menu?.notice).toBeTruthy();
  });

  it("blocks AI-derived explicit CTAs and hero actions", async () => {
    const { normalizeRecord } = await import("@/lib/poc/normalize");
    const record: BusinessPocRecord = {
      ...merchantAndVine,
      callsToAction: {
        order: {
          label: "Order now",
          href: "https://order.example.com",
          kind: "order",
          external: true,
          source: "ai_derived",
          confidence: 0.95,
        },
        reserve: {
          label: "Reserve",
          href: "https://merchantandvine.example.com/reserve",
          kind: "reserve",
          external: true,
          source: "manual",
          verified: true,
        },
      },
    };
    const vm = normalizeRecord(record);
    expect(vm.cta.primary?.kind).toBe("reserve");
    expect(vm.cta.secondary.some((cta) => cta.kind === "order")).toBe(false);
    expect(vm.provenance).toContainEqual(
      expect.objectContaining({ field: "callsToAction.order", outcome: "hidden" }),
    );
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
    expect(isTrustedMapEmbed("https://maps.google.com/maps?q=29,-98&output=embed")).toBe(true);
    expect(isTrustedMapEmbed("https://maps.google.com/maps?q=29,-98")).toBe(false);
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
