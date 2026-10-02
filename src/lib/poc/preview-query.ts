/**
 * Pure preview-route query state. The toolbar merges one control change into
 * the current state instead of rebuilding the URL from scratch, so a theme
 * override survives viewport and overlay toggles.
 */

export type PreviewViewport = "desktop" | "tablet" | "mobile";

export interface PreviewQueryState {
  theme?: string;
  viewport?: PreviewViewport;
  overlay?: boolean;
}

export function parsePreviewQuery(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
): PreviewQueryState {
  const get = (key: string): string | undefined => {
    if (input instanceof URLSearchParams) return input.get(key) ?? undefined;
    const value = input[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const viewport = get("viewport");
  return {
    theme: get("theme") || undefined,
    viewport:
      viewport === "mobile" || viewport === "tablet" ? (viewport as PreviewViewport) : undefined,
    overlay: get("overlay") === "source" || undefined,
  };
}

/** Merges a change into a state and returns the serialized query string. */
export function buildPreviewQuery(
  state: PreviewQueryState,
  change: Partial<PreviewQueryState>,
): string {
  const merged: PreviewQueryState = { ...state, ...change };
  const params = new URLSearchParams();
  if (merged.theme) params.set("theme", merged.theme);
  if (merged.viewport && merged.viewport !== "desktop") params.set("viewport", merged.viewport);
  if (merged.overlay) params.set("overlay", "source");
  return params.toString();
}
