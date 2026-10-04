import sanitizeHtml from "sanitize-html";

/**
 * Allowlist sanitizer for outreach HTML rendered into the EmailJS template's
 * unescaped {{{body_html}}} variable. The application generates this HTML
 * server-side (escapeHtml-based renderer), but the sanitizer is a second,
 * independent boundary: only a small tag/attribute set survives, and
 * scripts, styles, event handlers, iframes, forms, images, and unsafe URL
 * schemes are stripped regardless of source.
 */
const ALLOWED_TAGS = ["p", "br", "a", "strong", "em", "b", "i", "span", "div"];
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  // rel is forced to noopener noreferrer by transformTags; listing it keeps
  // the transformed value through the attribute filter.
  a: ["href", "title", "rel"],
};

export function sanitizeOutreachHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { a: ["http", "https", "mailto"] },
    disallowedTagsMode: "discard",
    allowProtocolRelative: false,
    allowedIframeHostnames: [],
    allowIframeRelativeUrls: false,
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, rel: "noopener noreferrer" },
      }),
    },
  });
}

/** True when the input would survive sanitization unchanged. */
export function isAlreadySanitized(html: string): boolean {
  return sanitizeOutreachHtml(html) === html;
}
