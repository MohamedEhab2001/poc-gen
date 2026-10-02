import localFont from "next/font/local";

/**
 * Self-hosted Unbounded and DM Sans (SIL Open Font License; see the
 * LICENSE files in src/fonts/memphis-play/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/memphis-play/unbounded-200-900.woff2", weight: "200 900", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/memphis-play/dm-sans-100-1000.woff2", weight: "100 1000", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
