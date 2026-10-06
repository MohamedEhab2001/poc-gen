import { describe, expect, it } from "vitest";
import { themeIds } from "./schema";
import { themeMeta } from "./theme-meta";
import { DEFAULT_THEME_ID, resolveThemeId, themeRegistry } from "./theme-registry";

describe("theme registry", () => {
  it("registers exactly the themes the schema declares, with no unsupported IDs", () => {
    expect(Object.keys(themeRegistry).sort()).toEqual([...themeIds].sort());
    expect(themeIds).toHaveLength(13);
  });

  it("every registered theme carries complete metadata and a lazy loader", () => {
    for (const id of themeIds) {
      const definition = themeRegistry[id];
      expect(definition.id).toBe(id);
      expect(definition.name.length).toBeGreaterThan(0);
      expect(definition.character.length).toBeGreaterThan(0);
      expect(definition.defaultPalette.background).toMatch(/^#/);
      expect(typeof definition.load).toBe("function");
      expect(themeMeta[id].motion).toBeDefined();
    }
  });

  it("resolves known theme IDs unchanged", () => {
    for (const id of themeIds) {
      expect(resolveThemeId(id)).toEqual({ themeId: id, overridden: false, warning: null });
    }
  });

  it("falls back to the default theme for unknown IDs and reports a warning", () => {
    const result = resolveThemeId("neon-disco-vaporwave");
    expect(result.themeId).toBe(DEFAULT_THEME_ID);
    expect(result.overridden).toBe(true);
    expect(result.warning).toContain("neon-disco-vaporwave");
  });
});
