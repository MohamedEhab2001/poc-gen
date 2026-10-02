"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Parent/child stagger pair. Both pieces must live in the same client tree,
 * so this file exports both; themes nest StaggerItem inside StaggerGroup.
 * Spring physics by default, softened to a plain fade under reduced motion.
 */
export function StaggerGroup({
  children,
  className,
  gap = 0.08,
}: {
  children: React.ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={
        reduce
          ? { hidden: { opacity: 0 }, show: { opacity: 1 } }
          : {
              hidden: { opacity: 0, y: 26, scale: 0.985 },
              show: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { type: "spring", stiffness: 180, damping: 22 },
              },
            }
      }
    >
      {children}
    </motion.div>
  );
}
