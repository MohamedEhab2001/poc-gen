import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, getAuthConfig, isAllowedOperator } from "@/server/auth/config";
import { createSessionToken, sessionCookieOptions } from "@/server/auth/session";
import { clientKeyFromHeaders, rateLimit } from "@/server/security/rate-limit";

const bodySchema = z.object({
  email: z.string().email().max(200),
  password: z.string().max(200).optional(),
});

const GENERIC_FAILURE = { error: "Sign in failed." } as const;

/**
 * Operator login. Every failure returns the same generic 401 with no
 * configuration details; specifics (missing AUTH_SECRET, incomplete
 * production auth) are logged server-side only. Password comparison is
 * constant-time and attempts are rate-limited per IP.
 */
export async function POST(request: Request) {
  const config = getAuthConfig();

  const limit = rateLimit(`login:${clientKeyFromHeaders(request.headers)}`, 8, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  if (!config.productionAuthComplete) {
    console.error(
      "[auth] Production authentication is incomplete. Required: AUTH_SECRET (>= 32 chars), ADMIN_EMAILS, and Google OAuth or OPERATOR_PASSWORD.",
    );
    return NextResponse.json(GENERIC_FAILURE, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (!isAllowedOperator(email, config)) {
    return NextResponse.json(GENERIC_FAILURE, { status: 401 });
  }

  if (config.passwordConfigured) {
    const expected = process.env.OPERATOR_PASSWORD ?? "";
    const provided = parsed.data.password ?? "";
    const { timingSafeEqualString } = await import("@/server/security/timing");
    if (!timingSafeEqualString(provided, expected)) {
      return NextResponse.json(GENERIC_FAILURE, { status: 401 });
    }
  } else if (!config.devLoginAllowed) {
    return NextResponse.json(GENERIC_FAILURE, { status: 401 });
  }

  const token = await createSessionToken({ email, name: email });
  if (!token) {
    console.error("[auth] createSessionToken returned null: AUTH_SECRET missing or too short.");
    return NextResponse.json(GENERIC_FAILURE, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
