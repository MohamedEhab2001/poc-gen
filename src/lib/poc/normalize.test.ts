import { describe, expect, it } from "vitest";
import { getRecordDisposition } from "./disposition";
import { normalizeRecord } from "./normalize";
import type { BusinessPocRecord } from "./types";
import { merchantAndVine } from "@/data/businesses/merchant-and-vine";
import { cornerPhoMinimal } from "@/data/businesses/corner-pho-minimal";
import { lobaTaqueria } from "@/data/businesses/loba-taqueria";
import { fjordCoffeePartial } from "@/data/businesses/fjord-coffee-partial";
import { sunsetRamenExpired } from "@/data/businesses/sunset-ramen-expired";
import { oldMillCantinaPermanent } from "@/data/businesses/old-mill-cantina-permanent";

describe("normalize: fallback rules", () => {
  it("creates a typographic wordmark when the logo is missing (rule 1)", () => {
    const vm = normalizeRecord(merchantAndVine);
    expect(vm.wordmark.image).toBeNull();
    expect(vm.wordmark.outcome).toBe("fallback");
    expect(vm.wordmark.text).toBe(merchantAndVine.brand?.wordmark?.value);
  });

  it("uses a logo image when present", () => {
    const withLogo: BusinessPocRecord = {
      ...merchantAndVine,
      brand: {
        ...merchantAndVine.brand,
        logo: {
          value: {
            id: "logo-1",
            url: "https://picsum.photos/seed/mv-logo/400/400",
            alt: "Merchant & Vine logo",
            source: "business_owner",
          },
          source: "business_owner",
          verified: true,
        },
      },
    };
    const vm = normalizeRecord(withLogo);
    expect(vm.wordmark.image?.url).toContain("mv-logo");
    expect(vm.wordmark.outcome).toBe("verified");
  });

  it("falls back to theme placeholder artwork for a missing hero image (rule 3)", () => {
    const vm = normalizeRecord(cornerPhoMinimal);
    expect(vm.hero.image?.outcome).toBe("fallback");
    expect(vm.hero.image?.url).toBe("/poc-placeholders/minimal-japanese-hero.svg");
  });

  it("hides the gallery when there are no gallery images and never repeats (rule 4)", () => {
    expect(normalizeRecord(cornerPhoMinimal).gallery).toBeNull();
    const vm = normalizeRecord(fjordCoffeePartial);
    expect(vm.gallery?.images).toHaveLength(2);
  });

  it("hides a missing menu but keeps an explicitly sample menu with notice (rule 5)", () => {
    expect(normalizeRecord(fjordCoffeePartial).menu).toBeNull();
    const vm = normalizeRecord(lobaTaqueria);
    expect(vm.menu?.mode).toBe("sample");
    expect(vm.menu?.notice).toBeTruthy();
    expect(vm.provenance.some((entry) => entry.field === "offering.menu" && entry.outcome === "sample")).toBe(true);
  });

  it("hides reviews when rating data is absent (rule 6)", () => {
    expect(normalizeRecord(cornerPhoMinimal).reputation).toBeNull();
  });

  it("removes call CTAs when no dialable phone exists (rule 7)", () => {
    const noPhone: BusinessPocRecord = {
      ...cornerPhoMinimal,
      contact: {},
      callsToAction: { call: { label: "Call", href: "tel:123", kind: "call", source: "manual", verified: true } },
    };
    const vm = normalizeRecord(noPhone);
    expect(vm.contact.phone).toBeNull();
    expect(vm.cta.primary?.kind).toBe("directions");
    expect(vm.cta.mobile.some((cta) => cta.kind === "call")).toBe(false);
  });

  it("renders an address-only location when no coordinates or urls exist (rule 8)", () => {
    const vm = normalizeRecord(cornerPhoMinimal);
    expect(vm.location?.hasPlace).toBe(true);
    expect(vm.location?.embedUrl).toBeNull();
  });

  it("flags missing hours instead of inventing them (rule 9)", () => {
    const vm = normalizeRecord(fjordCoffeePartial);
    expect(vm.hours?.missing ?? vm.hours === null).toBeTruthy();
  });

  it("derives a directions CTA from coordinates when none is declared (rule 10)", () => {
    const vm = normalizeRecord(cornerPhoMinimal);
    const directions = [...vm.cta.secondary, vm.cta.primary].find((cta) => cta?.kind === "directions");
    expect(directions?.href).toContain("google.com/maps");
  });

  it("uses a compact services strip when fewer than three entries exist (rule 11)", () => {
    expect(normalizeRecord(fjordCoffeePartial).compactServiceStrip).toBe(true);
    expect(normalizeRecord(merchantAndVine).compactServiceStrip).toBe(false);
  });

  it("falls back to the documented default theme and warns on an unknown theme id", () => {
    const vm = normalizeRecord({ ...merchantAndVine, themeId: "vaporwave-diner" });
    expect(vm.themeId).toBe("heritage-bistro");
    expect(vm.themeWasOverridden).toBe(true);
    expect(vm.warnings.some((warning) => warning.includes("vaporwave-diner"))).toBe(true);
  });

  it("drops unsafe CTA urls with a warning", () => {
    const poisoned: BusinessPocRecord = {
      ...merchantAndVine,
      callsToAction: {
        order: { label: "Order", href: "javascript:alert(1)", kind: "order", external: true, source: "manual", verified: true },
        reserve: merchantAndVine.callsToAction?.reserve ?? null,
      },
    };
    const vm = normalizeRecord(poisoned);
    expect(vm.cta.primary?.kind).not.toBe("order");
    expect(vm.warnings.some((warning) => warning.includes("Invalid or unsafe"))).toBe(true);
  });

  it("rejects invalid brand palette colors and keeps the theme palette (rule 2)", () => {
    const offBrand: BusinessPocRecord = {
      ...merchantAndVine,
      brand: {
        ...merchantAndVine.brand,
        palette: { primary: { value: "not-a-color", source: "business_owner" } },
      },
    };
    const vm = normalizeRecord(offBrand);
    expect(vm.palette.primary).toBe("#71272b");
    expect(vm.warnings.some((warning) => warning.includes("not a valid hex color"))).toBe(true);
  });
});

describe("normalize: hero fallback copy", () => {
  it("uses the business name-adjacent fallback headline when none is provided", () => {
    const quiet: BusinessPocRecord = {
      ...cornerPhoMinimal,
      hero: { primaryAction: null, secondaryAction: null },
    };
    const vm = normalizeRecord(quiet);
    expect(vm.hero.headline).toBe(quiet.identity.name.value);
    expect(vm.hero.subheadline).toBe(`${quiet.identity.primaryCategory.value} in ${quiet.location?.city?.value}.`);
    expect(vm.provenance.some((entry) => entry.field === "hero.headline" && entry.outcome === "fallback")).toBe(true);
  });
});

describe("record disposition", () => {
  it("expired records never render as active public POCs", () => {
    expect(getRecordDisposition(sunsetRamenExpired)).toBe("expired");
  });

  it("permanently closed businesses receive the safe state", () => {
    expect(getRecordDisposition(oldMillCantinaPermanent)).toBe("permanently_closed");
  });

  it("drafts and archived records behave as not found on public routes", () => {
    expect(getRecordDisposition({ ...merchantAndVine, status: "draft" })).toBe("not_found");
    expect(getRecordDisposition({ ...merchantAndVine, status: "archived" })).toBe("not_found");
  });

  it("active operational records render", () => {
    expect(getRecordDisposition(merchantAndVine)).toBe("render");
  });
});
