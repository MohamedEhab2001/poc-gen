"use client";

import { motion } from "motion/react";
import type { ResolvedCta } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";
import { useReducedMotionMode } from "./useReducedMotionMode";

/**
 * CTA micro-interaction wrapper around ActionLink: a very small lift/scale
 * on hover and a tactile press on tap, sized by the theme's motion profile.
 * The anchor keeps its own CSS hover colors and never moves away from the
 * pointer — the wrapper transform stays under 3px. Static markup when
 * motion is disabled.
 */
export function MotionCta({
  cta,
  className,
  children,
  ariaLabel,
  lift,
  press = true,
}: {
  cta: ResolvedCta;
  className?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
  /** Hover lift in px; defaults to the profile hoverLift capped at 2. */
  lift?: number;
  press?: boolean;
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  const hoverLift = lift ?? Math.min(profile?.hoverLift ?? 0, 2);

  if (!ctx?.enabled || profile == null || hoverLift <= 0) {
    return (
      <ActionLink cta={cta} className={className} ariaLabel={ariaLabel}>
        {children}
      </ActionLink>
    );
  }

  return (
    <motion.span
      className="inline-block"
      whileHover={{ y: -hoverLift }}
      whileTap={press ? { y: 0, scale: 0.985 } : undefined}
      transition={{ duration: 0.18, ease: profile.ease as unknown as [number, number, number, number] }}
    >
      <ActionLink cta={cta} className={className} ariaLabel={ariaLabel}>
        {children}
      </ActionLink>
    </motion.span>
  );
}
