import { describe, expect, it } from "vitest";
import {
  hostnameFromBaseUrl,
  isValidImageHostname,
  parseImageHostAllowlist,
  resolveImageHosts,
} from "./image-hosts";
import { isAllowedImageUrl } from "./url";

describe("image hostname validation", () => {
  it("accepts plain DNS hostnames only", () => {
    expect(isValidImageHostname("cdn.example.com")).toBe(true);
    expect(isValidImageHostname("assets.r2.dev")).toBe(true);
  });

  it("rejects protocols, paths, ports, separators, whitespace, and wildcards", () => {
    expect(isValidImageHostname("https://cdn.example.com")).toBe(false);
    expect(isValidImageHostname("cdn.example.com/path")).toBe(false);
    expect(isValidImageHostname("cdn.example.com:8443")).toBe(false);
    expect(isValidImageHostname("a b.example.com")).toBe(false);
    expect(isValidImageHostname("a;style-src")).toBe(false);
    expect(isValidImageHostname("*.example.com")).toBe(false);
    expect(isValidImageHostname("'; injected")).toBe(false);
    expect(isValidImageHostname("example")).toBe(false); // no dot
    expect(isValidImageHostname("")).toBe(false);
  });

  it("parses comma-separated lists and reports rejected entries", () => {
    const parsed = parseImageHostAllowlist("cdn.example.com, https://evil.com, ok.io,,bad host");
    expect(parsed.hosts).toEqual(["cdn.example.com", "ok.io"]);
    expect(parsed.rejected).toEqual(["https://evil.com", "bad host"]);
  });

  it("extracts a valid hostname from a base URL and rejects http or garbage", () => {
    expect(hostnameFromBaseUrl("https://pub.r2.example.com")).toBe("pub.r2.example.com");
    expect(hostnameFromBaseUrl("pub.r2.example.com")).toBe("pub.r2.example.com");
    expect(hostnameFromBaseUrl("http://insecure.example.com")).toBe(null);
    expect(hostnameFromBaseUrl("not a url")).toBe(null);
  });

  it("resolves base hosts plus configured extras, deduplicated", () => {
    const hosts = resolveImageHosts({
      POC_IMAGE_HOST_ALLOWLIST: "cdn.example.com,picsum.photos",
      R2_PUBLIC_BASE_URL: "https://pub.r2.example.com",
    });
    expect(hosts).toContain("cdn.example.com");
    expect(hosts).toContain("pub.r2.example.com");
    expect(hosts.filter((h) => h === "picsum.photos")).toHaveLength(1);
  });
});

describe("isAllowedImageUrl against the shared allowlist", () => {
  const hosts = resolveImageHosts({ POC_IMAGE_HOST_ALLOWLIST: "cdn.example.com" });

  it("accepts local paths, allowlisted HTTPS hosts, and configured CDNs", () => {
    expect(isAllowedImageUrl("/poc-placeholders/x.svg", hosts)).toBe(true);
    expect(isAllowedImageUrl("https://picsum.photos/seed/x/10/10", hosts)).toBe(true);
    expect(isAllowedImageUrl("https://cdn.example.com/img.jpg", hosts)).toBe(true);
  });

  it("rejects http, protocol-relative, non-allowlisted, and malformed URLs", () => {
    expect(isAllowedImageUrl("http://cdn.example.com/img.jpg", hosts)).toBe(false);
    expect(isAllowedImageUrl("//cdn.example.com/img.jpg", hosts)).toBe(false);
    expect(isAllowedImageUrl("https://evil.example.com/img.jpg", hosts)).toBe(false);
    expect(isAllowedImageUrl("javascript:alert(1)", hosts)).toBe(false);
    expect(isAllowedImageUrl("not a url", hosts)).toBe(false);
  });
});
