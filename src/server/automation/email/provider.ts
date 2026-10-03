import "server-only";

import { randomUUID } from "node:crypto";

/**
 * Email provider boundary. Phase 2A ships the deterministic mock only: it
 * never opens a socket, so tests, builds, previews, and smoke runs can never
 * send real email. A production adapter (AWS SES v2 is the preferred choice)
 * implements this same interface behind OUTREACH_EMAIL_PROVIDER without any
 * service-contract change; it is deliberately NOT added in this phase so no
 * untested live-send path exists in the repository.
 */

export interface OutgoingEmail {
  toEncrypted: string;
  /** Plaintext recipient — exists only inside the provider call, never logged. */
  toAddress: string;
  subject: string;
  text: string;
  html: string;
  headers: {
    messageId: string;
    listUnsubscribe: string;
    listUnsubscribePost: boolean;
    from: string;
    replyTo: string | null;
  };
}

export type ProviderSendOutcome =
  | { status: "sent"; providerMessageId: string }
  | { status: "failed"; failureCode: string }
  | { status: "delivery_unknown" };

export interface EmailProvider {
  readonly name: string;
  send(message: OutgoingEmail): Promise<ProviderSendOutcome>;
}

/**
 * Deterministic mock: succeeds unless the recipient domain encodes a forced
 * outcome ("fail.example", "unknown.example"), enabling full failure-path
 * tests with zero network activity.
 */
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";

  async send(message: OutgoingEmail): Promise<ProviderSendOutcome> {
    const domain = message.toAddress.slice(message.toAddress.lastIndexOf("@") + 1).toLowerCase();
    if (domain === "fail.example") {
      return { status: "failed", failureCode: "mock_forced_failure" };
    }
    if (domain === "unknown.example") {
      return { status: "delivery_unknown" };
    }
    return { status: "sent", providerMessageId: `mock-${randomUUID()}` };
  }
}

export function getEmailProvider(): EmailProvider {
  // Selection is intentionally exhaustive: an unimplemented provider name is
  // rejected at configuration validation, never silently substituted here.
  return new MockEmailProvider();
}
