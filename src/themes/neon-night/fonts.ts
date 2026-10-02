import { Bebas_Neue, Manrope } from "next/font/google";

export const display = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-t-display",
  display: "swap",
});

export const body = Manrope({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
