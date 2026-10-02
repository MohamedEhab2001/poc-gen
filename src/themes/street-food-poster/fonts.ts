import { Archivo_Black, Work_Sans } from "next/font/google";

export const display = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-t-display",
  display: "swap",
});

export const body = Work_Sans({
  subsets: ["latin"],
  variable: "--font-t-body",
  display: "swap",
});
