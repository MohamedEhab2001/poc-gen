import localFont from "next/font/local";

/**
 * Self-hosted Cormorant Garamond and Source Sans 3 (SIL Open Font License; see the
 * LICENSE files in src/fonts/heritage-bistro/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/heritage-bistro/cormorant-garamond-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../../fonts/heritage-bistro/cormorant-garamond-600-italic.woff2", weight: "600", style: "italic" },
    { path: "../../fonts/heritage-bistro/cormorant-garamond-700-italic.woff2", weight: "700", style: "italic" },
    { path: "../../fonts/heritage-bistro/cormorant-garamond-500.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/heritage-bistro/cormorant-garamond-600.woff2", weight: "600", style: "normal" },
    { path: "../../fonts/heritage-bistro/cormorant-garamond-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/heritage-bistro/source-sans-3-400-700.woff2", weight: "400 700", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
