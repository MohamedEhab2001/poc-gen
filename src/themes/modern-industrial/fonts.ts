import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";

export const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-t-display",
  display: "swap",
});

export const body = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-t-body",
  display: "swap",
});
