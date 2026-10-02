import { Unbounded, DM_Sans } from "next/font/google";

export const display = Unbounded({
  subsets: ["latin"],
  variable: "--font-t-display",
  display: "swap",
});

export const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
