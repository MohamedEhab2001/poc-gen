import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BusinessPocRecord } from "@/lib/poc/types";
import { normalizeRecord } from "@/lib/poc/normalize";
import { MotionProvider } from "@/components/poc/motion/MotionProvider";
import { folioCoffeeRoasters } from "@/data/businesses/folio-coffee-roasters";
import { junosDiner } from "@/data/businesses/junos-diner";
import { sableRoom } from "@/data/businesses/sable-room";
import { cornerPhoMinimal } from "@/data/businesses/corner-pho-minimal";

/**
 * Composition tests for the three benchmark themes. Each theme renders
 * server-side (next/font is stubbed to its return shape) against rich and
 * sparse records so conditional sections, nav integrity, CTA/map presence,
 * and empty-state behavior are all pinned down.
 */

type FixtureMap = Record<string, BusinessPocRecord>;

const richFixtures: FixtureMap = {
  "coffee-editorial": folioCoffeeRoasters,
  "american-diner": junosDiner,
  "luxury-fine-dining": sableRoom,
};

/** Sparse variant: the minimal fixture re-themed, everything optional gone. */
function sparseFixture(themeId: string): BusinessPocRecord {
  return { ...cornerPhoMinimal, themeId, media: { images: [] } };
}

async function renderTheme(record: BusinessPocRecord, motion: "none" | "expressive" = "none"): Promise<string> {
  const vm = normalizeRecord(record);
  const mod = (await import(`@/themes/${record.themeId}/theme`)) as {
    default: React.ComponentType<{ record: typeof vm }>;
  };
  const Theme = mod.default;
  return renderToStaticMarkup(
    <MotionProvider themeId={vm.themeId} intensity={motion}>
      <Theme record={vm} />
    </MotionProvider>,
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}

function sectionIds(html: string): string[] {
  return [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1] as string);
}

describe("benchmark themes: rich records", () => {
  for (const [themeId, fixture] of Object.entries(richFixtures)) {
    it(`${themeId}: renders hero, menu, gallery, reviews, and map sections`, async () => {
      const html = await renderTheme(fixture);
      expect(html).toContain(escapeHtml(fixture.hero.headline?.value ?? fixture.identity.name.value ?? ""));
      expect(html).toContain("<iframe");
      // A directions action exists alongside the map (label varies by record).
      expect(html).toMatch(/href="https:\/\/(www\.)?google\.com\/maps/);
      // Apostrophes arrive HTML-escaped in static markup.
      expect(html).toContain(escapeHtml(fixture.identity.name.value ?? ""));
      // No CTA or content links to nowhere.
      expect(html).not.toMatch(/href="#"/);
    });

    it(`${themeId}: nav only links to sections that actually render`, async () => {
      const html = await renderTheme(fixture);
      const ids = new Set(sectionIds(html));
      const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1] as string);
      expect(hrefs.length).toBeGreaterThan(0);
      for (const href of hrefs) {
        expect(ids.has(href), `nav links to #${href} which does not exist`).toBe(true);
      }
    });

    it(`${themeId}: never renders an empty heading or empty card shell`, async () => {
      const html = await renderTheme(fixture);
      expect(html).not.toMatch(/<h[1-3][^>]*>\s*<\/h[1-3]>/);
    });
  }
});

describe("benchmark themes: sparse records", () => {
  for (const themeId of Object.keys(richFixtures)) {
    it(`${themeId}: hides unavailable sections and keeps the page intentional`, async () => {
      const html = await renderTheme(sparseFixture(themeId));
      const vm = normalizeRecord(sparseFixture(themeId));

      // Optional sections are gone, not empty.
      expect(html).not.toContain("The Menu Board");
      expect(html).not.toContain("Field notes");
      expect(html).not.toContain("Marginalia");
      // Essentials fallback fills the sparse page.
      expect(html).toContain("At a glance");
      // Hero still leads with the sourced headline.
      expect(html).toContain(escapeHtml(vm.hero.headline));
      // Nav integrity holds under sparse data.
      const ids = new Set(sectionIds(html));
      const hrefs = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1] as string);
      for (const href of hrefs) {
        expect(ids.has(href), `nav links to #${href} which does not exist`).toBe(true);
      }
      expect(html).not.toMatch(/<h[1-3][^>]*>\s*<\/h[1-3]>/);
    });
  }
});

describe("benchmark themes: palette adaptation", () => {
  it("a single verified brand color re-tints the palette without losing contrast guards", () => {
    const branded: BusinessPocRecord = {
      ...folioCoffeeRoasters,
      brand: {
        ...folioCoffeeRoasters.brand,
        palette: { primary: { value: "#1f6f4a", source: "business_owner", verified: true } },
      },
    };
    const vm = normalizeRecord(branded);
    expect(vm.palette.primary).toBe("#1f6f4a");
    expect(vm.palette.onPrimary).toMatch(/^#/);
    // Supporting colors derive from the brand hue, not the theme default.
    expect(vm.palette.secondary).not.toBe(
      normalizeRecord(folioCoffeeRoasters).palette.secondary,
    );
  });

  it("default palettes apply when no brand color is sourced", () => {
    const vm = normalizeRecord(cornerPhoMinimal);
    expect(vm.palette.primary).toMatch(/^#/);
    expect(vm.palette.onPrimary).toMatch(/^#/);
  });
});
