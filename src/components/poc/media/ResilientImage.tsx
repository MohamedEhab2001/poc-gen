"use client";

import Image from "next/image";
import type { ComponentProps, ReactNode } from "react";
import { useCallback, useState } from "react";

/** True when an <img> finished loading without decodable pixels. */
export function imageElementFailed(img: Pick<HTMLImageElement, "complete" | "naturalWidth"> | null): boolean {
  return Boolean(img && img.complete && img.naturalWidth === 0);
}

/**
 * Pure render decision, exported for tests: a failed or URL-less external
 * image shows its fallback (theme concept art) — never a broken-image icon.
 */
export function resilientView(input: { url: string; failed: boolean; hasFallback: boolean }): "image" | "fallback" | "none" {
  if (input.url.trim() !== "" && !input.failed) return "image";
  return input.hasFallback ? "fallback" : "none";
}

/**
 * External image that swaps to a server-rendered fallback (ConceptHeroArt)
 * when the provider CDN fails at render time. Errors that fire before
 * hydration are caught by the ref check on mount.
 */
export function ResilientImage({
  fallback,
  ...props
}: ComponentProps<typeof Image> & { src: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (imageElementFailed(img)) setFailed(true);
  }, []);
  const view = resilientView({ url: props.src, failed, hasFallback: fallback != null });
  if (view === "fallback") return <>{fallback}</>;
  if (view === "none") return null;
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is always provided by SmartImage
  return <Image ref={ref} {...props} onError={() => setFailed(true)} />;
}
