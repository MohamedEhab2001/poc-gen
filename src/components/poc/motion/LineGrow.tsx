"use client";

import { motion } from "motion/react";
import { useReducedMotionMode } from "./useReducedMotionMode";

/**
 * A horizontal rule that draws itself in from its origin when it enters the
 * viewport — printed rules, folio hairlines, gold ornament lines. Timing
 * comes from the active motion profile; renders the plain rule when motion
 * is disabled.
 */
export function LineGrow({
  className,
  delay = 0,
  origin = "left",
  style,
}: {
  className?: string;
  delay?: number;
  origin?: "left" | "center" | "right";
  style?: React.CSSProperties;
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  if (!ctx?.enabled || profile == null) {
    return <div aria-hidden="true" className={className} style={style} />;
  }

  const xOrigin = origin === "center" ? "50%" : origin === "right" ? "100%" : "0%";
  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={{ ...style, transformOrigin: `${xOrigin} 50%` }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{
        duration: Math.max(profile.revealDuration * 1.15, 0.001),
        delay,
        ease: profile.ease as unknown as [number, number, number, number],
      }}
    />
  );
}
