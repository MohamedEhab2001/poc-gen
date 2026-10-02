import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#101013] px-6 text-center text-zinc-200">
      <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
        404
      </p>
      <h1 className="max-w-xl text-balance text-3xl font-semibold leading-tight text-white">
        No concept lives at this address.
      </h1>
      <p className="mt-6 max-w-md text-sm leading-relaxed text-zinc-400">
        The record may have been renamed, unpublished, or the link was copied
        incompletely. Internal teams can verify the slug in the fixture set or
        the pipeline dashboard.
      </p>
      <Link
        href="/themes"
        className="mt-10 rounded-md border border-zinc-700 px-5 py-2.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
      >
        View the theme showroom
      </Link>
    </main>
  );
}
