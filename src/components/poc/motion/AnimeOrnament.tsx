"use client";

import { useEffect, useRef } from "react";
import { useReducedMotionMode } from "./useReducedMotionMode";

/**
 * Anime.js ornament runner for decorative, timeline-based effects that
 * Framer Motion is not the right abstraction for:
 *
 *   variant="draw"    — SVG paths marked data-anime="draw" stroke-draw in
 *                       sequence (deco sunbursts, botanical linework,
 *                       squiggle dividers). The SVG is fully rendered in the
 *                       SSR HTML; Anime.js only re-draws it after hydration.
 *   variant="flicker" — a single short flicker-settle on the wrapped
 *                       decorative element (neon sign entry), replaced by a
 *                       plain settle when the profile intensity is low.
 *
 * Ownership: Anime.js owns stroke-dash drawing and one-shot flicker opacity
 * on decorative elements only. It never touches layout, React-driven
 * transitions, or content. Everything runs inside a createScope rooted at
 * this element (no global selectors), is lazily imported, and is reverted
 * on cleanup so no animation outlives the component.
 */
export function AnimeOrnament({
  variant,
  children,
  className,
  durationMs = 1400,
  staggerMs = 90,
  delayMs = 0,
}: {
  variant: "draw" | "flicker";
  children: React.ReactNode;
  className?: string;
  /** Base timeline duration in ms; scaled by the profile's ornament intensity. */
  durationMs?: number;
  /** Delay between successive draw targets in ms. */
  staggerMs?: number;
  delayMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ctx = useReducedMotionMode();
  const profile = ctx?.profile;
  const ornament = profile?.ornament ?? 0;
  const enabled = ctx?.enabled === true && ornament > 0;

  useEffect(() => {
    if (!enabled || !ref.current) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const { animate, createScope, stagger, svg } = await import("animejs");
      if (disposed || !ref.current) return;
      const root = ref.current;

      const scope = createScope({ root }).add(() => {
        const duration = Math.round(durationMs * (0.55 + 0.45 * ornament));

        if (variant === "draw") {
          const paths = root.querySelectorAll<SVGGeometryElement>('[data-anime="draw"]');
          if (paths.length === 0) return;
          animate(svg.createDrawable(paths), {
            draw: ["0 0", "0 1"],
            duration,
            delay: stagger(Math.round(staggerMs * (0.5 + 0.5 * ornament))),
            ease: "inOutQuad",
          });
          return;
        }

        // Flicker: reserved for expressive profiles; subtler ones settle once.
        const target = root.querySelector<HTMLElement>('[data-anime="flicker"]');
        if (!target) return;
        if (ornament >= 0.6) {
          animate(target, {
            opacity: [0, 1, 0.35, 1, 0.7, 1],
            duration: Math.min(duration, 1100),
            delay: delayMs,
            ease: "linear",
          });
        } else {
          animate(target, {
            opacity: [0, 1],
            duration: Math.min(duration, 600),
            delay: delayMs,
            ease: "outQuad",
          });
        }
      });

      cleanup = () => scope.revert();
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [enabled, variant, durationMs, staggerMs, delayMs, ornament]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
