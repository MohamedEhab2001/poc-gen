import type { ResolvedCta } from "@/lib/poc/types";

/**
 * Renders a CTA with correct protocol behavior: tel and mailto stay in-app,
 * external links open in a new tab with explicit rel. Themes style it via
 * className; the semantics live here.
 */
export function ActionLink({
  cta,
  className,
  children,
  ariaLabel,
}: {
  cta: ResolvedCta;
  className?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
}) {
  const external = cta.kind === "order" || cta.kind === "reserve" || cta.kind === "directions" || cta.external;
  return (
    <a
      href={cta.href}
      className={className}
      aria-label={ariaLabel}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children ?? cta.label}
    </a>
  );
}
