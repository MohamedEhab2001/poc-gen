import { themeRegistry } from "./theme-registry";
import type { ResolvedBusiness } from "./types";
import { MotionProvider } from "@/components/poc/motion/MotionProvider";
import { ScrollProgress } from "@/components/poc/motion/ScrollProgress";

/**
 * Loads the theme component lazily (code-split per route) and renders the
 * normalized record. A single customer POC page only ever downloads the
 * assets of its own theme. The MotionProvider resolves the theme's motion
 * profile once for every motion island below; the ScrollProgress hairline
 * renders itself only for expressive scroll-linked themes.
 */
export async function renderTheme(record: ResolvedBusiness): Promise<React.ReactNode> {
  const definition = themeRegistry[record.themeId];
  const Theme = (await definition.load()).default;
  return (
    <MotionProvider themeId={record.themeId} intensity={record.motion}>
      <ScrollProgress />
      <Theme record={record} />
    </MotionProvider>
  );
}
