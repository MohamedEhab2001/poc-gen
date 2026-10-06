"use client";

import { motion } from "motion/react";
import { useReducedMotionMode } from "./useReducedMotionMode";

/**
 * One-time entrance on mount (not viewport-linked) for elements that are
 * always in view, like the sticky mobile action bar. Runs exactly once and
 * never replays on scroll.
 */
export function EnterOnce({
  children,
  className,
  from = { opacity: 0, y: 16 },
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  from?: { x?: number; y?: number; opacity?: number };
  delay?: number;
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  if (!ctx?.enabled || profile == null) {
    return <div className={className}>{children}</div>;
  }

  const initial: Record<string, number> = { opacity: from.opacity ?? 0 };
  if (from.x != null) initial.x = from.x;
  if (from.y != null) initial.y = from.y;

  return (
    <motion.div
      className={className}
      initial={initial}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: Math.max(profile.revealDuration, 0.2), delay, ease: profile.ease as unknown as [number, number, number, number] }}
    >
      {children}
    </motion.div>
  );
}
