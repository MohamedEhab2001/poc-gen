import type { ReactNode } from "react";
import type { Attribution } from "@/lib/poc/schema";

/** Only absolute https links render; anything else stays plain text. */
function linked(text: string, href: string | null | undefined): ReactNode {
  if (!href || !href.startsWith("https://")) return text;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="underline decoration-dotted underline-offset-2 hover:decoration-solid">
      {text}
    </a>
  );
}

/**
 * Visible credit for imagery and reviews that require it. Small by design;
 * it must sit near the content it credits, never detached in a far footer.
 *
 * When the label already names the author (Unsplash: "Concept imagery ·
 * Photo by {name} on Unsplash") the name is linked in place to the author
 * URL and the trailing provider name to the attribution URL; otherwise the
 * author precedes the label ("{author} · Photo via Google Maps").
 */
export function AttributionLine({
  attribution,
  className,
}: {
  attribution: Attribution;
  className?: string;
}) {
  const { label, authorName } = attribution;
  let content: ReactNode;
  if (authorName && label.includes(authorName)) {
    const at = label.indexOf(authorName);
    const after = label.slice(at + authorName.length);
    const provider = after.match(/^(.*\bon )(.+)$/);
    content = (
      <>
        {label.slice(0, at)}
        {linked(authorName, attribution.authorUrl)}
        {provider ? (
          <>
            {provider[1]}
            {linked(provider[2]!, attribution.url)}
          </>
        ) : (
          after
        )}
      </>
    );
  } else {
    content = (
      <>
        {authorName ? <>{linked(authorName, attribution.authorUrl)} · </> : null}
        {linked(label, attribution.url)}
      </>
    );
  }
  return (
    <figcaption className={className}>
      <span>{content}</span>
    </figcaption>
  );
}
