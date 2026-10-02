import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/server/auth/config";
import { verifySessionToken } from "@/server/auth/session";

/**
 * Edge middleware guard for internal surfaces. This is the outer gate; every
 * protected page and API route re-checks authorization at the server boundary
 * (defense in depth). Unauthenticated users are redirected to /login without
 * any indication of what lies behind the protected route.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  const authorized = payload !== null;

  // Note: middleware cannot consult the ADMIN_EMAILS allowlist against the
  // payload here without duplicating config; the server-side requireOperator
  // boundary performs the allowlist check.
  if (!authorized) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/themes/:path*", "/preview/:path*", "/demo/:path*", "/admin/:path*"],
};
