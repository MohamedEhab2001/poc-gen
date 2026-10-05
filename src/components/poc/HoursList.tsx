import type { ResolvedHours } from "@/lib/poc/types";

/**
 * Shared hours renderer. Themes choose placement and styling; the fallback
 * text for missing hours lives here so it stays consistent ("Hours not
 * provided" appears only where a theme decides the section is useful).
 */
export function HoursList({
  hours,
  className,
  labelClassName,
  missingLabel = "Hours not provided",
}: {
  hours: ResolvedHours;
  className?: string;
  labelClassName?: string;
  missingLabel?: string;
}) {
  if (hours.descriptions.length === 0) {
    if (hours.statusLabel) {
      return <p className={labelClassName ?? className ?? "text-sm"}>{hours.statusLabel}</p>;
    }
    return <p className={labelClassName ?? "text-sm opacity-70"}>{missingLabel}</p>;
  }
  return (
    <ul className={className}>
      {hours.descriptions.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}
