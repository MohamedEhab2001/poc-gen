"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useMediaQuery, useReducedMotionMode } from "./useReducedMotionMode";

/**
 * Scroll-linked parallax window driven by the theme's motion profile.
 * The wrapped media is server-rendered and passed as children; this island
 * only adds a transform driven by useScroll, so nothing re-renders per
 * frame. Children should be slightly oversized (negative translateY) to
 * avoid revealing edges. Small screens always use the profile's mobile
 * distance (0 for most characters), and the whole effect is disabled for
 * reduced motion, motion override `none`, and non-scroll-linked profiles.
 */
export function ParallaxMedia({
  children,
  className,
  distance,
}: {
  children: React.ReactNode;
  className?: string;
  /** Desktop parallax distance in px; defaults to the profile distance. */
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  const isMobile = useMediaQuery("(max-width: 767px)");

  const resolvedDistance = isMobile
    ? profile?.parallaxMobile ?? 0
    : distance ?? profile?.parallax ?? 0;
  const active =
    ctx?.enabled === true &&
    profile != null &&
    profile.scrollLinked &&
    resolvedDistance > 0;

  const { scrollYProgress } = useScroll(
    active ? { target: ref, offset: ["start end", "end start"] } : undefined,
  );
  const y = useTransform(scrollYProgress, [0, 1], [resolvedDistance, -resolvedDistance]);

  return (
    <div ref={ref} className={`${className ?? ""} overflow-hidden`}>
      {active ? (
        <motion.div style={{ y }} className="h-full w-full will-change-transform">
          {children}
        </motion.div>
      ) : (
        <div className="h-full w-full">{children}</div>
      )}
    </div>
  );
}
