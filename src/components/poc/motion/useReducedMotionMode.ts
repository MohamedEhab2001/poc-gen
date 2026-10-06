"use client";

import { useEffect, useState } from "react";
import type { MotionContextValue } from "./MotionProvider";
import { useMotionContext } from "./MotionProvider";

export type { MotionContextValue };

/**
 * Combined reduced-motion answer: the OS-level media query OR the record's
 * `themeOverrides.motion: none` both collapse to `enabled: false`, which
 * every primitive treats as "render plain static markup". Returns null when
 * rendered outside a POC theme (no MotionProvider above), which also renders
 * statically.
 */
export function useReducedMotionMode(): MotionContextValue | null {
  return useMotionContext();
}

/**
 * SSR-safe media query. Returns false during server render and the first
 * client render, then updates after mount (no hydration mismatch).
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const list = window.matchMedia(query);
    const update = () => setMatches(list.matches);
    update();
    list.addEventListener("change", update);
    return () => list.removeEventListener("change", update);
  }, [query]);

  return matches;
}
