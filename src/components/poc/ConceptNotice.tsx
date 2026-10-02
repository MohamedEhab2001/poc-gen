import type { ResolvedBusiness } from "@/lib/poc/types";

/**
 * The discreet "unofficial website concept" notice every POC page carries.
 * Themes place it in their footer and style it through class hooks.
 */
export function ConceptNotice({
  record,
  className,
  labelClassName,
  bodyClassName,
}: {
  record: ResolvedBusiness;
  className?: string;
  labelClassName?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={className}>
      <p className={labelClassName}>{record.poc.conceptLabel}</p>
      <p className={bodyClassName}>{record.poc.disclaimer}</p>
    </div>
  );
}
