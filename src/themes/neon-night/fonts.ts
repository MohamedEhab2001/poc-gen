import localFont from "next/font/local";

/**
 * Self-hosted Bebas Neue and Manrope (SIL Open Font License; see the
 * LICENSE files in src/fonts/neon-night/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/neon-night/bebas-neue-400.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/neon-night/manrope-200-800.woff2", weight: "200 800", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
