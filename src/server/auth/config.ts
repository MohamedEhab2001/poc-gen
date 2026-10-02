import "server-only";

/**
 * Server-only auth configuration. Resolves the active login methods from an
 * environment snapshot.
 *
 * Production rules (non-negotiable, not overridable by any env var):
 *   - Passwordless development login is impossible in production. The
 *     ALLOW_DEV_LOGIN escape hatch was removed; dev login exists only when
 *     NODE_ENV !== "production" and no stronger method is configured.
 *   - Production requires AUTH_SECRET (>= 32 chars), ADMIN_EMAILS, and
 *     Google OAuth or OPERATOR_PASSWORD. Anything less fails closed.
 *   - Unauthenticated users never receive configuration details; specifics
 *     are logged server-side only.
 */

export const SESSION_COOKIE = "poc_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const DEV_OPERATOR_EMAIL = "operator@poc-gen.local";

export interface AuthConfig {
  googleConfigured: boolean;
  passwordConfigured: boolean;
  /** Passwordless dev login: never true in production. */
  devLoginAllowed: boolean;
  adminEmails: string[];
  secretConfigured: boolean;
  isProduction: boolean;
  /** True when production has everything it needs; meaningless in dev. */
  productionAuthComplete: boolean;
}

export function resolveAuthConfig(
  env: Record<string, string | undefined>,
  nodeEnv: string | undefined,
): AuthConfig {
  const isProduction = nodeEnv === "production";
  const googleConfigured = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const passwordConfigured = Boolean(env.OPERATOR_PASSWORD);
  const devLoginAllowed = !isProduction && !googleConfigured && !passwordConfigured;

  const adminEmails = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  const secret = env.AUTH_SECRET;
  const secretConfigured = Boolean(secret && secret.length >= 32);

  const productionAuthComplete =
    !isProduction ||
    (secretConfigured && adminEmails.length > 0 && (googleConfigured || passwordConfigured));

  return { googleConfigured, passwordConfigured, devLoginAllowed, adminEmails, secretConfigured, isProduction, productionAuthComplete };
}

export function getAuthConfig(): AuthConfig {
  return resolveAuthConfig(process.env, process.env.NODE_ENV);
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

/**
 * The ONLY shape of auth configuration that may cross the server/client
 * boundary (into LoginForm). Booleans only: never operator emails, secret
 * state, environment values, or configuration completeness details.
 */
export interface PublicAuthUiConfig {
  googleEnabled: boolean;
  passwordEnabled: boolean;
  devLoginEnabled: boolean;
  signInAvailable: boolean;
  isProduction: boolean;
}

export function toPublicAuthUiConfig(config: AuthConfig): PublicAuthUiConfig {
  return {
    googleEnabled: config.googleConfigured,
    passwordEnabled: config.passwordConfigured,
    devLoginEnabled: config.devLoginAllowed,
    signInAvailable:
      config.googleConfigured || config.passwordConfigured || config.devLoginAllowed,
    isProduction: config.isProduction,
  };
}
