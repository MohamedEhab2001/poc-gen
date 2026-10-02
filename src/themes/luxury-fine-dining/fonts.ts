import { Marcellus, Jost } from "next/font/google";

export const display = Marcellus({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-t-display",
  display: "swap",
});

export const body = Jost({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
