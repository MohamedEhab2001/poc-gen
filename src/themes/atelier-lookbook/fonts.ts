import { Bodoni_Moda, Familjen_Grotesk } from "next/font/google";

export const display = Bodoni_Moda({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-t-display",
  display: "swap",
});

export const body = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
