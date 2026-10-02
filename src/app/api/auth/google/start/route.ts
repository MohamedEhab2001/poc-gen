import { NextResponse } from "next/server";
import { getAuthConfig } from "@/server/auth/config";
import { STATE_COOKIE, STATE_MAX_AGE, base64url, sanitizeNextPath } from "@/server/auth/oauth";

/**
 * Starts the Google OAuth flow. Redirect URI is derived from the request
 * origin so the same deployment works behind any host.
 */
export async function GET(request: Request) {
  const config = getAuthConfig();
  if (!config.googleConfigured) {
    return NextResponse.json({ error: "OAuth is not configured." }, { status: 404 });
  }

  const url = new URL(request.url);
  const nextPath = sanitizeNextPath(url.searchParams.get("next"));

  const state = base64url(crypto.getRandomValues(new Uint8Array(24)));
  const redirectUri = `${url.origin}/api/auth/google/callback`;

  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", process.env.AUTH_GOOGLE_ID!);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", `${state}.${nextPath}`);
  authorizeUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });
  return response;
}
