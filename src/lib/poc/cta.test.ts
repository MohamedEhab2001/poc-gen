import { describe, expect, it } from "vitest";
import { resolveCtas } from "./cta";
import type { BusinessPocRecord } from "./types";
import { merchantAndVine } from "@/data/businesses/merchant-and-vine";

function withCtas(overrides: NonNullable<BusinessPocRecord["callsToAction"]>): BusinessPocRecord {
  return { ...merchantAndVine, callsToAction: overrides };
}

describe("cta priority engine", () => {
  it("prioritizes order > reserve > call > directions > email", () => {
    const record = withCtas({
      order: { label: "Order online", href: "https://order.example.com", kind: "order", external: true },
      reserve: { label: "Book", href: "https://book.example.com", kind: "reserve", external: true },
      call: { label: "Call", href: "+1 (503) 555-0114", kind: "call" },
      directions: {
        label: "Directions",
        href: "https://maps.example.com",
        kind: "directions",
        external: true,
      },
      email: { label: "Email", href: "hello@example.com", kind: "email" },
    });
    const { primary, secondary, mobile } = resolveCtas(record);
    expect(primary?.kind).toBe("order");
    expect(secondary.map((cta) => cta.kind)).toEqual(["reserve", "call"]);
    expect(mobile.map((cta) => cta.kind)).toEqual(["order", "reserve"]);
  });

  it("falls to the next best action when order and reserve are missing (rule 10)", () => {
    const record = withCtas({
      call: { label: "Call us", href: "+1 (503) 555-0114", kind: "call" },
    });
    const { primary } = resolveCtas(record);
    expect(primary?.kind).toBe("call");
    expect(primary?.href).toBe("tel:+15035550114");
  });

  it("derives call and directions actions from contact and location data", () => {
    const bare = withCtas({});
    const { primary, secondary } = resolveCtas(bare);
    const kinds = [primary?.kind, ...secondary.map((cta) => cta.kind)];
    expect(kinds).toContain("call");
    expect(kinds).toContain("directions");
  });

  it("never renders disabled or empty actions", () => {
    const record = withCtas({
      order: { label: "Broken", href: "javascript:x", kind: "order", external: true },
    });
    const { primary, dropped } = resolveCtas(record);
    expect(dropped).toHaveLength(1);
    expect(primary?.kind).not.toBe("order");
  });

  it("keeps at most one primary and two secondary actions", () => {
    const record = withCtas({
      order: { label: "Order", href: "https://a.example.com", kind: "order", external: true },
      reserve: { label: "Reserve", href: "https://b.example.com", kind: "reserve", external: true },
      call: { label: "Call", href: "+1 (503) 555-0114", kind: "call" },
      directions: { label: "Go", href: "https://c.example.com", kind: "directions", external: true },
    });
    const { primary, secondary } = resolveCtas(record);
    expect(primary).toBeDefined();
    expect(secondary).toHaveLength(2);
  });
});
