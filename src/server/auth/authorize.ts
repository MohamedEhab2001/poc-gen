import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isAllowedOperator } from "./config";
import { verifySessionToken } from "./session";

export interface Operator {
  email: string;
  name: string;
}

/**
 * Returns the authenticated operator for the current request, or null.
 * Callers decide between redirecting (pages) and returning 401/404 (routes).
 */
export async function getOperator(): Promise<Operator | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;
  if (!isAllowedOperator(payload.email)) return null;
  return { email: payload.email, name: payload.name || payload.email };
}

/**
 * Server-boundary guard for internal pages. Redirects to the login page with
 * a return path; never reveals whether any specific record exists.
 */
export async function requireOperator(nextPath: string): Promise<Operator> {
  const operator = await getOperator();
  if (!operator) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return operator;
}
