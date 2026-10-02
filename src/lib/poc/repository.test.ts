import { describe, expect, it } from "vitest";
import { FixtureBusinessPocRepository } from "./repository";
import { themeIds } from "./schema";

describe("fixture repository", () => {
  const repo = new FixtureBusinessPocRepository();

  it("loads every fixture through the zod boundary without loss", async () => {
    const all = await repo.listAll();
    expect(all.length).toBe(18);
  });

  it("finds records by slug and returns null for unknown slugs", async () => {
    const record = await repo.getBySlug("merchant-vine");
    expect(record?.identity.name.value).toBe("Merchant & Vine");
    expect(await repo.getBySlug("does-not-exist")).toBeNull();
  });

  it("covers all ten themes with complete fixtures", async () => {
    const all = await repo.listAll();
    const edgeSlugs = new Set([
      "fjord-coffee",
      "corner-pho",
      "dockside-provisions",
      "old-mill-cantina",
      "sunset-ramen",
    ]);
    expect(edgeSlugs.size).toBe(5);
    const completeThemes = new Set(
      all.filter((record) => !edgeSlugs.has(record.slug)).map((record) => record.themeId),
    );
    for (const id of themeIds) {
      expect(completeThemes.has(id), `theme ${id} has a complete fixture`).toBe(true);
    }
  });
});
