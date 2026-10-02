import { afterEach, describe, expect, it } from "vitest";
import {
  cspImgSrc,
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

describe("runtime resolution and CSP agreement", () => {
  const ENV_KEYS = ["POC_IMAGE_HOST_ALLOWLIST", "R2_PUBLIC_BASE_URL"] as const;

  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  it("honors POC_IMAGE_HOST_ALLOWLIST through the default runtime path", () => {
    process.env.POC_IMAGE_HOST_ALLOWLIST = "cdn.example.com";
    // No explicit hosts argument: exercises getRuntimeImageHosts() ->
    // process.env, the same path production normalization uses.
    expect(isAllowedImageUrl("https://cdn.example.com/img.jpg")).toBe(true);
    expect(isAllowedImageUrl("https://other.example.com/img.jpg")).toBe(false);
  });

  it("honors R2_PUBLIC_BASE_URL through the default runtime path", () => {
    process.env.R2_PUBLIC_BASE_URL = "https://assets.example.com";
    expect(isAllowedImageUrl("https://assets.example.com/p/hero.jpg")).toBe(true);
  });

  it("returns the identical host set for CSP and runtime validation", () => {
    process.env.POC_IMAGE_HOST_ALLOWLIST = "cdn.example.com,bad host;injected";
    process.env.R2_PUBLIC_BASE_URL = "https://assets.example.com";

    const hosts = resolveImageHosts(process.env);
    const csp = cspImgSrc(process.env);

    for (const host of hosts) {
      expect(csp).toContain(`https://${host}`);
    }
    // Nothing that failed validation may leak into the directive.
    expect(csp).not.toContain(";");
    expect(csp).not.toContain("bad host");
    expect(csp).not.toContain("injected");
  });
});

describe("local image path hardening", () => {
  it("allows valid root-relative paths only", () => {
    expect(isAllowedImageUrl("/poc-placeholders/heritage-bistro-hero.svg")).toBe(true);
    expect(isAllowedImageUrl("/a/deeper/path.jpg")).toBe(true);
  });

  it("rejects protocol-relative, backslash, and normalizable-malicious paths", () => {
    expect(isAllowedImageUrl("//evil.example.com/x.jpg")).toBe(false);
    expect(isAllowedImageUrl("/\\evil.example.com/x.jpg")).toBe(false);
    expect(isAllowedImageUrl("/path/\\evil.example.com/x.jpg")).toBe(false);
    expect(isAllowedImageUrl("/x/\tevil.jpg")).toBe(false);
    expect(isAllowedImageUrl("/x/\nevil.jpg")).toBe(false);
  });
});
