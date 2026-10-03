import { randomBytes } from "node:crypto";

/**
 * Smoke environment setup. Safe by construction:
 * - refuses to run when NODE_ENV=production;
 * - requires an explicit --database URL or TEST_DATABASE_URL (never a bare
 *   production DATABASE_URL);
 * - generates ephemeral contact-encryption material in-process (never
 *   written to disk or the repository);
 * - enables sending with the MOCK provider only (MockEmailProvider is the
 *   only implemented adapter; no socket is ever opened).
 */

export function randomKey(): string {
  return randomBytes(32).toString("base64");
}

export function configureSmokeEnvironment(argv: string[]): string {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The smoke command must never run with NODE_ENV=production.");
  }
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";

  const databaseArg = argv.find((arg) => arg.startsWith("--database="));
  const explicit = databaseArg?.slice("--database=".length);
  const dbUrl = explicit ?? process.env.TEST_DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "Provide a disposable database: --database=postgres://... or set TEST_DATABASE_URL.",
    );
  }
  if (!dbUrl.startsWith("postgres://") && !dbUrl.startsWith("postgresql://")) {
    throw new Error("The smoke database URL must be a postgres:// or postgresql:// URL.");
  }
  process.env.TEST_DATABASE_URL = dbUrl;

  const keyId = "smoke-key-1";
  process.env.CONTACT_DATA_ENCRYPTION_KEYS = `${keyId}:${randomKey()}`;
  process.env.CONTACT_DATA_ACTIVE_KEY_ID = keyId;
  process.env.AUTOMATION_ENABLED = "true";
  process.env.AUTOMATION_EMERGENCY_STOP = "false";
  process.env.OUTREACH_SEND_ENABLED = "true";
  process.env.OUTREACH_EMAIL_PROVIDER = "mock";
  process.env.OUTREACH_SENDER_NAME = "POC Gen Smoke";
  process.env.OUTREACH_FROM_EMAIL = "smoke@poc-gen.invalid";
  process.env.OUTREACH_REPLY_TO = "smoke@poc-gen.invalid";
  process.env.OUTREACH_POSTAL_ADDRESS = "1 Smoke Test Way, Portland, OR 97209";
  process.env.OUTREACH_ADVERTISEMENT_DISCLOSURE = "true";
  return dbUrl;
}
