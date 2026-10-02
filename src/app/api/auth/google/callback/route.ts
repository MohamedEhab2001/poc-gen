import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, getAuthConfig, isAllowedOperator } from "@/server/auth/config";
import { STATE_COOKIE, sanitizeNextPath } from "@/server/auth/oauth";
import { createSessionToken, sessionCookieOptions } from "@/server/auth/session";

/**
 * Google OAuth callback. Validates the state cookie, exchanges the code,
 * fetches the userinfo email, and issues an operator session only for
 * allowlisted emails. Failures redirect to /login with no detail leakage.
 */
export async function GET(request: Request) {
  const config = getAuthConfig();
  if (!config.googleConfigured) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state") ?? "";
  const [state, nextRaw] = [stateParam.split(".")[0], stateParam.slice(stateParam.indexOf(".") + 1)];
  const nextPath = sanitizeNextPath(nextRaw);

  const store = await cookies();
  const expectedState = store.get(STATE_COOKIE)?.value;

  const fail = NextResponse.redirect(new URL("/login?error=oauth", request.url));
  fail.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });

  if (!code || !state || !expectedState || state !== expectedState) {
    return fail;
  }

  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!tokenResponse.ok) return fail;
    const tokens = (await tokenResponse.json()) as { access_token?: string };
    if (!tokens.access_token) return fail;

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!profileResponse.ok) return fail;
    const profile = (await profileResponse.json()) as {
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    if (
      !profile.email ||
      profile.email_verified !== true ||
      !isAllowedOperator(profile.email, config)
    ) {
      return fail;
    }

    const token = await createSessionToken({
      email: profile.email.toLowerCase(),
      name: profile.name ?? profile.email,
    });
    if (!token) return fail;

    const response = NextResponse.redirect(new URL(nextPath, request.url));
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    response.cookies.set(STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  } catch {
    return fail;
  }
}
