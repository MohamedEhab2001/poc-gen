import type { BusinessPocRecord, ResolvedCta } from "./types";
import type { ActionLink } from "./schema";
import { mailtoHref, mapsQueryUrl, safeExternalUrl, telHref } from "./url";

type CtaT = ResolvedCta;

const KIND_ORDER = ["order", "reserve", "call", "directions", "email"] as const;

function sanitizeExternal(link: ActionLink): CtaT | null {
  const href = safeExternalUrl(link.href);
  if (!href) return null;
  return {
    label: link.label.trim(),
    href,
    kind: link.kind,
    external: link.external ?? true,
  };
}

function sanitizeCall(link: ActionLink): CtaT | null {
  const href = telHref(link.href) ?? telHref(link.label);
  if (!href) return null;
  return { label: link.label.trim(), href, kind: "call", external: false };
}

function sanitizeEmail(link: ActionLink): CtaT | null {
  const href = mailtoHref(link.href);
  if (!href) return null;
  return { label: link.label.trim(), href, kind: "email", external: false };
}

function sanitizeDirections(link: ActionLink): CtaT | null {
  const href = safeExternalUrl(link.href);
  if (!href) return null;
  return { label: link.label.trim(), href, kind: "directions", external: true };
}

/** Validates one action link against its kind's protocol rules. Unsafe links are dropped. */
export function sanitizeActionLink(link: ActionLink): CtaT | null {
  switch (link.kind) {
    case "order":
    case "reserve":
    case "external":
      return sanitizeExternal(link);
    case "call":
      return sanitizeCall(link);
    case "email":
      return sanitizeEmail(link);
    case "directions":
      return sanitizeDirections(link);
  }
}

/**
 * CTA priority engine. Collects candidates from the explicit callsToAction
 * block plus derivations from verified contact and location data, validates
 * every URL, then picks one primary and at most two secondary actions.
 *
 * Priority: order > reserve > call > directions > email.
 */
export function resolveCtas(
  record: BusinessPocRecord,
): {
  primary: CtaT | null;
  secondary: CtaT[];
  mobile: CtaT[];
  dropped: Array<{ label: string; reason: string }>;
} {
  const dropped: Array<{ label: string; reason: string }> = [];
  const byKind = new Map<string, CtaT>();

  const explicit = record.callsToAction ?? {};
  for (const kind of KIND_ORDER) {
    const link = explicit[kind] ?? null;
    if (!link) continue;
    const sanitized = sanitizeActionLink(link);
    if (!sanitized) {
      dropped.push({ label: link.label, reason: `Invalid or unsafe ${kind} URL` });
      continue;
    }
    byKind.set(kind, sanitized);
  }

  // Derive actions the record did not declare explicitly.
  if (!byKind.has("call")) {
    const phone = record.contact?.phone?.value ?? null;
    const href = telHref(phone);
    if (phone && href) {
      byKind.set("call", { label: "Call", href, kind: "call", external: false });
    }
  }
  if (!byKind.has("directions")) {
    const explicitUrl =
      record.location?.directionsUrl?.value ?? record.location?.mapsUrl?.value ?? null;
    const href = safeExternalUrl(explicitUrl);
    if (href) {
      byKind.set("directions", {
        label: "Directions",
        href,
        kind: "directions",
        external: true,
      });
    } else {
      const derived = mapsQueryUrl({
        latitude: record.location?.latitude?.value ?? null,
        longitude: record.location?.longitude?.value ?? null,
        formattedAddress: record.location?.formattedAddress?.value ?? null,
      });
      if (derived) {
        byKind.set("directions", {
          label: "Directions",
          href: derived,
          kind: "directions",
          external: true,
        });
      }
    }
  }
  if (!byKind.has("email")) {
    const email = record.contact?.email?.value ?? null;
    const href = mailtoHref(email);
    if (email && href) {
      byKind.set("email", { label: "Email", href, kind: "email", external: false });
    }
  }

  const ordered: CtaT[] = [];
  for (const kind of KIND_ORDER) {
    const cta = byKind.get(kind);
    if (cta) ordered.push(cta);
  }

  const [primary, ...rest] = ordered;
  const secondary = rest.slice(0, 2);
  const mobile = ordered.slice(0, 2);

  return { primary: primary ?? null, secondary, mobile, dropped };
}
