"use client";

import { motion } from "motion/react";
import { useReducedMotionMode } from "./useReducedMotionMode";

/**
 * Profile-driven parent/child stagger pair. The group holds a single
 * viewport observer (one IntersectionObserver for the whole grid, not one
 * per child) and choreographs the children's entrance delays. Both pieces
 * render plain markup when motion is disabled.
 */
export function StaggerGroup({
  children,
  className,
  gap,
  once = true,
  amount = 0.15,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** Seconds between children; defaults to the profile stagger. */
  gap?: number;
  once?: boolean;
  amount?: number;
  /** Semantic tag so staggered lists keep valid HTML. */
  as?: "div" | "ul" | "ol" | "nav" | "section" | "dl";
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  const Tag = as === "div" ? "div" : as;
  if (!ctx?.enabled || profile == null) {
    const Plain = Tag as "div";
    return <Plain className={className}>{children}</Plain>;
  }
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap ?? profile.stagger } } }}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({
  children,
  className,
  direction = "up",
  settle = false,
  customDistance,
  style,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  direction?: "up" | "left" | "none";
  /** Settle from a tiny rotation/scale (poster stickers, memphis shapes). */
  settle?: boolean;
  customDistance?: number;
  style?: React.CSSProperties;
  /** Semantic tag so staggered lists keep valid HTML. */
  as?: "div" | "li" | "span" | "article" | "figure";
}) {
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  const Tag = as === "div" ? "div" : as;
  if (!ctx?.enabled || profile == null) {
    const Plain = Tag as "div";
    return <Plain className={className} style={style}>{children}</Plain>;
  }

  const distance = customDistance ?? profile.revealDistance;
  const initial: Record<string, number> = { opacity: 0 };
  if (direction === "up") initial.y = distance;
  if (direction === "left") initial.x = distance;
  if (settle) {
    initial.rotate = direction === "none" ? -1.5 : 2;
    initial.scale = Math.max(1 - (profile.imageScale - 1) * 0.5, 0.97);
  }
  const animate: Record<string, number> = { opacity: 1 };
  if (direction !== "none") {
    animate.x = 0;
    animate.y = 0;
  }
  if (settle) {
    animate.rotate = 0;
    animate.scale = 1;
  }

  const transition = profile.spring
    ? { type: "spring" as const, stiffness: profile.spring.stiffness, damping: profile.spring.damping }
    : { duration: Math.max(profile.revealDuration, 0.001), ease: profile.ease as unknown as [number, number, number, number] };

  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag className={className} style={style} variants={{ hidden: initial, show: { ...animate, transition } }}>
      {children}
    </MotionTag>
  );
}
