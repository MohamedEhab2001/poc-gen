"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

/**
 * Scroll-linked parallax window. The wrapped media is server-rendered and
 * passed as children; this island only adds transform motion driven by
 * useScroll, so nothing re-renders per frame. Children should be slightly
 * oversized (scale) to avoid revealing edges; reduced motion disables it.
 */
export function ParallaxImage({
  children,
  className,
  distance = 48,
}: {
  children: React.ReactNode;
  className?: string;
  distance?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [distance, -distance]);

  return (
    <div ref={ref} className={`${className ?? ""} overflow-hidden`}>
      {reduce ? (
        <div className="h-full w-full">{children}</div>
      ) : (
        <motion.div style={{ y }} className="h-full w-full will-change-transform">
          {children}
        </motion.div>
      )}
    </div>
  );
}
