import { AutomationError } from "./outcomes";

/**
 * Outreach safety validation. Deterministic checks applied to every
 * agent-drafted message BEFORE it is stored or sent: non-deceptive subjects,
 * the published-POC placeholder resolution, bounded claims, and the
 * compliance footer (sender identity, postal address, advertisement
 * disclosure, unsubscribe instructions).
 */

/** Patterns that make a subject look like an existing thread it is not. */
const DECEPTIVE_SUBJECT_PATTERNS: RegExp[] = [
  /^\s*(re|fw|fwd|aw|sv)\s*:/i,
  /\b(your (recent )?(order|invoice|payment|reservation|appointment|account))\b/i,
  /\b(regarding your (recent )?(complaint|request|case|ticket))\b/i,
  /\b(action required)\b/i,
  /\b(urgent|final notice|last warning)\b/i,
  /\bsubscription\b/i,
];

export function isDeceptiveSubject(subject: string): boolean {
  return DECEPTIVE_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject));
}

/** Phrasing that would misrepresent the POC as the business's official site. */
const MISREPRESENTATION_PATTERNS: RegExp[] = [
  /\b(your (new|updated|redesigned) (website|site|page))\b/i,
  /\b(we (redesigned|rebuilt|updated|launched) your (website|site))\b/i,
  /\byour (website|site) (has been|is now) (redesigned|rebuilt|updated|live)\b/i,
  /\b(official (website|site) (is|for))\b/i,
];

export function misrepresentsPoc(body: string): boolean {
  return MISREPRESENTATION_PATTERNS.some((pattern) => pattern.test(body));
}

/** The one placeholder the agent must include for the POC link. */
export const POC_LINK_PLACEHOLDER = "{{poc_link}}";

export interface OutreachPolicyConfig {
  senderName: string;
  fromEmail: string;
  replyTo: string | null;
  postalAddress: string | null;
  advertisementDisclosure: boolean;
  /** Absolute unsubscribe endpoint base (the service appends the signed token). */
  publicBaseUrl: string;
}

export interface ValidatedOutreachMessage {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  pocLinkResolved: string;
  unsubscribeUrl: string;
  footer: {
    senderName: string;
    postalAddress: boolean;
    unsubscribeUrl: boolean;
    advertisementDisclosure: boolean;
  };
}

export function validateOutreachDraft(input: {
  subject: string;
  body: string;
  pocLink: string;
  unsubscribeUrl: string;
  config: OutreachPolicyConfig;
}): ValidatedOutreachMessage {
  const { subject, body, pocLink, unsubscribeUrl, config } = input;

  if (isDeceptiveSubject(subject)) {
    throw new AutomationError(
      "deceptive_subject",
      "The subject line resembles an existing thread or a transactional notice.",
      "REJECTED",
    );
  }
  if (misrepresentsPoc(body)) {
    throw new AutomationError(
      "misrepresented_poc",
      "The body implies the POC is the business's official website.",
      "REJECTED",
    );
  }
  const placeholderCount = body.split(POC_LINK_PLACEHOLDER).length - 1;
  if (placeholderCount !== 1) {
    throw new AutomationError(
      "poc_link_placeholder",
      `The body must contain the ${POC_LINK_PLACEHOLDER} placeholder exactly once.`,
      "REJECTED",
      undefined,
      { placeholderCount },
    );
  }

  const bodyText = buildBodyText(body, pocLink, unsubscribeUrl, config);
  const bodyHtml = buildBodyHtml(bodyText);
  return {
    subject: subject.trim(),
    bodyText,
    bodyHtml,
    pocLinkResolved: pocLink,
    unsubscribeUrl,
    footer: {
      senderName: config.senderName,
      postalAddress: config.postalAddress !== null,
      unsubscribeUrl: true,
      advertisementDisclosure: config.advertisementDisclosure,
    },
  };
}

/** Appends the compliance footer and resolves the link placeholders. */
function buildBodyText(
  body: string,
  pocLink: string,
  unsubscribeUrl: string,
  config: OutreachPolicyConfig,
): string {
  const resolved = body.replaceAll(POC_LINK_PLACEHOLDER, pocLink);
  const lines = [resolved.trim(), "", "--"];
  if (config.advertisementDisclosure) {
    lines.push("This is an advertisement.");
  }
  lines.push(`${config.senderName}`);
  if (config.postalAddress) lines.push(config.postalAddress);
  lines.push("");
  lines.push(`You are receiving this one-time concept proposal because your business is listed publicly. Not interested? Unsubscribe: ${unsubscribeUrl}`);
  return lines.join("\n");
}

/** Minimal, accessible HTML: escaped text, links as anchors, line paragraphs. */
export function buildBodyHtml(bodyText: string): string {
  const escaped = escapeHtml(bodyText);
  const withLinks = escaped.replace(
    /(https:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}">${url}</a>`,
  );
  const paragraphs = withLinks
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
  return [
    "<!DOCTYPE html>",
    '<html lang="en"><body style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#1a1a1a;">',
    paragraphs,
    "</body></html>",
  ].join("\n");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Stable Message-ID for an outreach message. */
export function buildMessageId(messageKey: string, fromEmail: string): string {
  const domain = fromEmail.includes("@") ? fromEmail.slice(fromEmail.indexOf("@") + 1) : "localhost";
  return `<${messageKey}@${domain}>`;
}
