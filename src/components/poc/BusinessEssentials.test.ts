import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BusinessEssentials } from "./BusinessEssentials";
import { normalizeRecord } from "@/lib/poc/normalize";
import type { BusinessPocRecord } from "@/lib/poc/types";
import { cornerPhoMinimal } from "@/data/businesses/corner-pho-minimal";

/**
 * Sparse fixture: name, category, phone, address, coordinates — no hours,
 * menu, reviews, gallery, or services, so BusinessEssentials always renders.
 */
function sparseRecord(overrides: Partial<BusinessPocRecord> = {}): ReturnType<typeof normalizeRecord> {
  return normalizeRecord({ ...cornerPhoMinimal, ...overrides });
}

function gridColumnClass(html: string): string {
  const match = html.match(/lg:grid-cols-\d/) ?? [];
  return match[0] ?? "";
}

describe("BusinessEssentials adaptive grid", () => {
  it("uses a balanced three-column layout for three facts", () => {
    // category + location + contact (no hours on this fixture)
    const html = renderToStaticMarkup(createElement(BusinessEssentials, { record: sparseRecord() }));
    expect(html).toContain("At a glance");
    expect(gridColumnClass(html)).toBe("lg:grid-cols-3");
    expect(html.match(/<article/g)?.length).toBe(3);
  });

  it("uses four columns for four facts", () => {
    const withHours: BusinessPocRecord = {
      ...cornerPhoMinimal,
      hours: {
        weekdayDescriptions: { value: ["Monday: 11:00–20:00", "Tuesday: 11:00–20:00"], source: "manual", verified: true },
      },
    };
    const html = renderToStaticMarkup(createElement(BusinessEssentials, { record: normalizeRecord(withHours) }));
    expect(gridColumnClass(html)).toBe("lg:grid-cols-4");
    expect(html.match(/<article/g)?.length).toBe(4);
  });

  it("pairs two facts without empty decorative columns", () => {
    const noContact: BusinessPocRecord = {
      ...cornerPhoMinimal,
      contact: {},
      callsToAction: { call: { label: "Call", href: "tel:123", kind: "call", source: "manual", verified: true } },
    };
    const html = renderToStaticMarkup(createElement(BusinessEssentials, { record: normalizeRecord(noContact) }));
    expect(html.match(/<article/g)?.length).toBe(2);
    expect(gridColumnClass(html)).toBe("");
    expect(html).toContain("sm:grid-cols-2");
  });

  it("stays responsive at small widths regardless of fact count", () => {
    const html = renderToStaticMarkup(createElement(BusinessEssentials, { record: sparseRecord() }));
    expect(html).toContain("sm:grid-cols-2");
  });
});
