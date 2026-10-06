"use client";

import { motion } from "motion/react";
import type { Transition } from "motion/react";
import { useReducedMotionMode } from "./useReducedMotionMode";

/**
 * Deliberate hero copy sequence: eyebrow, headline, subheadline, and CTA row
 * each enter with the profile's step timing (CTA delay is capped at 0.6s so
 * primary actions are never meaningfully delayed). Falls back to plain
 * static markup when motion is disabled.
 */
export function HeroSequence({
  steps,
  className,
}: {
  /** Ordered hero copy blocks; null steps are skipped entirely. */
  steps: Array<React.ReactNode | null | undefined>;
  className?: string;
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  const visible = steps.filter((step): step is React.ReactNode => step != null);
  const itemClass = className ?? "";

  if (!ctx?.enabled || profile == null) {
    return (
      <>
        {visible.map((step, index) => (
          <div key={index} className={itemClass}>
            {step}
          </div>
        ))}
      </>
    );
  }

  const transition: Transition = profile.spring
    ? { type: "spring", stiffness: profile.spring.stiffness, damping: profile.spring.damping }
    : { duration: Math.max(profile.revealDuration, 0.001), ease: profile.ease as unknown as [number, number, number, number] };

  return (
    <>
      {visible.map((step, index) => (
        <motion.div
          key={index}
          className={itemClass}
          initial={{ opacity: 0, y: profile.revealDistance }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...transition, delay: Math.min(index * profile.heroStep, 0.6) }}
        >
          {step}
        </motion.div>
      ))}
    </>
  );
}
