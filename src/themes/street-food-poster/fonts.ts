import localFont from "next/font/local";

/**
 * Self-hosted Archivo Black and Work Sans (SIL Open Font License; see the
 * LICENSE files in src/fonts/street-food-poster/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/street-food-poster/archivo-black-400.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/street-food-poster/work-sans-300-900.woff2", weight: "300 900", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
