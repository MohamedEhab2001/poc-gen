import type { ResolvedImage } from "@/lib/poc/types";
import { SmartImage } from "@/components/poc/media/SmartImage";
import { ParallaxMedia } from "@/components/poc/motion/ParallaxMedia";
import { Reveal } from "@/components/poc/motion/Reveal";
import { MaskedImageReveal } from "@/components/poc/media/MaskedImageReveal";

/**
 * Full-bleed immersive image chapter: edge-to-edge photography with a quiet
 * caption row beneath (caption text is supplied by the theme from sourced
 * data only). Parallax is profile-driven and disabled on mobile and for
 * reduced motion via ParallaxMedia; the mask variant trades scroll-linking
 * for a print-style clip reveal where a calmer entrance suits the theme.
 */
export function ImageChapter({
  image,
  caption,
  index,
  heightClass = "h-[70vh] min-h-[420px]",
  variant = "parallax",
}: {
  image: ResolvedImage;
  /** Sourced caption content (alt or gallery title), rendered by the theme. */
  caption?: React.ReactNode;
  index?: number;
  heightClass?: string;
  variant?: "parallax" | "masked";
}) {
  const inner = (
    <div className="absolute inset-x-0 -top-[6%] h-[112%]">
      <SmartImage
        image={image}
        fill
        sizes="100vw"
        className="h-full w-full object-cover"
      />
    </div>
  );

  return (
    <figure className="relative">
      {variant === "masked" ? (
        <MaskedImageReveal from="bottom" inset="6% 10%" className={`relative w-full overflow-hidden ${heightClass}`}>
          {inner}
        </MaskedImageReveal>
      ) : (
        <ParallaxMedia className={`relative w-full overflow-hidden ${heightClass}`}>
          {inner}
        </ParallaxMedia>
      )}
      {caption ? (
        <Reveal direction="none" delay={0.1}>
          <figcaption className="poc-container flex items-baseline gap-4 pt-3">
            {index != null ? (
              <span aria-hidden="true" className="font-mono text-[11px] tracking-[0.18em] text-[var(--muted)]">
                {String(index).padStart(2, "0")}
              </span>
            ) : null}
            <span className="text-[12.5px] leading-relaxed text-[var(--muted)]">{caption}</span>
          </figcaption>
        </Reveal>
      ) : null}
    </figure>
  );
}
