import { themeIds } from "./schema";
import type { ThemeId } from "./schema";
import type { ThemePalette } from "./types";

/**
 * Theme metadata and default palettes. This module deliberately imports no
 * React components so the /themes showroom can render without pulling all
 * ten theme bundles into one page.
 */
export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  /** One-line art direction summary used in the showroom. */
  character: string;
  defaultPalette: ThemePalette;
  supportedCategories: string[];
  /** Names of the font faces the theme pairs, for showroom typography previews. */
  typePairing: { display: string; body: string };
  /** Abstract miniature layout family used by the showroom card thumbnail. */
  thumbFamily:
    | "split-classic"
    | "asymmetric-dark"
    | "ledger-minimal"
    | "arch-coastal"
    | "magazine-cover"
    | "signboard-retro"
    | "cinematic-luxury"
    | "poster-collage"
    | "soft-botanical"
    | "grid-industrial"
    | "deco-ornament"
    | "fashion-spread"
    | "memphis-play";
  motion: "calm" | "expressive" | "quiet" | "friendly" | "slow" | "energetic" | "crisp" | "ornate" | "gliding" | "springy";
}

export const themeMeta: Record<ThemeId, ThemeMeta> = {
  "heritage-bistro": {
    id: "heritage-bistro",
    name: "Heritage Bistro",
    description:
      "Established neighborhood restaurant. Framed split hero, printed-menu typography, newspaper pull quotes, paper grain.",
    character:
      "Tactile and classic: cream paper, oxblood and olive ink, aged brass rules, engraved botanical linework.",
    defaultPalette: {
      background: "#f6f1e7",
      surface: "#fffdf7",
      text: "#2a2118",
      muted: "#6e6353",
      primary: "#71272b",
      secondary: "#5a6146",
      accent: "#a2782f",
      border: "#d8ccb6",
    },
    supportedCategories: ["restaurant", "bistro", "café", "gastropub"],
    typePairing: { display: "Cormorant Garamond", body: "Source Sans 3" },
    thumbFamily: "split-classic",
    motion: "calm",
  },
  "neon-night": {
    id: "neon-night",
    name: "Neon Night",
    description:
      "Late-night café or dessert bar. Near-black canvas, condensed display type, angled image crops, glowing status chip, mobile action dock.",
    character:
      "Electric and urban: magenta, cyan, and acid-lime accents over deep black, glow used sparingly at readable contrast.",
    defaultPalette: {
      background: "#0b0b12",
      surface: "#14141f",
      text: "#f2f2f7",
      muted: "#9a9ab0",
      primary: "#ff3d8a",
      secondary: "#29e0ff",
      accent: "#c8ff3d",
      border: "#26263a",
    },
    supportedCategories: ["late-night", "dessert bar", "lounge", "cocktail bar"],
    typePairing: { display: "Bebas Neue", body: "Manrope" },
    thumbFamily: "asymmetric-dark",
    motion: "energetic",
  },
  "minimal-japanese": {
    id: "minimal-japanese",
    name: "Minimal Japanese",
    description:
      "Quiet, precise premium minimalism. Hairline borders, disciplined grid, typographic menu list, information ledger for hours and location.",
    character:
      "Bone white and charcoal with a muted vermilion mark; whitespace does the composition, almost no shadow.",
    defaultPalette: {
      background: "#faf9f5",
      surface: "#ffffff",
      text: "#1f1f1e",
      muted: "#75736c",
      primary: "#1f1f1e",
      secondary: "#8c897f",
      accent: "#c73e2e",
      border: "#e4e1d8",
    },
    supportedCategories: ["tea room", "sushi", "bakery", "design-led café"],
    typePairing: { display: "Shippori Mincho", body: "Zen Kaku Gothic New" },
    thumbFamily: "ledger-minimal",
    motion: "quiet",
  },
  "mediterranean-sun": {
    id: "mediterranean-sun",
    name: "Mediterranean Sun",
    description:
      "Bright communal coastal taverna. Arched hero image, ceramic service tokens, airy menu cards, postcard-framed map.",
    character:
      "Aegean blue on white with terracotta and lemon; curved section edges and a restrained mosaic motif.",
    defaultPalette: {
      background: "#f7f4ec",
      surface: "#ffffff",
      text: "#17394f",
      muted: "#5d7484",
      primary: "#1f6f9c",
      secondary: "#d96c47",
      accent: "#e9b93c",
      border: "#d5e2e9",
    },
    supportedCategories: ["mediterranean", "seafood", "family restaurant", "taverna"],
    typePairing: { display: "Young Serif", body: "Nunito Sans" },
    thumbFamily: "arch-coastal",
    motion: "friendly",
  },
  "coffee-editorial": {
    id: "coffee-editorial",
    name: "Coffee Editorial",
    description:
      "Specialty café or roastery as a magazine. Publication-cover hero, story-first about, editorial columns, marginalia pull quotes.",
    character:
      "Espresso, oat, rust, and ink; oversized folio numerals, rule lines, and film grain instead of cards.",
    defaultPalette: {
      background: "#efe7db",
      surface: "#f8f2e8",
      text: "#221912",
      muted: "#6f5f4e",
      primary: "#2b1d16",
      secondary: "#b4552d",
      accent: "#8a6a3b",
      border: "#d6c8b4",
    },
    supportedCategories: ["coffee shop", "roastery", "café", "creative space"],
    typePairing: { display: "Newsreader", body: "Archivo" },
    thumbFamily: "magazine-cover",
    motion: "calm",
  },
  "american-diner": {
    id: "american-diner",
    name: "American Diner",
    description:
      "Cheerful retro diner. Signboard hero with prominent hours, horizontal bands, checker accents, tabbed menu board, speech-card reviews.",
    character:
      "Cherry red, navy, cream, and chrome gray; tactile chunky CTAs, polished rather than kitschy.",
    defaultPalette: {
      background: "#fff6e8",
      surface: "#ffffff",
      text: "#232323",
      muted: "#6b6257",
      primary: "#c8102e",
      secondary: "#1e2a5e",
      accent: "#e0a72e",
      border: "#e8d9c3",
    },
    supportedCategories: ["diner", "burger shop", "breakfast", "dessert spot"],
    typePairing: { display: "Alfa Slab One", body: "Karla" },
    thumbFamily: "signboard-retro",
    motion: "friendly",
  },
  "luxury-fine-dining": {
    id: "luxury-fine-dining",
    name: "Luxury Fine Dining",
    description:
      "High-end chef-led restaurant. Cinematic full-bleed hero, discreet navigation, reservation-first CTA, spacious course layout.",
    character:
      "Black and ivory with muted flat gold and deep wine; slow fades, no glow, generous silence.",
    defaultPalette: {
      background: "#111110",
      surface: "#1a1917",
      text: "#f3efe6",
      muted: "#a39c8d",
      primary: "#c9b378",
      secondary: "#5c1f2e",
      accent: "#c9b378",
      border: "#2c2a26",
    },
    supportedCategories: ["fine dining", "private dining", "chef's table", " tasting menu"],
    typePairing: { display: "Marcellus", body: "Jost" },
    thumbFamily: "cinematic-luxury",
    motion: "slow",
  },
  "street-food-poster": {
    id: "street-food-poster",
    name: "Street Food Poster",
    description:
      "Food truck or counter concept as a layered event poster. Irregular color blocks, cutout imagery, sticker labels, price-forward menu.",
    character:
      "Saturated orange, yellow, and cobalt on black and off-white; halftone texture and torn-paper edges with strict reading order.",
    defaultPalette: {
      background: "#f5f1e8",
      surface: "#ffffff",
      text: "#141414",
      muted: "#5c5850",
      primary: "#ff6b1a",
      secondary: "#2447ff",
      accent: "#ffc93c",
      border: "#141414",
    },
    supportedCategories: ["food truck", "street food", "counter service", "taqueria"],
    typePairing: { display: "Archivo Black", body: "Work Sans" },
    thumbFamily: "poster-collage",
    motion: "energetic",
  },
  "botanical-brunch": {
    id: "botanical-brunch",
    name: "Botanical Brunch",
    description:
      "Garden brunch café or bakery. Layered lifestyle hero, arch image masks, botanical linework, pinboard review cards, dietary tags.",
    character:
      "Sage, cream, blush, and berry with natural wood tones; soft serif over a light sans, gently rounded corners.",
    defaultPalette: {
      background: "#faf7f0",
      surface: "#ffffff",
      text: "#33322c",
      muted: "#77746a",
      primary: "#5f7d5a",
      secondary: "#a4536a",
      accent: "#c9a86a",
      border: "#dfe3d5",
    },
    supportedCategories: ["brunch café", "bakery", "garden restaurant", "health-conscious"],
    typePairing: { display: "Lora", body: "Figtree" },
    thumbFamily: "soft-botanical",
    motion: "friendly",
  },
  "modern-industrial": {
    id: "modern-industrial",
    name: "Modern Industrial",
    description:
      "Contemporary brewery or urban coffee lab. Structural grid lines, technical annotations, monospace micro-labels, spec-sheet menu.",
    character:
      "Concrete gray and charcoal with safety orange; sharp corners, visible grid, coordinate-panel map framing.",
    defaultPalette: {
      background: "#ececea",
      surface: "#ffffff",
      text: "#1c1d1f",
      muted: "#5f646b",
      primary: "#1c1d1f",
      secondary: "#9aa0a6",
      accent: "#ff5a1f",
      border: "#c6c8cb",
    },
    supportedCategories: ["brewery", "urban café", "workshop", "contemporary restaurant"],
    typePairing: { display: "Space Grotesk", body: "IBM Plex Mono" },
    thumbFamily: "grid-industrial",
    motion: "crisp",
  },
  "deco-supper-club": {
    id: "deco-supper-club",
    name: "Deco Supper Club",
    description:
      "Art Deco supper club. Symmetric marquee masthead, fan and sunburst ornament, champagne-gold rules on deep green ink, stepped corner frames.",
    character:
      "Gilded-age nightlife: Poiret One letterforms, drawn gold lines, oxblood accents, and a slow-turning fan crest over candle-dark surfaces.",
    defaultPalette: {
      background: "#0e1d18",
      surface: "#142720",
      text: "#efe3c8",
      muted: "#a3b1a3",
      primary: "#c9a86a",
      secondary: "#8c3040",
      accent: "#d8b978",
      border: "#2c4034",
    },
    supportedCategories: ["supper club", "cocktail bar", "jazz club", "lounge"],
    typePairing: { display: "Poiret One", body: "Outfit" },
    thumbFamily: "deco-ornament",
    motion: "ornate",
  },
  "atelier-lookbook": {
    id: "atelier-lookbook",
    name: "Atelier Lookbook",
    description:
      "High-fashion gallery lookbook. Bodoni display over stark white, one fashion-red accent, parallax image chapters, hairline index rows.",
    character:
      "Ink on gallery white with a single red gesture; enormous whitespace, lookbook spreads, and gliding scroll-linked imagery.",
    defaultPalette: {
      background: "#fbfaf8",
      surface: "#ffffff",
      text: "#111111",
      muted: "#6f6f6f",
      primary: "#111111",
      secondary: "#e0301e",
      accent: "#e0301e",
      border: "#e6e4df",
    },
    supportedCategories: ["design bistro", "atelier café", "gallery restaurant", "contemporary"],
    typePairing: { display: "Bodoni Moda", body: "Familjen Grotesk" },
    thumbFamily: "fashion-spread",
    motion: "gliding",
  },
  "memphis-play": {
    id: "memphis-play",
    name: "Memphis Play",
    description:
      "Playful Memphis geometry for dessert shops and bubble tea. Floating shapes, spring-staggered entrances, price bubbles, squiggle dividers.",
    character:
      "Cream, cobalt, coral, and butter yellow; wobbling geometry, rounded blobs, and bouncy spring motion that stays tasteful.",
    defaultPalette: {
      background: "#fdf8ee",
      surface: "#ffffff",
      text: "#1d1d1f",
      muted: "#6d6a64",
      primary: "#2450ff",
      secondary: "#ff5c39",
      accent: "#ffca3a",
      border: "#e8e2d4",
    },
    supportedCategories: ["dessert shop", "bubble tea", "ice cream", "playful café"],
    typePairing: { display: "Unbounded", body: "DM Sans" },
    thumbFamily: "memphis-play",
    motion: "springy",
  },
};

export const themeMetaList: ThemeMeta[] = themeIds.map((id) => themeMeta[id]);
