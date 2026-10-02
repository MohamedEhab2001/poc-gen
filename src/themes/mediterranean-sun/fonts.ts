import { Young_Serif, Nunito_Sans } from "next/font/google";

export const display = Young_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-t-display",
  display: "swap",
});

export const body = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
