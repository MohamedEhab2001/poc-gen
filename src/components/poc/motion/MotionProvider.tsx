"use client";

import { createContext, useContext, useMemo } from "react";
import { MotionConfig, useReducedMotion } from "motion/react";
import { resolveMotionProfile } from "@/lib/poc/motion-profiles";
import type { MotionIntensity, ResolvedMotion } from "@/lib/poc/motion-profiles";
import type { ThemeId } from "@/lib/poc/schema";

export interface MotionContextValue {
  profile: ResolvedMotion;
  /** prefers-reduced-motion, false during SSR and first paint. */
  reduced: boolean;
  /** Entrance motion runs at all; false renders plain static markup. */
  enabled: boolean;
}

const MotionContext = createContext<MotionContextValue | null>(null);

/**
 * Single motion boundary per POC page. Resolves the theme's motion profile
 * once and shares it with every motion island below the theme, so themes
 * never hard-code animation values and primitives can never disagree about
 * the active intensity or reduced-motion state.
 */
export function MotionProvider({
  themeId,
  intensity,
  children,
}: {
  themeId: ThemeId;
  intensity: MotionIntensity;
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion() ?? false;
  const value = useMemo<MotionContextValue>(() => {
    const profile = resolveMotionProfile(themeId, intensity);
    return {
      profile,
      reduced,
      enabled: intensity !== "none" && !reduced,
    };
  }, [themeId, intensity, reduced]);

  return (
    <MotionConfig reducedMotion="user">
      <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
    </MotionConfig>
  );
}

/** Reads the resolved motion profile; null when rendered outside a POC theme. */
export function useMotionContext(): MotionContextValue | null {
  return useContext(MotionContext);
}
