import { describe, expect, it } from "vitest";
import { recordSchema } from "@/lib/poc/schema";
import type { BusinessPocRecord } from "@/lib/poc/schema";
import { runDeterministicQa } from "./qa";
import { DISCLAIMER } from "@/data/businesses/helpers";
import { merchantAndVine } from "@/data/businesses/merchant-and-vine";
import { docksideProvisionsClosed } from "@/data/businesses/dockside-provisions-closed";
import { oldMillCantinaPermanent } from "@/data/businesses/old-mill-cantina-permanent";
import { sunsetRamenExpired } from "@/data/businesses/sunset-ramen-expired";
import { fjordCoffeePartial } from "@/data/businesses/fjord-coffee-partial";

function minimalRecord(overrides: {
  record?: Partial<BusinessPocRecord>;
  headline?: { value: string; source: string; confidence?: number };
  image?: { url: string; source: string; attribution?: { label: string } | null; license?: string | null };
}): BusinessPocRecord {
  const base = {
    schemaVersion: 1 as const,
    id: "rec-qa-test",
    slug: "qa-test-record",
    status: "active" as const,
    themeId: "heritage-bistro",
    identity: {
      name: { value: "QA Test Bistro", source: "google_places", verified: true },
      primaryCategory: { value: "Bistro", source: "google_places", verified: true },
      categories: { value: ["Bistro"], source: "google_places", verified: true },
      businessStatus: { value: "operational", source: "google_places", verified: true },
    },
    hero: {
      ...(overrides.headline
        ? { headline: overrides.headline }
        : { headline: { value: "Neighborhood cooking", source: "business_owner", verified: true } }),
      subheadline: { value: "A warm neighborhood table with seasonal cooking.", source: "business_owner", verified: true },
      ...(overrides.image
        ? {
            image: {
              value: {
                id: "qa-img",
                url: overrides.image.url,
                alt: "Dining room",
                role: "hero" as const,
                source: overrides.image.source,
                ...(overrides.image.attribution ? { attribution: overrides.image.attribution } : {}),
                ...(overrides.image.license ? { license: overrides.image.license } : {}),
              },
              source: overrides.image.source,
            },
          }
        : {}),
    },
    contact: { phone: { value: "+1 555 010 0123", source: "business_owner", verified: true } },
    location: {
      formattedAddress: { value: "12 Test Street, Portland, OR", source: "business_owner", verified: true },
      city: { value: "Portland", source: "business_owner", verified: true },
    },
    content: {
      aboutTitle: { value: "Our table", source: "business_owner", verified: true },
      aboutBody: { value: "A neighborhood restaurant built around seasonal cooking.", source: "business_owner", verified: true },
    },
    media: { images: [] },
    poc: { disclaimer: DISCLAIMER, createdAt: "2026-01-01T00:00:00Z" },
    ...overrides.record,
  };
  const parsed = recordSchema.parse(base);
  return parsed;
}

const FUTURE = new Date("2026-06-01T00:00:00Z");

