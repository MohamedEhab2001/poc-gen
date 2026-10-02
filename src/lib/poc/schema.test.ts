import { describe, expect, it } from "vitest";
import { recordSchema, strictThemeIdSchema } from "./schema";
import { merchantAndVine } from "@/data/businesses/merchant-and-vine";
import { cornerPhoMinimal } from "@/data/businesses/corner-pho-minimal";
import { lobaTaqueria } from "@/data/businesses/loba-taqueria";
import { fjordCoffeePartial } from "@/data/businesses/fjord-coffee-partial";

describe("record schema", () => {
  it("accepts a valid complete record", () => {
    const result = recordSchema.safeParse(merchantAndVine);
    expect(result.success).toBe(true);
  });

  it("accepts a valid minimal record", () => {
    const result = recordSchema.safeParse(cornerPhoMinimal);
    expect(result.success).toBe(true);
  });

  it("accepts partial-data and sample-menu records", () => {
    expect(recordSchema.safeParse(fjordCoffeePartial).success).toBe(true);
    expect(recordSchema.safeParse(lobaTaqueria).success).toBe(true);
  });

  it("rejects an invalid theme id via strictThemeIdSchema", () => {
    expect(strictThemeIdSchema.safeParse("cyber-cafe").success).toBe(false);
    expect(strictThemeIdSchema.safeParse("heritage-bistro").success).toBe(true);
  });

  it("rejects a malformed slug", () => {
    const result = recordSchema.safeParse({
      ...merchantAndVine,
      slug: "Not A Slug",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a record missing the required POC disclaimer block", () => {
    const withoutPoc: Record<string, unknown> = { ...merchantAndVine };
    delete withoutPoc.poc;
    expect(recordSchema.safeParse(withoutPoc).success).toBe(false);
  });

  it("rejects unknown top-level keys", () => {
    const result = recordSchema.safeParse({ ...merchantAndVine, surprise: true });
    expect(result.success).toBe(false);
  });
});
