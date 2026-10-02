import { Shippori_Mincho, Zen_Kaku_Gothic_New } from "next/font/google";

export const display = Shippori_Mincho({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-t-display",
  display: "swap",
});

export const body = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-t-body",
  display: "swap",
});