describe("deterministic QA gates", () => {
  it("passes a clean minimal record and lists every check", () => {
    const report = runDeterministicQa(minimalRecord({}), FUTURE);
    expect(report.passed).toBe(true);
    const codes = report.checks.map((check) => check.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "SCHEMA_VALID",
        "RECORD_DISPOSITION",
        "RENDER_MODEL_OK",
        "IMAGE_ORIGINS",
        "HERO_VISUAL_STRATEGY",
        "VISUAL_CONTENT_DEPTH",
        "MAP_ORIGIN",
        "PLACEHOLDER_TOKENS",
        "CTA_PROTOCOLS",
        "ATTRIBUTION_METADATA",
        "BUSINESS_OPEN",
        "NOT_EXPIRED",
        "RENDER_POLICY",
      ]),
    );
  });

  it("reports honest concept art and blocks visually empty publish records", () => {
    const concept = runDeterministicQa(minimalRecord({}), FUTURE);
    const hero = concept.checks.find((check) => check.code === "HERO_VISUAL_STRATEGY");
    expect(hero?.status).toBe("warn");
    expect(hero?.details).toMatchObject({ strategy: "theme_concept_art" });

    const thin = recordSchema.parse({
      schemaVersion: 1,
      id: "rec-visually-thin",
      slug: "visually-thin",
      status: "active",
      themeId: "coffee-editorial",
      identity: {
        name: { value: "Thin Cafe", source: "manual", verified: true },
        primaryCategory: { value: "Cafe", source: "manual", verified: true },
        categories: { value: ["Cafe"], source: "manual", verified: true },
        businessStatus: { value: "operational", source: "manual", verified: true },
      },
      hero: { headline: { value: "Thin Cafe", source: "manual", verified: true } },
      media: { images: [] },
      poc: { disclaimer: DISCLAIMER, createdAt: "2026-01-01T00:00:00Z" },
    });
    const report = runDeterministicQa(thin, FUTURE);
    expect(report.blockingFailures).toContain("VISUAL_CONTENT_DEPTH");
  });

  it("fails expired records on disposition and expiry", () => {
    const report = runDeterministicQa(
      minimalRecord({ record: { status: "expired" as const } }),
      FUTURE,
    );
    expect(report.passed).toBe(false);
    expect(report.blockingFailures).toContain("RECORD_DISPOSITION");
    const future = runDeterministicQa(
      minimalRecord({ record: { expiresAt: "2020-01-01T00:00:00Z" } }),
      FUTURE,
    );
    expect(future.blockingFailures).toContain("NOT_EXPIRED");
  });

  it("fails permanently closed businesses", () => {
    const report = runDeterministicQa(
      minimalRecord({
        record: {
          identity: {
            ...minimalRecord({}).identity,
            businessStatus: { value: "permanently_closed", source: "google_places", verified: true },
          },
        },
      }),
      FUTURE,
    );
    expect(report.blockingFailures).toContain("BUSINESS_OPEN");
    expect(report.blockingFailures).toContain("RECORD_DISPOSITION");
  });

  it("fails raw placeholder tokens in user-visible copy", () => {
    const report = runDeterministicQa(
      minimalRecord({ headline: { value: "Welcome to {{business_name}}", source: "manual" } }),
      FUTURE,
    );
    expect(report.blockingFailures).toContain("PLACEHOLDER_TOKENS");
    const todo = runDeterministicQa(
      minimalRecord({ headline: { value: "TODO: write headline", source: "manual" } }),
      FUTURE,
    );
    expect(todo.blockingFailures).toContain("PLACEHOLDER_TOKENS");
  });

  it("fails provider images rendering without attribution or license", () => {
    const report = runDeterministicQa(
      minimalRecord({
        image: { url: "https://picsum.photos/seed/qa/1600/900", source: "google_places", attribution: null },
      }),
      FUTURE,
    );
    expect(report.blockingFailures).toContain("ATTRIBUTION_METADATA");
    const withLicense = runDeterministicQa(
      minimalRecord({
        image: { url: "https://picsum.photos/seed/qa/1600/900", source: "google_places", license: "CC-BY-4.0" },
      }),
      FUTURE,
    );
    expect(withLicense.blockingFailures).not.toContain("ATTRIBUTION_METADATA");
  });

  it("untrusted image origins are hidden by policy, not rendered (safe placeholder applies)", () => {
    const report = runDeterministicQa(
      minimalRecord({
        image: { url: "https://evil.example.com/photo.jpg", source: "official_website" },
      }),
      FUTURE,
    );
    expect(report.passed).toBe(true);
    const policy = report.checks.find((check) => check.code === "RENDER_POLICY");
    const imageOrigins = report.checks.find((check) => check.code === "IMAGE_ORIGINS");
    expect(imageOrigins?.status).toBe("pass"); // the untrusted image never renders
    expect((policy?.details as { hiddenByNormalization?: number }).hiddenByNormalization).toBeGreaterThanOrEqual(0);
  });

  it("blocked low-confidence derived narrative is counted as hidden and cannot leak", () => {
    const report = runDeterministicQa(
      minimalRecord({ headline: { value: "AI-invented claim", source: "ai_derived", confidence: 0.2 } }),
      FUTURE,
    );
    expect(report.passed).toBe(true);
    const policy = report.checks.find((check) => check.code === "RENDER_POLICY");
    expect((policy?.details as { blockedRawValues?: number }).blockedRawValues).toBe(1);
    expect((policy?.details as { hiddenByNormalization?: number }).hiddenByNormalization).toBeGreaterThanOrEqual(1);
  });

  it("is deterministic: identical input and clock produce identical reports", () => {
    const record = minimalRecord({});
    expect(runDeterministicQa(record, FUTURE)).toEqual(runDeterministicQa(record, FUTURE));
  });

  it("fixture sweep: complete records pass; edge fixtures fail their specific gates", () => {
    expect(runDeterministicQa(merchantAndVine, FUTURE).passed).toBe(true);
    expect(runDeterministicQa(fjordCoffeePartial, FUTURE).passed).toBe(true);
    // Temporarily closed still renders (banner) — only permanent closure blocks.
    const temporarilyClosed = runDeterministicQa(docksideProvisionsClosed, FUTURE);
    expect(temporarilyClosed.blockingFailures).not.toContain("BUSINESS_OPEN");
    expect(runDeterministicQa(oldMillCantinaPermanent, FUTURE).passed).toBe(false);
    expect(runDeterministicQa(sunsetRamenExpired, FUTURE).passed).toBe(false);
  });
});
