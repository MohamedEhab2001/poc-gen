import localFont from "next/font/local";

/**
 * Self-hosted Young Serif and Nunito Sans (SIL Open Font License; see the
 * LICENSE files in src/fonts/mediterranean-sun/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/mediterranean-sun/young-serif-400.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/mediterranean-sun/nunito-sans-400-1000.woff2", weight: "400 1000", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
