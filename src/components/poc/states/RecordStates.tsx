import Link from "next/link";

/**
 * Safe states for records that must not render as an active public POC.
 * Deliberately neutral chrome: these screens belong to the platform, not to
 * any theme.
 */
function StateShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#101013] px-6 py-24 text-center text-zinc-200">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
        {eyebrow}
      </p>
      <h1 className="max-w-xl text-balance text-3xl font-semibold leading-tight text-white">
        {title}
      </h1>
      <div className="mt-6 max-w-md space-y-3 text-sm leading-relaxed text-zinc-400">
        {children}
      </div>
      <Link
        href="/themes"
        className="mt-10 rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
      >
        View the theme showroom
      </Link>
    </main>
  );
}

export function ExpiredState({ conceptLabel }: { conceptLabel: string }) {
  return (
    <StateShell eyebrow={conceptLabel} title="This website concept is no longer available.">
      <p>
        The preview window for this concept has ended. If you are the business
        owner and would like to see it again, reply to the outreach email you
        received and we will refresh it.
      </p>
    </StateShell>
  );
}

export function PermanentlyClosedState({
  businessName,
  address,
}: {
  businessName: string;
  address: string | null;
}) {
  return (
    <StateShell eyebrow="Listing note" title={`${businessName} has permanently closed.`}>
      <p>
        This page was prepared as a private website concept before the closure.
        It is shown only in this informational form out of respect for the
        business{address ? ` at ${address}` : ""}.
      </p>
    </StateShell>
  );
}

export function InvalidRecordState({ slug }: { slug: string }) {
  return (
    <StateShell eyebrow="Record error" title="This record could not be rendered safely.">
      <p>
        The record <span className="font-mono text-zinc-300">{slug}</span> failed
        validation at the repository boundary. Internal teams can inspect the
        server logs for the exact schema issues.
      </p>
    </StateShell>
  );
}
