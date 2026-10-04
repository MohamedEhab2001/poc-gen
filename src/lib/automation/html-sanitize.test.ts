import { describe, expect, it } from "vitest";
import { escapeHtml } from "./outreach";
import { sanitizeOutreachHtml } from "./html-sanitize";

describe("outreach HTML sanitizer (EmailJS {{{body_html}}} boundary)", () => {
  it("keeps the allowed tag set and link hrefs (plus the forced rel)", () => {
    const html = '<p>Hello <strong>world</strong> <a href="https://x.example/a">link</a></p>';
    expect(sanitizeOutreachHtml(html)).toBe(
      '<p>Hello <strong>world</strong> <a href="https://x.example/a" rel="noopener noreferrer">link</a></p>',
    );
  });

  it("adds rel attributes to links", () => {
    const out = sanitizeOutreachHtml('<a href="https://x.example">a</a>');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it("strips scripts, styles, iframes, forms, and images", () => {
    const hostile =
      '<p>ok</p><script>alert(1)</script><style>body{}</style><iframe src="https://evil"></iframe>' +
      '<form action="https://evil"><input></form><img src="https://evil/pixel">';
    const out = sanitizeOutreachHtml(hostile);
    expect(out).toContain("<p>ok</p>");
    expect(out).not.toContain("script");
    expect(out).not.toContain("style");
    expect(out).not.toContain("iframe");
    expect(out).not.toContain("form");
    expect(out).not.toContain("img");
  });

  it("strips event handlers from surviving tags", () => {
    const out = sanitizeOutreachHtml('<p onclick="alert(1)" onmouseover="x">hi</p>');
    expect(out).toBe("<p>hi</p>");
  });

  it("blocks unsafe URL schemes in links", () => {
    expect(sanitizeOutreachHtml('<a href="javascript:alert(1)">x</a>')).not.toContain("javascript:");
    expect(sanitizeOutreachHtml('<a href="data:text/html,evil">x</a>')).not.toContain("data:");
    expect(sanitizeOutreachHtml('<a href="https://ok.example">x</a>')).toContain("https://ok.example");
    expect(sanitizeOutreachHtml('<a href="mailto:hi@example.com">x</a>')).toContain("mailto:");
  });

  it("blocks protocol-relative URLs", () => {
    expect(sanitizeOutreachHtml('<a href="//evil.example">x</a>')).not.toContain("//evil.example");
  });

  it("injection through business text is neutralized even before sanitizing", () => {
    const evil = `"><script>steal()</script>`;
    const escaped = escapeHtml(evil);
    expect(sanitizeOutreachHtml(`<p>${escaped}</p>`)).not.toContain("<script>");
  });
});
