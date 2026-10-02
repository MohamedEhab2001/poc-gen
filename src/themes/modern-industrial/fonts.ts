import localFont from "next/font/local";

/**
 * Self-hosted Space Grotesk and IBM Plex Mono (SIL Open Font License; see the
 * LICENSE files in src/fonts/modern-industrial/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/modern-industrial/space-grotesk-300-700.woff2", weight: "300 700", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/modern-industrial/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/modern-industrial/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/modern-industrial/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
