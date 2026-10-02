import { Alfa_Slab_One, Karla } from "next/font/google";

export const display = Alfa_Slab_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-t-display",
  display: "swap",
});

export const body = Karla({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
