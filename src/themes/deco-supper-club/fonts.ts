import { Poiret_One, Outfit } from "next/font/google";

export const display = Poiret_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-t-display",
  display: "swap",
});

export const body = Outfit({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
