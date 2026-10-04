import { describe, expect, it } from "vitest";
import { buildPocAuthoringGuide } from "./authoring-guide";
import { recordSchema, themeIds } from "@/lib/poc/schema";

describe("get_poc_authoring_guide content", () => {
  const guide = buildPocAuthoringGuide();

  it("theme ids exactly match the registered theme registry", () => {
    expect(guide.themes.map((theme) => theme.id).sort()).toEqual([...themeIds].sort());
  });

  it("every theme carries the required metadata", () => {
    expect(guide.themes).toHaveLength(themeIds.length);
    for (const theme of guide.themes) {
      expect(typeof theme.id).toBe("string");
      expect(theme.name.length).toBeGreaterThan(0);
      expect(theme.description.length).toBeGreaterThan(0);
      expect(theme.character.length).toBeGreaterThan(0);
      expect(Array.isArray(theme.supportedCategories)).toBe(true);
      expect(theme.supportedCategories.length).toBeGreaterThan(0);
      expect(theme.typePairing).toEqual({
        display: expect.any(String),
        body: expect.any(String),
      });
      expect(typeof theme.motion).toBe("string");
    }
  });

  it("minimalRecordExample passes recordSchema.safeParse", () => {
    const parsed = recordSchema.safeParse(guide.minimalRecordExample);
    if (!parsed.success) console.log(JSON.stringify(parsed.error.issues.slice(0, 5)));
    expect(parsed.success).toBe(true);
  });

  it("allowedValues match the enforcing schemas", () => {
    expect(guide.allowedValues.themeIds.sort()).toEqual([...themeIds].sort());
    expect(guide.allowedValues.dataOrigins).toContain("google_places");
    expect(guide.allowedValues.dataOrigins).toContain("ai_derived");
    expect(guide.allowedValues.recordStatuses).toEqual(["draft", "active", "expired", "archived"]);
    expect(guide.allowedValues.businessStatuses).toEqual([
      "operational",
      "temporarily_closed",
      "permanently_closed",
      "unknown",
    ]);
    expect(guide.allowedValues.actionKinds).toContain("order");
    expect(guide.allowedValues.actionKinds).toContain("directions");
  });

  it("serialized result stays well below the 60,000-character transport bound", () => {
    expect(JSON.stringify(guide).length).toBeLessThan(60_000);
  });

  it("contains no secret-shaped values", () => {
    const serialized = JSON.stringify(guide);
    expect(serialized).not.toMatch(/secret|password|bearer|private_key|api[_-]?key/i);
  });

  it("sample data is explicitly fictional", () => {
    const serialized = JSON.stringify(guide.minimalRecordExample);
    expect(serialized).toContain("Fictional");
    expect(guide.authoringRules.join(" ")).toMatch(/Never invent factual/);
  });
});
