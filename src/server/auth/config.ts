import "server-only";

/**
 * Server-only auth configuration. Resolves the active login methods from the
 * environment. Exactly one of these needs to be configured in production;
 * when none are, authentication fails closed and internal routes stay locked.
 */

export const SESSION_COOKIE = "poc_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const DEV_OPERATOR_EMAIL = "operator@poc-gen.local";

export interface AuthConfig {
  /** Google OAuth is configured (AUTH_GOOGLE_ID + AUTH_GOOGLE_SECRET). */
  googleConfigured: boolean;
  /** An operator password is configured (OPERATOR_PASSWORD). */
  passwordConfigured: boolean;
  /**
   * Email-only dev login is allowed: local development or explicit opt-in
   * via ALLOW_DEV_LOGIN=true, and only when no production-grade method is
   * configured.
   */
  devLoginAllowed: boolean;
  /** Allowed operator emails (ADMIN_EMAILS). Empty means dev default only. */
  adminEmails: string[];
  /** AUTH_SECRET is usable for signing sessions. */
  secretConfigured: boolean;
}

export function getAuthConfig(): AuthConfig {
  const googleConfigured = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
  );
  const passwordConfigured = Boolean(process.env.OPERATOR_PASSWORD);
  const isProduction = process.env.NODE_ENV === "production";
  const devLoginAllowed =
    !googleConfigured &&
    !passwordConfigured &&
    (!isProduction || process.env.ALLOW_DEV_LOGIN === "true");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const secret = process.env.AUTH_SECRET;
  const secretConfigured = Boolean(secret && secret.length >= 32);

  return {
    googleConfigured,
    passwordConfigured,
    devLoginAllowed,
    adminEmails,
    secretConfigured,
  };
}

/**
 * The HMAC key. Dev builds may fall back to a fixed dev secret (never valid
 * in production, where missing AUTH_SECRET fails closed).
 */
export function getSessionSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV !== "production") {
    return "poc-gen-development-only-session-secret";
  }
  return null;
}

export function isAllowedOperator(email: string, config = getAuthConfig()): boolean {
  const normalized = email.trim().toLowerCase();
  // An explicit allowlist is authoritative: anything not on it is rejected.
  if (config.adminEmails.length > 0) {
    return config.adminEmails.includes(normalized);
  }
  // No allowlist configured: only the gated dev operator may sign in.
  return normalized === DEV_OPERATOR_EMAIL && config.devLoginAllowed;
}
