import type { Attribution } from "@/lib/poc/schema";

/**
 * Visible credit for imagery and reviews that require it. Small by design;
 * it must sit near the content it credits, never detached in a far footer.
 */
export function AttributionLine({
  attribution,
  className,
}: {
  attribution: Attribution;
  className?: string;
}) {
  const author = attribution.authorName ? `${attribution.authorName} · ` : "";
  return (
    <figcaption className={className}>
      <span>
        {author}
        {attribution.label}
      </span>
    </figcaption>
  );
}
