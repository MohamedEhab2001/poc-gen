/**
 * ONE-OFF controlled EmailJS test send. Sends EXACTLY ONE message, only
 * when every safety gate is satisfied:
 *
 *   npm run automation:test-email -- --to=you@yourdomain.com --confirm-live-send
 *
 * Gates (in order):
 *   1. --to=<address>  : an explicit recipient YOU CONTROL.
 *   2. --confirm-live-send : the explicit live-send confirmation flag.
 *   3. EMAILJS_DRY_RUN=false : refuses to run while dry-run is on (default).
 *   4. Complete EMAILJS_* configuration (service, template, public+private key).
 *
 * It reuses the production EmailJsProvider (including the database-backed
 * rate throttle) — no duplicated sending logic. The recipient address and
 * secret configuration are never printed.
 */

import "dotenv/config";

function fail(reason: string): never {
  console.error(`[test-email] REFUSED: ${reason}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const toArg = args.find((arg) => arg.startsWith("--to="))?.slice("--to=".length).trim() ?? "";
  const confirmed = args.includes("--confirm-live-send");

  // 1. Explicit, plausible recipient supplied at runtime.
  if (!toArg || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(toArg)) {
    fail("provide the operator-controlled recipient as --to=you@yourdomain.com");
  }
  // 2. Explicit confirmation.
  if (!confirmed) {
    fail("add --confirm-live-send (the recipient MUST be an address you control)");
  }
  // 3. Dry run must be explicitly disabled.
  const dryRun = process.env.EMAILJS_DRY_RUN;
  if (dryRun !== "false") {
    fail('set EMAILJS_DRY_RUN=false explicitly (live send is otherwise refused)');
  }
  // 4. Complete configuration.
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  const missing = [
    ["EMAILJS_SERVICE_ID", serviceId],
    ["EMAILJS_TEMPLATE_ID", templateId],
    ["EMAILJS_PUBLIC_KEY", publicKey],
    ["EMAILJS_PRIVATE_KEY", privateKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    fail(`missing configuration: ${missing.join(", ")}`);
  }

  // The provider's live path reserves a rate slot through the database; any
  // local database works for a manual one-off (the slot table is neutral).
  if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }

  const { EmailJsProvider } = await import("@/server/automation/email/emailjs");
  const { validateOutreachDraft, buildMessageId } = await import("@/lib/automation/outreach");

  const base = (process.env.MCP_PUBLIC_BASE_URL ?? process.env.SHARE_LINK_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const senderName = process.env.OUTREACH_SENDER_NAME ?? "POC Gen";
  const validated = validateOutreachDraft({
    subject: "Test: your website concept email setup",
    body:
      "Hi there — this is a one-off TEST of the outreach email template. " +
      "The real emails look exactly like this one and link to an unofficial homepage mockup: {{poc_link}}",
    // Deliberately non-functional test links (this message reaches no lead).
    pocLink: `${base}/p/TEST-NOT-A-REAL-LINK`,
    unsubscribeUrl: `${base}/api/unsubscribe?k=TEST-NOT-A-REAL-LINK`,
    config: {
      businessName: "Test Business",
      senderName,
      senderIntro: process.env.OUTREACH_SENDER_INTRO ?? "I build practical websites for small businesses.",
      senderLinkedInUrl: process.env.OUTREACH_SENDER_LINKEDIN_URL ?? "https://www.linkedin.com/in/test-profile",
      fromEmail: process.env.OUTREACH_FROM_EMAIL ?? "test@poc-gen.invalid",
      replyTo: process.env.OUTREACH_REPLY_TO ?? null,
      postalAddress: process.env.OUTREACH_POSTAL_ADDRESS ?? null,
      advertisementDisclosure: process.env.OUTREACH_ADVERTISEMENT_DISCLOSURE === "true",
      publicBaseUrl: base,
    },
  });

  const provider = new EmailJsProvider({
    serviceId: serviceId!,
    templateId: templateId!,
    publicKey: publicKey!,
    privateKey: privateKey!,
    requestTimeoutMs: Number.parseInt(process.env.EMAILJS_REQUEST_TIMEOUT_MS ?? "10000", 10) || 10_000,
    dryRun: false,
  });

  console.log("[test-email] sending exactly one test message through the EmailJS provider…");
  const messageKey = `test-${Date.now()}`;
  const outcome = await provider.send({
    toEncrypted: "manual-test",
    toAddress: toArg,
    subject: validated.subject,
    text: validated.bodyText,
    html: validated.bodyHtml,
    templateParams: {
      business_name: "Test Business",
      sender_name: senderName,
      sender_intro: process.env.OUTREACH_SENDER_INTRO ?? "I build practical websites for small businesses.",
      sender_linkedin_url: process.env.OUTREACH_SENDER_LINKEDIN_URL ?? "https://www.linkedin.com/in/test-profile",
      preview_text: "A one-off test of your outreach email template",
      poc_url: `${base}/p/TEST-NOT-A-REAL-LINK`,
      postal_address: process.env.OUTREACH_POSTAL_ADDRESS ?? "",
      advertisement_disclosure: process.env.OUTREACH_ADVERTISEMENT_DISCLOSURE === "true" ? "This is an advertisement." : "",
    },
    headers: {
      messageId: buildMessageId(messageKey, process.env.OUTREACH_FROM_EMAIL ?? "test@poc-gen.invalid"),
      listUnsubscribe: `<${base}/api/unsubscribe?k=TEST-NOT-A-REAL-LINK>`,
      listUnsubscribePost: true,
      from: `${senderName} <${process.env.OUTREACH_FROM_EMAIL ?? "test@poc-gen.invalid"}>`,
      replyTo: process.env.OUTREACH_REPLY_TO ?? null,
    },
  });

  if (outcome.status === "sent") {
    console.log(`[test-email] SENT (provider reference: ${outcome.providerMessageId}). Check the inbox you control.`);
    console.log("[test-email] reminder: set EMAILJS_DRY_RUN=true and OUTREACH_SEND_ENABLED=false again now.");
  } else if (outcome.status === "failed") {
    fail(`provider rejected the send (failureCode=${outcome.failureCode}) — check the template dashboard mapping and keys`);
  } else {
    fail("outcome was delivery_unknown (timeout or network uncertainty) — do not blindly re-run; check the mailbox first");
  }
}

main().catch((error) => {
  console.error(`[test-email] FAILED: ${error instanceof Error ? error.name : "unknown error"}`);
  process.exit(1);
});
