import "server-only";

import { parseContactKeys } from "@/lib/automation/crypto";

/**
 * Automation configuration. Pure resolver (unit-testable) plus a runtime
 * accessor. Production fails closed on incomplete configuration: detailed
 * reasons go to server logs only; callers receive generic errors.
 */

export interface AutomationConfig {
  isProduction: boolean;
  automationEnabled: boolean;
  emergencyStop: boolean;
  dailyLeadLimit: number;
  minLeadScore: number;

  sendingEnabled: boolean;
  dailySendLimit: number;
  perDomainDailyLimit: number;
  maxFollowups: number;
  senderName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
  postalAddress: string | null;
  advertisementDisclosure: boolean;
  /** Only "mock" is implemented; anything else fails closed. */
  emailProvider: "mock";

  contactKeysConfigured: boolean;
  contactActiveKeyId: string | null;

  mcpPublicBaseUrl: string | null;
  mcpExpectedIssuer: string | null;
  mcpExpectedAudience: string | null;
  mcpRequiredScopes: string[];
  mcpJwksUrl: string | null;
  devBearerAllowed: boolean;
  devBearerToken: string | null;

  /** Production truth: everything the fail-closed checks need. */
  productionComplete: boolean;
  productionProblems: string[];
}

function parseBool(value: string | undefined): boolean {
  return value === "true" || value === "1" || value === "yes";
}

function parseInt_(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isFinite(parsed) && parsed >= min && parsed <= max) return parsed;
  return fallback;
}

export function resolveAutomationConfig(
  env: Record<string, string | undefined>,
  nodeEnv: string | undefined,
): AutomationConfig {
  const isProduction = nodeEnv === "production";
  const problems: string[] = [];

  // Contact encryption keys: malformed or weak keys throw immediately.
  let contactKeysConfigured = false;
  try {
    contactKeysConfigured = parseContactKeys(env.CONTACT_DATA_ENCRYPTION_KEYS).size > 0;
  } catch {
    problems.push("CONTACT_DATA_ENCRYPTION_KEYS is malformed (expected id:base64(32-byte-key) entries).");
  }
  const contactActiveKeyId = env.CONTACT_DATA_ACTIVE_KEY_ID ?? null;
  if (contactKeysConfigured && !contactActiveKeyId) {
    problems.push("CONTACT_DATA_ACTIVE_KEY_ID is required when contact keys are configured.");
  }

  const senderName = env.OUTREACH_SENDER_NAME ?? null;
  const fromEmail = env.OUTREACH_FROM_EMAIL ?? null;
  const replyTo = env.OUTREACH_REPLY_TO ?? null;
  const postalAddress = env.OUTREACH_POSTAL_ADDRESS ?? null;
  const sendingEnabled = parseBool(env.OUTREACH_SEND_ENABLED);

  if (sendingEnabled) {
    if (!senderName) problems.push("OUTREACH_SENDER_NAME is required when sending is enabled.");
    if (!fromEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fromEmail)) {
      problems.push("OUTREACH_FROM_EMAIL must be a valid address when sending is enabled.");
    }
    if (!postalAddress) problems.push("OUTREACH_POSTAL_ADDRESS is required when sending is enabled (CAN-SPAM).");
    if (!contactKeysConfigured) {
      problems.push("CONTACT_DATA_ENCRYPTION_KEYS is required when sending is enabled.");
    }
    if (env.OUTREACH_EMAIL_PROVIDER && env.OUTREACH_EMAIL_PROVIDER !== "mock") {
      problems.push(`OUTREACH_EMAIL_PROVIDER "${env.OUTREACH_EMAIL_PROVIDER}" is not implemented; only "mock" is available.`);
    }
  }

  const mcpExpectedIssuer = env.MCP_EXPECTED_ISSUER ?? null;
  const mcpExpectedAudience = env.MCP_EXPECTED_AUDIENCE ?? null;
  const mcpJwksUrl = env.MCP_JWKS_URL ?? null;
  const mcpRequiredScopes = (env.MCP_REQUIRED_SCOPES ?? "")
    .split(" ")
    .map((scope) => scope.trim())
    .filter(Boolean);
  const devBearerAllowed =
    parseBool(env.ALLOW_DEV_MCP_BEARER) && !isProduction && Boolean(env.DEV_MCP_BEARER_TOKEN);
  const devBearerToken = env.DEV_MCP_BEARER_TOKEN ?? null;

  if (isProduction) {
    // Production MCP must never be unauthenticated: either a complete OAuth
    // resource-server setup or the endpoint stays fail-closed.
    const oauthComplete = Boolean(mcpExpectedIssuer && mcpExpectedAudience && mcpJwksUrl && mcpRequiredScopes.length > 0);
    if (!oauthComplete) {
      problems.push(
        "Production MCP authentication is incomplete (MCP_EXPECTED_ISSUER, MCP_EXPECTED_AUDIENCE, MCP_JWKS_URL, MCP_REQUIRED_SCOPES); the MCP endpoint stays fail-closed.",
      );
    }
    if (parseBool(env.ALLOW_DEV_MCP_BEARER)) {
      problems.push("ALLOW_DEV_MCP_BEARER must not be enabled in production.");
    }
  }

  const config: AutomationConfig = {
    isProduction,
    automationEnabled: env.AUTOMATION_ENABLED === undefined ? true : parseBool(env.AUTOMATION_ENABLED),
    emergencyStop: parseBool(env.AUTOMATION_EMERGENCY_STOP),
    dailyLeadLimit: parseInt_(env.AUTOMATION_DAILY_LEAD_LIMIT, 100, 1, 10_000),
    minLeadScore: parseInt_(env.AUTOMATION_MIN_LEAD_SCORE, 40, 0, 100),
    sendingEnabled,
    dailySendLimit: parseInt_(env.OUTREACH_DAILY_SEND_LIMIT, 50, 1, 10_000),
    perDomainDailyLimit: parseInt_(env.OUTREACH_PER_DOMAIN_DAILY_LIMIT, 2, 1, 100),
    maxFollowups: Math.min(2, parseInt_(env.OUTREACH_MAX_FOLLOWUPS, 2, 0, 2)),
    senderName,
    fromEmail,
    replyTo,
    postalAddress,
    advertisementDisclosure: parseBool(env.OUTREACH_ADVERTISEMENT_DISCLOSURE),
    emailProvider: "mock",
    contactKeysConfigured,
    contactActiveKeyId,
    mcpPublicBaseUrl: env.MCP_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? null,
    mcpExpectedIssuer,
    mcpExpectedAudience,
    mcpRequiredScopes: mcpRequiredScopes.length > 0 ? mcpRequiredScopes : ["poc:read", "poc:write", "outreach:prepare", "outreach:send", "reports:read"],
    mcpJwksUrl,
    devBearerAllowed,
    devBearerToken,
    productionComplete: problems.length === 0,
    productionProblems: problems,
  };
  return config;
}

export function getAutomationConfig(): AutomationConfig {
  return resolveAutomationConfig(process.env, process.env.NODE_ENV);
}

/** Logs redacted production problems once at first use; never throws here. */
export function assertAutomationProductionConfig(config: AutomationConfig): void {
  if (config.isProduction && !config.productionComplete) {
    for (const problem of config.productionProblems) {
      console.error(`[automation] Production configuration problem: ${problem}`);
    }
  }
}
