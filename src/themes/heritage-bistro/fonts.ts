import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";

export const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-t-display",
  display: "swap",
});

export const body = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
