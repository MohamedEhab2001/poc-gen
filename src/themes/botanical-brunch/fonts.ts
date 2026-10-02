import localFont from "next/font/local";

/**
 * Self-hosted Lora and Figtree (SIL Open Font License; see the
 * LICENSE files in src/fonts/botanical-brunch/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/botanical-brunch/lora-400-700-italic.woff2", weight: "400 700", style: "italic" },
    { path: "../../fonts/botanical-brunch/lora-400-700.woff2", weight: "400 700", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/botanical-brunch/figtree-300-900.woff2", weight: "300 900", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
