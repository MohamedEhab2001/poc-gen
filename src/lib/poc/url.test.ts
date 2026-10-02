import { describe, expect, it } from "vitest";
import { isSafeExternalUrl, mailtoHref, mapsQueryUrl, telHref } from "./url";

describe("url safety", () => {
  it("accepts https URLs only", () => {
    expect(isSafeExternalUrl("https://order.example.com")).toBe(true);
    expect(isSafeExternalUrl("http://order.example.com")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("data:text/html,hi")).toBe(false);
    expect(isSafeExternalUrl("not a url")).toBe(false);
  });

  it("builds dialable tel: hrefs from formatted numbers", () => {
    expect(telHref("+1 (503) 555-0114")).toBe("tel:+15035550114");
    expect(telHref("5035550114")).toBe("tel:5035550114");
    expect(telHref("12345")).toBeNull();
    expect(telHref(null)).toBeNull();
  });

  it("builds mailto hrefs for plausible emails", () => {
    expect(mailtoHref("hello@example.com")).toBe("mailto:hello@example.com");
    expect(mailtoHref("nope")).toBeNull();
    expect(mailtoHref("a@b")).toBeNull();
  });

  it("builds maps URLs preferring coordinates", () => {
    expect(mapsQueryUrl({ latitude: 45.5, longitude: -122.6 })).toContain("45.5,-122.6");
    expect(mapsQueryUrl({ latitude: null, longitude: null, formattedAddress: "123 Main St" })).toContain(
      encodeURIComponent("123 Main St"),
    );
    expect(mapsQueryUrl({})).toBeNull();
  });
});
