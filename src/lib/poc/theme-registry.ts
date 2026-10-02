import type { ComponentType } from "react";
import { themeIds } from "./schema";
import type { ThemeId } from "./schema";
import { themeMeta } from "./theme-meta";
import type { ThemeMeta } from "./theme-meta";
import type { ThemeProps } from "./types";

export interface ThemeDefinition extends ThemeMeta {
  /**
   * Lazy component loader. Themes are code-split so a single customer POC
   * route never downloads the assets of the other nine themes.
   */
  load: () => Promise<{ default: ComponentType<ThemeProps> }>;
}

export const themeRegistry: Record<ThemeId, ThemeDefinition> = {
  "heritage-bistro": {
    ...themeMeta["heritage-bistro"],
    load: () => import("@/themes/heritage-bistro/theme"),
  },
  "neon-night": {
    ...themeMeta["neon-night"],
    load: () => import("@/themes/neon-night/theme"),
  },
  "minimal-japanese": {
    ...themeMeta["minimal-japanese"],
    load: () => import("@/themes/minimal-japanese/theme"),
  },
  "mediterranean-sun": {
    ...themeMeta["mediterranean-sun"],
    load: () => import("@/themes/mediterranean-sun/theme"),
  },
  "coffee-editorial": {
    ...themeMeta["coffee-editorial"],
    load: () => import("@/themes/coffee-editorial/theme"),
  },
  "american-diner": {
    ...themeMeta["american-diner"],
    load: () => import("@/themes/american-diner/theme"),
  },
  "luxury-fine-dining": {
    ...themeMeta["luxury-fine-dining"],
    load: () => import("@/themes/luxury-fine-dining/theme"),
  },
  "street-food-poster": {
    ...themeMeta["street-food-poster"],
    load: () => import("@/themes/street-food-poster/theme"),
  },
  "botanical-brunch": {
    ...themeMeta["botanical-brunch"],
    load: () => import("@/themes/botanical-brunch/theme"),
  },
  "modern-industrial": {
    ...themeMeta["modern-industrial"],
    load: () => import("@/themes/modern-industrial/theme"),
  },
  "deco-supper-club": {
    ...themeMeta["deco-supper-club"],
    load: () => import("@/themes/deco-supper-club/theme"),
  },
  "atelier-lookbook": {
    ...themeMeta["atelier-lookbook"],
    load: () => import("@/themes/atelier-lookbook/theme"),
  },
  "memphis-play": {
    ...themeMeta["memphis-play"],
    load: () => import("@/themes/memphis-play/theme"),
  },
};

export const DEFAULT_THEME_ID: ThemeId = "heritage-bistro";

/**
 * Resolves an arbitrary theme string to a registered theme. Unknown values
 * fall back to the documented default and report a warning the caller can
 * surface in internal previews.
 */
export function resolveThemeId(
  raw: string,
): { themeId: ThemeId; overridden: boolean; warning: string | null } {
  if ((themeIds as readonly string[]).includes(raw)) {
    return { themeId: raw as ThemeId, overridden: false, warning: null };
  }
  return {
    themeId: DEFAULT_THEME_ID,
    overridden: true,
    warning: `Unknown themeId "${raw}". Falling back to "${DEFAULT_THEME_ID}".`,
  };
}
