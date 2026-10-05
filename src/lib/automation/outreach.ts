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

/** Cold-email phrasing that commonly reads as spammy or invasive. */
const SPAMMY_SUBJECT_PATTERNS: RegExp[] = [
  /\bprivate (website )?concept\b/i,
  /\bexclusive (website )?(offer|concept)\b/i,
  /\bfree (website|site)\b/i,
];

const INTRUSIVE_BODY_PATTERNS: RegExp[] = [
  /\bprivate (website )?concept\b/i,
  /\bi found (you|your|the business).*\b(through|via|on)\b/i,
  /\bi researched (you|your business)\b/i,
  /\bwhile researching (you|your business)\b/i,
  /\bi(?:'ve| have) been following (you|your business)\b/i,
];

export function isDeceptiveSubject(subject: string): boolean {
  return DECEPTIVE_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject));
}

export function isSpammySubject(subject: string): boolean {
  return SPAMMY_SUBJECT_PATTERNS.some((pattern) => pattern.test(subject));
}

export function hasIntrusiveDiscoveryLanguage(body: string): boolean {
  return INTRUSIVE_BODY_PATTERNS.some((pattern) => pattern.test(body));
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
  businessName: string;
  senderName: string;
  senderIntro: string;
  senderLinkedInUrl: string;
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
  if (isSpammySubject(subject)) {
    throw new AutomationError(
      "spammy_subject",
      "The subject uses salesy or suspicious cold-email phrasing.",
      "REJECTED",
    );
  }
  if (hasIntrusiveDiscoveryLanguage(body)) {
    throw new AutomationError(
      "intrusive_outreach_language",
      "The body uses invasive discovery language or calls the mockup private.",
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
  const bodyHtml = buildOutreachBodyHtml(body, pocLink, unsubscribeUrl, config);
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
  const resolved = stripOpeningGreeting(body.replaceAll(POC_LINK_PLACEHOLDER, pocLink));
  const lines = [
    `Hi ${config.businessName} team,`,
    "",
    config.senderIntro,
    "",
    resolved,
    "",
    "If the mockup is useful, just reply to this email.",
    "",
    `— ${config.senderName}`,
    `LinkedIn: ${config.senderLinkedInUrl}`,
    "",
    "--",
  ];
  if (config.advertisementDisclosure) {
    lines.push("This is an advertisement.");
  }
  lines.push(`${config.senderName}`);
  if (config.postalAddress) lines.push(config.postalAddress);
  lines.push("");
  lines.push(`You are receiving this one-time concept proposal because your business is listed publicly. Not interested? Unsubscribe: ${unsubscribeUrl}`);
  return lines.join("\n");
}

function stripOpeningGreeting(body: string): string {
  const lines = body.trim().split("\n");
  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);
  if (
    firstContentLine >= 0 &&
    /^(hi|hello|hey)\b.{0,100}[,!]?$/i.test(lines[firstContentLine]!.trim())
  ) {
    lines.splice(firstContentLine, 1);
  }
  return lines.join("\n").trim();
}

function buildOutreachBodyHtml(
  body: string,
  pocLink: string,
  unsubscribeUrl: string,
  config: OutreachPolicyConfig,
): string {
  const resolved = stripOpeningGreeting(body.replaceAll(POC_LINK_PLACEHOLDER, pocLink));
  const content = renderParagraphs(resolved, { pocLink, unsubscribeUrl, linkedInUrl: config.senderLinkedInUrl });
  const disclosure = config.advertisementDisclosure ? "<p>This is an advertisement.</p>" : "";
  const address = config.postalAddress ? `<p>${escapeHtml(config.postalAddress)}</p>` : "";
  return [
    `<p class="outreach-greeting">Hi ${escapeHtml(config.businessName)} team,</p>`,
    `<p class="outreach-intro">${escapeHtml(config.senderIntro)}</p>`,
    `<div class="outreach-message">${content}</div>`,
    '<p class="outreach-close">If the mockup is useful, just reply to this email.</p>',
    '<div class="outreach-signature">',
    `<p>— ${escapeHtml(config.senderName)}</p>`,
    `<p><a href="${escapeHtml(config.senderLinkedInUrl)}">LinkedIn profile</a></p>`,
    "</div>",
    '<div class="outreach-compliance">',
    disclosure,
    address,
    `<p>You are receiving this one-time website mockup because your business contact is listed publicly. <a href="${escapeHtml(unsubscribeUrl)}">Unsubscribe</a></p>`,
    "</div>",
  ].join("\n");
}

/** Minimal, accessible HTML: escaped text, links as anchors, line paragraphs. */
export function buildBodyHtml(bodyText: string): string {
  return renderParagraphs(bodyText);
}

function renderParagraphs(
  bodyText: string,
  links?: { pocLink: string; unsubscribeUrl: string; linkedInUrl: string },
): string {
  const tokens = {
    poc: "__POC_LINK_TOKEN__",
    unsubscribe: "__UNSUBSCRIBE_LINK_TOKEN__",
    linkedin: "__LINKEDIN_LINK_TOKEN__",
  };
  let tokenized = bodyText;
  if (links) {
    tokenized = tokenized
      .replaceAll(links.pocLink, tokens.poc)
      .replaceAll(links.unsubscribeUrl, tokens.unsubscribe)
      .replaceAll(links.linkedInUrl, tokens.linkedin);
  }
  const escaped = escapeHtml(tokenized);
  let withLinks = escaped.replace(
    /(https:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}">${url}</a>`,
  );
  if (links) {
    withLinks = withLinks
      .replaceAll(tokens.poc, `<a href="${escapeHtml(links.pocLink)}"><strong>View the homepage mockup</strong></a>`)
      .replaceAll(tokens.unsubscribe, `<a href="${escapeHtml(links.unsubscribeUrl)}">Unsubscribe</a>`)
      .replaceAll(tokens.linkedin, `<a href="${escapeHtml(links.linkedInUrl)}">LinkedIn profile</a>`);
  }
  return withLinks
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
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
