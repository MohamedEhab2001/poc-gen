"use client";

import { motion, useScroll, useSpring } from "motion/react";
import { useReducedMotionMode } from "./useReducedMotionMode";

/**
 * Theme-colored scroll progress hairline at the very top of the viewport.
 * Only renders for expressive motion on scroll-linked profiles and never
 * under reduced motion. Two pixels tall with pointer-events disabled, so it
 * can never intercept navigation, the mobile action bar, or browser chrome.
 */
export function ScrollProgress() {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });

  if (!ctx?.enabled || profile == null) return null;
  if (profile.mode !== "expressive" || !profile.scrollLinked) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[2px] origin-left"
      style={{ scaleX, background: "var(--accent)" }}
    />
  );
}
