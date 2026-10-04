import type { CSSProperties } from "react";
import type { ResolvedImage } from "@/lib/poc/types";
import { AttributionLine } from "@/components/poc/attribution/AttributionLine";
import { ConceptHeroArt } from "./ConceptHeroArt";
import { ResilientImage } from "./ResilientImage";

function provenanceLabel(image: ResolvedImage): string {
  if (image.outcome === "fallback") return "placeholder";
  if (image.outcome === "sample") return "sample";
  if (image.mediaSource === "unsplash") return "unsplash · concept imagery";
  if (image.source === "ai_derived") return "ai derived";
  if (image.outcome === "unverified") return `${image.source} · unverified`;
  return image.source;
}

/**
 * Central image primitive. Applies focal points, marks provenance for the
 * internal preview overlay, and renders required attribution beside the
 * image. Local SVG placeholders bypass the optimizer.
 *
 * Media resilience: a missing URL or an external image that fails to load
 * renders the theme concept art instead of a broken image; the provider's
 * average color is the loading backdrop; when the theme fixes a frame
 * (explicit width and height) the frame keeps that aspect ratio whatever
 * the source photo's shape, so provider images never shift layout or grow
 * excessively tall. Fill images carry their credit as a small overlay chip
 * because a caption beneath an absolutely positioned image is invisible.
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
    : "50% 50%";
  const isSvg = image.url.endsWith(".svg");
  const altText = alt ?? image.alt;
  const conceptFallback =
    image.role !== "logo" && image.fallback ? (
      <ConceptHeroArt image={image.fallback} className={className} fill={fill} />
    ) : null;

  const style: CSSProperties = { objectPosition };
  if (image.averageColor) style.backgroundColor = image.averageColor;
  if (!fill && width && height) {
    style.aspectRatio = `${width} / ${height}`;
    if (image.role === "hero") style.maxHeight = "85vh";
  }

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
    <ResilientImage
      src={image.url}
      alt={altText}
      fill
      sizes={sizes}
      priority={priority}
      data-provenance={provenanceLabel(image)}
      className={className}
      style={style}
      fallback={conceptFallback}
    />
  ) : (
    <ResilientImage
      src={image.url}
      alt={altText}
      width={width ?? image.width ?? 1200}
      height={height ?? image.height ?? 800}
      sizes={sizes}
      priority={priority}
      data-provenance={provenanceLabel(image)}
      className={className}
      style={style}
      fallback={conceptFallback}
    />
  );

  if (!showAttribution || !image.attribution) {
    return picture;
  }

  return (
    <figure className="contents">
      {picture}
      <AttributionLine
        attribution={image.attribution}
        className={fill ? "poc-media-credit" : attributionClassName}
      />
    </figure>
  );
}
