import { Lora, Figtree } from "next/font/google";

export const display = Lora({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-t-display",
  display: "swap",
});

export const body = Figtree({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
