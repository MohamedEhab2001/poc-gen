import Image from "next/image";
import type { ResolvedImage } from "@/lib/poc/types";
import { AttributionLine } from "@/components/poc/attribution/AttributionLine";
import { ConceptHeroArt } from "./ConceptHeroArt";

function provenanceLabel(image: ResolvedImage): string {
  if (image.outcome === "fallback") return "placeholder";
  if (image.outcome === "sample") return "sample";
  if (image.source === "ai_derived") return "ai derived";
  if (image.outcome === "unverified") return `${image.source} · unverified`;
  return image.source;
}

/**
 * Central image primitive. Applies focal points, marks provenance for the
 * internal preview overlay, and renders required attribution beside the
 * image. Local SVG placeholders bypass the optimizer.
 */
export function SmartImage({
  image,
  alt,
  className,
  sizes = "(min-width: 1024px) 50vw, 100vw",
  priority = false,
  fill = false,
  width,
  height,
  showAttribution = true,
  attributionClassName,
}: {
  image: ResolvedImage;
  alt?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  showAttribution?: boolean;
  attributionClassName?: string;
}) {
  const objectPosition = image.focalPoint
    ? `${Math.round(image.focalPoint.x * 100)}% ${Math.round(image.focalPoint.y * 100)}%`
    : undefined;
  const isSvg = image.url.endsWith(".svg");
  const altText = alt ?? image.alt;

  const picture = image.outcome === "fallback" && image.role === "hero" ? (
    <ConceptHeroArt image={image} className={className} fill={fill} />
  ) : isSvg ? (
    // eslint-disable-next-line @next/next/no-img-element -- optimizer skips decorative local SVG placeholders
    <img
      src={image.url}
      alt={altText}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      data-provenance={provenanceLabel(image)}
      className={className}
    />
  ) : fill ? (
    <Image
      src={image.url}
      alt={altText}
      fill
      sizes={sizes}
      priority={priority}
      data-provenance={provenanceLabel(image)}
      className={className}
      style={objectPosition ? { objectPosition } : undefined}
    />
  ) : (
    <Image
      src={image.url}
      alt={altText}
      width={width ?? image.width ?? 1200}
      height={height ?? image.height ?? 800}
      sizes={sizes}
      priority={priority}
      data-provenance={provenanceLabel(image)}
      className={className}
      style={objectPosition ? { objectPosition } : undefined}
    />
  );

  if (!showAttribution || !image.attribution) {
    return picture;
  }

  return (
    <figure className="contents">
      {picture}
      <AttributionLine attribution={image.attribution} className={attributionClassName} />
    </figure>
  );
}
