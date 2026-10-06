"use client";

import { motion } from "motion/react";
import type { Transition } from "motion/react";
import { useReducedMotionMode } from "./useReducedMotionMode";

export interface RevealCustom {
  /** Override the profile's reveal duration in seconds. */
  duration?: number;
  /** Force tween easing even when the profile uses a spring. */
  noSpring?: boolean;
  /** Extra distance multiplier (1 = profile distance). */
  distanceScale?: number;
}

/**
 * Scroll-triggered entrance driven by the active theme's motion profile.
 * Renders a plain div — no initial hidden state, no observer — when motion
 * is disabled (override `none` or prefers-reduced-motion), so content can
 * never remain hidden.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y,
  direction = "up",
  media = false,
  once = true,
  amount = 0.2,
  custom,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** Travel distance in px; defaults to the profile distance. */
  y?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  /** Media reveal: additionally settles from the profile's image scale. */
  media?: boolean;
  once?: boolean;
  /** Fraction of the element that must be visible before revealing. */
  amount?: number;
  /** Per-theme tweaks of the resolved profile timing. */
  custom?: RevealCustom;
  as?: "div" | "section" | "li" | "figure" | "article" | "span";
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  const enabled = ctx?.enabled === true && profile != null;

  if (!enabled) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const distanceScale = custom?.distanceScale ?? 1;
  const distance = (y ?? profile.revealDistance) * distanceScale;
  const initial: Record<string, number> = { opacity: 0 };
  if (direction === "up") initial.y = distance;
  if (direction === "down") initial.y = -distance;
  if (direction === "left") initial.x = distance;
  if (direction === "right") initial.x = -distance;
  if (media && profile.imageScale > 1) initial.scale = profile.imageScale;

  const animate: Record<string, number> = { opacity: 1 };
  if (direction !== "none") {
    animate.x = 0;
    animate.y = 0;
  }
  if (media && profile.imageScale > 1) animate.scale = 1;

  const useSpring = profile.spring != null && custom?.noSpring !== true;
  const transition: Transition = useSpring
    ? { type: "spring", stiffness: profile.spring!.stiffness, damping: profile.spring!.damping, delay }
    : {
        duration: Math.max(custom?.duration ?? profile.revealDuration, 0.001),
        delay,
        ease: profile.ease as unknown as [number, number, number, number],
      };

  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      className={className}
      initial={initial}
      whileInView={animate}
      viewport={{ once, amount }}
      transition={transition}
    >
      {children}
    </Tag>
  );
}
