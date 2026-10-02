import type { ResolvedBusiness } from "@/lib/poc/types";

/**
 * Temporary-closure banner rendered above the theme by the demo and preview
 * routes. Keeps the notice consistent across all ten themes.
 */
export function ClosureBanner({ record }: { record: ResolvedBusiness }) {
  if (record.identity.businessStatus !== "temporarily_closed") return null;
  return (
    <div role="status" className="bg-amber-100 px-4 py-3 text-center text-sm text-amber-950">
      <strong className="font-semibold">
        {record.hours?.statusLabel ?? "Temporarily closed"}.
      </strong>{" "}
      {record.announcement ?? "Please check back for reopening details."}
    </div>
  );
}
