import localFont from "next/font/local";

/**
 * Self-hosted Alfa Slab One and Karla (SIL Open Font License; see the
 * LICENSE files in src/fonts/american-diner/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/american-diner/alfa-slab-one-400.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/american-diner/karla-400-800.woff2", weight: "400 800", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
