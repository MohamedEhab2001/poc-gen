import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { normalizeRecord } from "@/lib/poc/normalize";
import { recordSchema } from "@/lib/poc/schema";
import { imageElementFailed, resilientView } from "./ResilientImage";
import { SmartImage } from "./SmartImage";

const record = recordSchema.parse({
  schemaVersion: 1,
  id: "rec-render-fail",
  slug: "render-fail",
  status: "active",
  themeId: "neon-night",
  identity: {
    name: { value: "Night Owl Cafe", source: "manual", verified: true },
    primaryCategory: { value: "Cafe", source: "manual", verified: true },
    categories: { value: ["Cafe"], source: "manual", verified: true },
    businessStatus: { value: "operational", source: "manual", verified: true },
  },
  hero: {},
  media: {
    images: [
      {
        id: "c1",
        url: "https://images.unsplash.com/photo-1?ixid=a&w=1920",
        alt: "Concept photo of a cafe",
        role: "hero",
        source: "unsplash",
        width: 1920,
        height: 1280,
        averageColor: "#40302a",
        attribution: { label: "Concept imagery · Photo by Jo Doe on Unsplash", authorName: "Jo Doe", authorUrl: "https://unsplash.com/@jo" },
      },
    ],
  },
  poc: { disclaimer: "Unofficial concept.", createdAt: "2026-10-01T00:00:00Z" },
});

describe("render-time image failure", () => {
  it("13. a failed external image switches to the concept-art fallback", () => {
    expect(resilientView({ url: "https://images.unsplash.com/x", failed: false, hasFallback: true })).toBe("image");
    expect(resilientView({ url: "https://images.unsplash.com/x", failed: true, hasFallback: true })).toBe("fallback");
    expect(resilientView({ url: "", failed: false, hasFallback: true })).toBe("fallback");
    expect(resilientView({ url: "https://x", failed: true, hasFallback: false })).toBe("none");
    // Errors before hydration: a complete image with no pixels counts as failed.
    expect(imageElementFailed({ complete: true, naturalWidth: 0 })).toBe(true);
    expect(imageElementFailed({ complete: false, naturalWidth: 0 })).toBe(false);
    expect(imageElementFailed({ complete: true, naturalWidth: 1200 })).toBe(false);
  });

  it("renders the resolved concept photo with its credit, loading color, and a theme fallback", () => {
    const hero = normalizeRecord(record).hero.image!;
    expect(hero.fallback?.url).toBe("/poc-placeholders/neon-night-hero.svg");
    const html = renderToStaticMarkup(createElement(SmartImage, { image: hero, fill: true, priority: true }));
    expect(html).toContain("images.unsplash.com");
    expect(html).toContain("background-color:#40302a");
    expect(html).toContain('class="poc-media-credit"');
    expect(html).toContain('href="https://unsplash.com/@jo"');
    expect(html).toContain("Concept imagery · Photo by ");
  });

  it("a missing URL renders concept art, never a broken image", () => {
    const hero = { ...normalizeRecord(record).hero.image!, url: "" };
    const html = renderToStaticMarkup(createElement(SmartImage, { image: hero, fill: true }));
    expect(html).toContain('data-hero-strategy="theme-concept-art"');
    expect(html).not.toContain("<img");
  });
});
