import localFont from "next/font/local";

/**
 * Self-hosted Shippori Mincho and Zen Kaku Gothic New (SIL Open Font License; see the
 * LICENSE files in src/fonts/minimal-japanese/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/minimal-japanese/shippori-mincho-500.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/minimal-japanese/shippori-mincho-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/minimal-japanese/zen-kaku-gothic-new-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/minimal-japanese/zen-kaku-gothic-new-500.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/minimal-japanese/zen-kaku-gothic-new-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
