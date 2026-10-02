"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * A horizontal rule that draws itself in from the left when it enters the
 * viewport. Used for deco gold rules and lookbook hairlines.
 */
export function LineGrow({
  className,
  delay = 0,
  origin = "left",
}: {
  className?: string;
  delay?: number;
  origin?: "left" | "center" | "right";
}) {
  const reduce = useReducedMotion();
  const xOrigin = origin === "center" ? "50%" : origin === "right" ? "100%" : "0%";
  return (
    <motion.div
      aria-hidden="true"
      className={className}
      style={{ transformOrigin: `${xOrigin} 50%` }}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
    />
  );
}
