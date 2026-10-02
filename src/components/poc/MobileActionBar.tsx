import type { ResolvedBusiness } from "@/lib/poc/types";
import { ActionLink } from "@/components/poc/ActionLink";

/**
 * Mobile sticky action bar for the highest-value available actions. Styled
 * entirely from theme CSS variables so it adopts each theme's language.
 * Respects safe-area insets; hidden from tablet up where themes render
 * inline CTAs.
 */
export function MobileActionBar({ record }: { record: ResolvedBusiness }) {
  const actions = record.cta.mobile;
  if (actions.length === 0) return null;

  return (
    <>
      <div aria-hidden="true" className="h-20 md:hidden" />
      <nav
        aria-label="Quick actions"
        className="fixed inset-x-0 bottom-0 z-40 flex md:hidden"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {actions.map((cta, index) => (
          <ActionLink
            key={cta.href + cta.label}
            cta={cta}
            className={`flex min-h-[56px] flex-1 items-center justify-center px-4 text-center text-sm font-semibold tracking-wide transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.98] ${
              index === 0 ? "" : "border-l"
            }`}
          >
            <span
              style={
                index === 0
                  ? { color: "var(--primary)" }
                  : { color: "var(--text)" }
              }
            >
              {cta.label}
            </span>
          </ActionLink>
        ))}
      </nav>
    </>
  );
}
