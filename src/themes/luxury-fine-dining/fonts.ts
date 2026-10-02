import localFont from "next/font/local";

/**
 * Self-hosted Marcellus and Jost (SIL Open Font License; see the
 * LICENSE files in src/fonts/luxury-fine-dining/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/luxury-fine-dining/marcellus-400.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/luxury-fine-dining/jost-300-700.woff2", weight: "300 700", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
