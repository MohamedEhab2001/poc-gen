"use client";

import { motion } from "motion/react";
import { useReducedMotionMode } from "./useReducedMotionMode";

/**
 * Wordmark entrance. When the theme's motion profile enables typographic
 * sequences (and motion is on), each word rises out of a clipping mask in
 * sequence; otherwise the wordmark renders as plain text. The complete text
 * stays available to assistive tech via an sr-only copy while the animated
 * fragments are aria-hidden.
 */
export function AnimatedWordmark({
  text,
  className,
  wordClassName,
  delay = 0,
}: {
  text: string;
  className?: string;
  /** Classes for each clipping word slot, e.g. inline-block overflow-hidden. */
  wordClassName?: string;
  delay?: number;
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  const enabled = ctx?.enabled === true && profile != null && profile.textSequence;

  if (!enabled) {
    return <span className={className}>{text}</span>;
  }

  const words = text.split(/\s+/).filter(Boolean);
  const wordTransition = profile.spring
    ? { type: "spring" as const, stiffness: profile.spring.stiffness, damping: profile.spring.damping }
    : { duration: Math.max(profile.revealDuration, 0.001), ease: profile.ease as unknown as [number, number, number, number] };

  return (
    <span className={className}>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className={wordClassName ?? "inline-block overflow-hidden align-baseline"}>
            <motion.span
              className="inline-block"
              initial={{ y: "110%" }}
              animate={{ y: "0%" }}
              transition={{ ...wordTransition, delay: delay + index * profile.heroStep * 0.6 }}
            >
              {word}
              {index < words.length - 1 ? "\u00A0" : ""}
            </motion.span>
          </span>
        ))}
      </span>
      <span className="sr-only">{text}</span>
    </span>
  );
}
