"use client";

import { motion } from "motion/react";
import { useReducedMotionMode } from "@/components/poc/motion/useReducedMotionMode";

/**
 * Editorial image reveal: the frame's clip-path opens as it enters the
 * viewport (inset collapsing to zero), so photography feels printed into the
 * page rather than dropped in. Runs once, transform-only (clip-path), and
 * renders a plain frame when motion is disabled. Themes control the frame's
 * shape entirely through className (aspect ratio, radius, arches).
 */
export function MaskedImageReveal({
  children,
  className,
  delay = 0,
  inset = "12% 8%",
  from = "left",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Starting clip inset as "<vertical> <horizontal>" percentages. */
  inset?: string;
  /** Edge the mask opens from. */
  from?: "left" | "bottom";
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  if (!ctx?.enabled || profile == null) {
    return <div className={className}>{children}</div>;
  }

  const [y = "12%", x = "8%"] = inset.split(/\s+/);
  const full = "inset(0% 0% 0% 0%)";
  const hidden =
    from === "bottom"
      ? `inset(0% 0% ${Math.round(parseFloat(y) * 2)}% 0%)`
      : `inset(0% ${Math.round(parseFloat(x) * 2)}% 0% ${Math.round(parseFloat(x) * 2)}%)`;

  return (
    <motion.div
      className={className}
      initial={{ clipPath: hidden, opacity: 0.4 }}
      whileInView={{ clipPath: full, opacity: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{
        clipPath: { duration: Math.max(profile.revealDuration * 1.3, 0.001), delay, ease: profile.ease as unknown as [number, number, number, number] },
        opacity: { duration: Math.max(profile.revealDuration * 0.8, 0.001), delay },
      }}
    >
      {children}
    </motion.div>
  );
}
