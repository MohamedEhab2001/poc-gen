import localFont from "next/font/local";

/**
 * Self-hosted Bodoni Moda and Familjen Grotesk (SIL Open Font License; see the
 * LICENSE files in src/fonts/atelier-lookbook/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/atelier-lookbook/bodoni-moda-400-700-italic.woff2", weight: "400 900", style: "italic" },
    { path: "../../fonts/atelier-lookbook/bodoni-moda-400-900.woff2", weight: "400 900", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/atelier-lookbook/familjen-grotesk-400-700.woff2", weight: "400 700", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
