import { NextResponse } from "next/server";
import { z } from "zod";
import { SESSION_COOKIE, getAuthConfig, isAllowedOperator } from "@/server/auth/config";
import { createSessionToken, sessionCookieOptions } from "@/server/auth/session";
import { clientKeyFromHeaders, rateLimit } from "@/server/security/rate-limit";

const bodySchema = z.object({
  email: z.string().email().max(200),
  password: z.string().max(200).optional(),
});

export async function POST(request: Request) {
  const config = getAuthConfig();

  const limit = rateLimit(`login:${clientKeyFromHeaders(request.headers)}`, 8, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();

  if (!isAllowedOperator(email, config)) {
    return NextResponse.json({ error: "Sign in failed." }, { status: 401 });
  }

  if (config.passwordConfigured) {
    const expected = process.env.OPERATOR_PASSWORD ?? "";
    const provided = parsed.data.password ?? "";
    const { timingSafeEqualString } = await import("@/server/security/timing");
    if (!timingSafeEqualString(provided, expected)) {
      return NextResponse.json({ error: "Sign in failed." }, { status: 401 });
    }
  } else if (!config.devLoginAllowed) {
    return NextResponse.json({ error: "Sign in failed." }, { status: 401 });
  }

  const token = await createSessionToken({ email, name: email });
  if (!token) {
    return NextResponse.json(
      { error: "Server auth is not configured (AUTH_SECRET missing)." },
      { status: 500 },
    );
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return response;
}
