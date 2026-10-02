import { themeRegistry } from "./theme-registry";
import type { ResolvedBusiness } from "./types";

/**
 * Loads the theme component lazily (code-split per route) and renders the
 * normalized record. A single customer POC page only ever downloads the
 * assets of its own theme.
 */
export async function renderTheme(record: ResolvedBusiness): Promise<React.ReactNode> {
  const definition = themeRegistry[record.themeId];
  const Theme = (await definition.load()).default;
  return <Theme record={record} />;
}
