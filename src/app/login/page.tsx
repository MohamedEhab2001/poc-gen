import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { getAuthConfig } from "@/server/auth/config";

export const metadata: Metadata = {
  title: "Sign in · POC Gen",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const config = getAuthConfig();

  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/themes";

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#101013] px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-[0.24em] text-zinc-500">
          POC Gen · internal tools
        </p>
        <h1 className="mb-8 text-center text-2xl font-semibold tracking-tight text-white">
          Sign in
        </h1>
        <LoginForm config={config} nextPath={safeNext} />
        <p className="mt-8 text-center text-[11.5px] leading-relaxed text-zinc-600">
          Internal surfaces are protected. Customer concepts are shared only
          through private, expiring links.
        </p>
      </div>
    </main>
  );
}
