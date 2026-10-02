"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AuthConfig } from "@/server/auth/config";

export function LoginForm({
  config,
  nextPath,
}: {
  config: AuthConfig;
  nextPath: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const noMethod = !config.googleConfigured && !config.passwordConfigured && !config.devLoginAllowed;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Sign in failed.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Sign in failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (noMethod) {
    if (config.isProduction) {
      // No configuration details for unauthenticated visitors; the server
      // log carries the actionable message.
      return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-6 text-[13px] leading-relaxed text-zinc-400">
          <p className="font-semibold text-zinc-200">Sign in is unavailable.</p>
          <p className="mt-2">Contact the operator who manages this deployment.</p>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-6 text-[13px] leading-relaxed text-zinc-400">
        <p className="mb-3 font-semibold text-zinc-200">Authentication is not configured.</p>
        <p>
          Set <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">AUTH_SECRET</code>{" "}
          plus one login method (
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">AUTH_GOOGLE_ID</code>/
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">AUTH_GOOGLE_SECRET</code>{" "}
          or{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">OPERATOR_PASSWORD</code>
          ) and{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300">ADMIN_EMAILS</code> to
          enable sign-in. See <code className="text-zinc-300">.env.example</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {config.googleConfigured ? (
        <a
          href={`/api/auth/google/start?next=${encodeURIComponent(nextPath)}`}
          className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-5 py-3 text-[14px] font-semibold text-zinc-900 transition-transform hover:-translate-y-0.5"
        >
          Continue with Google
        </a>
      ) : null}

      {config.googleConfigured && (config.passwordConfigured || config.devLoginAllowed) ? (
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
          <span className="h-px flex-1 bg-zinc-800" /> or <span className="h-px flex-1 bg-zinc-800" />
        </div>
      ) : null}

      {config.passwordConfigured || config.devLoginAllowed ? (
        <form onSubmit={submit} className="space-y-3">
          <label className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
            Operator email
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-[14px] font-normal normal-case tracking-normal text-zinc-100 outline-none focus:border-zinc-400"
            />
          </label>
          {config.passwordConfigured ? (
            <label className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              Password
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-[14px] font-normal normal-case tracking-normal text-zinc-100 outline-none focus:border-zinc-400"
              />
            </label>
          ) : null}
          {config.devLoginAllowed && !config.passwordConfigured ? (
            <p className="text-[11.5px] leading-relaxed text-zinc-600">
              Development mode: the allowlisted operator email signs in without
              a password. This is impossible in production, which requires
              OAuth or an operator password.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-[13px] text-red-400">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-zinc-100 px-5 py-3 text-[14px] font-semibold text-zinc-900 transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
