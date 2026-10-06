"use client";

import { motion } from "motion/react";
import { useReducedMotionMode } from "./useReducedMotionMode";

/**
 * Theme-appropriate hover feedback for cards and structured content. The
 * profile decides the language: lift for friendly themes, a restrained
 * scale for playful ones, nothing for quiet/luxury (those keep their CSS
 * color/border hovers). Renders a plain div when motion is disabled.
 */
export function HoverCard({
  children,
  className,
  lift,
  scale,
  tap = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Hover lift in px; defaults to the profile hoverLift. */
  lift?: number;
  /** Hover scale; defaults to the profile hoverScale. */
  scale?: number;
  /** Enable a small tactile press feedback (diner buttons, poster cards). */
  tap?: boolean;
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  if (!ctx?.enabled || profile == null) {
    return <div className={className}>{children}</div>;
  }

  const hoverLift = lift ?? profile.hoverLift;
  const hoverScale = scale ?? profile.hoverScale;
  const hasHover = hoverLift > 0 || hoverScale > 1;
  if (!hasHover && !tap) {
    return <div className={className}>{children}</div>;
  }

  const whileHover: Record<string, number> = {};
  if (hoverLift > 0) whileHover.y = -hoverLift;
  if (hoverScale > 1) whileHover.scale = hoverScale;

  return (
    <motion.div
      className={className}
      whileHover={Object.keys(whileHover).length > 0 ? whileHover : undefined}
      whileTap={tap ? { scale: Math.max(hoverScale - 0.02, 0.96) } : undefined}
      transition={{ duration: Math.max(profile.revealDuration, 0.15), ease: profile.ease as unknown as [number, number, number, number] }}
    >
      {children}
    </motion.div>
  );
}
