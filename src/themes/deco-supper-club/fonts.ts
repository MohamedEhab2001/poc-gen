import localFont from "next/font/local";

/**
 * Self-hosted Poiret One and Outfit (SIL Open Font License; see the
 * LICENSE files in src/fonts/deco-supper-club/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/deco-supper-club/poiret-one-400.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/deco-supper-club/outfit-100-900.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
