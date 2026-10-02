import { Newsreader, Archivo } from "next/font/google";

export const display = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-t-display",
  display: "swap",
});

export const body = Archivo({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
