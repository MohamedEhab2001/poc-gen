import localFont from "next/font/local";

/**
 * Self-hosted Newsreader and Archivo (SIL Open Font License; see the
 * LICENSE files in src/fonts/coffee-editorial/). Bundled locally so production builds
 * never depend on remote font CDNs.
 */
export const display = localFont({
  src: [
    { path: "../../fonts/coffee-editorial/newsreader-400-700-italic.woff2", weight: "400 700", style: "italic" },
    { path: "../../fonts/coffee-editorial/newsreader-400-700.woff2", weight: "400 700", style: "normal" },
  ],
  variable: "--font-t-display",
  display: "swap",
});

export const body = localFont({
  src: [
    { path: "../../fonts/coffee-editorial/archivo-400-800.woff2", weight: "400 800", style: "normal" },
  ],
  variable: "--font-t-body",
  display: "swap",
});
