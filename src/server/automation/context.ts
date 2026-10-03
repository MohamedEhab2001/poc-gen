import "server-only";

import { parseContactKeys } from "@/lib/automation/crypto";
import { AutomationError } from "@/lib/automation/outcomes";
import { getAutomationConfig } from "./config";
import type { AutomationConfig } from "./config";
import type { ContactKeys } from "./store/contacts";

/**
 * Per-call context threaded through every operation: the authenticated
 * principal, its verified scopes, an optional run correlation id, the
 * caller-supplied idempotency key (mutating operations), an injectable
 * clock, and the public base URL used when building customer links.
 */

export interface CallContext {
  principal: string;
  scopes: readonly string[];
  runId: string | null;
  idempotencyKey: string;
  now: Date;
  baseUrl: string;
  config: AutomationConfig;
}

export interface CallAuth {
  principal: string;
  scopes: readonly string[];
  baseUrl?: string;
}

export function resolveBaseUrl(config: AutomationConfig, explicit?: string): string {
  const base = explicit ?? config.mcpPublicBaseUrl ?? process.env.SHARE_LINK_BASE_URL ?? "";
  return base.replace(/\/$/, "");
}

/** Contact encryption keys for this deployment; fails closed when missing. */
export function contactKeysOrThrow(config: AutomationConfig): ContactKeys {
  const keys = parseContactKeys(process.env.CONTACT_DATA_ENCRYPTION_KEYS);
  if (keys.size === 0 || !config.contactActiveKeyId || !keys.has(config.contactActiveKeyId)) {
    throw new AutomationError(
      "contact_keys_unconfigured",
      "Contact encryption is not configured.",
      "REJECTED",
    );
  }
  return { keys, activeKeyId: config.contactActiveKeyId };
}

export function buildCallContext(
  auth: CallAuth,
  idempotencyKey: string,
  now: Date = new Date(),
): CallContext {
  const config = getAutomationConfig();
  return {
    principal: auth.principal,
    scopes: auth.scopes,
    runId: null,
    idempotencyKey,
    now,
    baseUrl: resolveBaseUrl(config, auth.baseUrl),
    config,
  };
}
