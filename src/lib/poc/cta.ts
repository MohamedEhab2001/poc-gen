import type { BusinessPocRecord, ResolvedCta } from "./types";
import type { ActionLink } from "./schema";
import { mailtoHref, mapsQueryUrl, safeExternalUrl, telHref } from "./url";

type CtaT = ResolvedCta;

const KIND_ORDER = ["order", "reserve", "call", "directions", "email"] as const;

/**
 * Policy-resolved contact and location facts plus the policy-gated explicit
 * action list. Normalization passes all of these so the engine never reads
 * raw blocked fields in production: derivations use resolved facts and the
 * explicit candidates arrive already policy-approved (calls to action plus
 * hero actions). Callers that omit the context (legacy unit tests) get
 * raw-record behavior.
 */
export interface CtaContext {
  phone: string | null;
  email: string | null;
  directionsUrl: string | null;
  mapsPlace: {
    latitude: number | null;
    longitude: number | null;
    formattedAddress: string | null;
  } | null;
  /** Policy-resolved explicit actions (callsToAction + hero actions). */
  explicit?: ActionLink[];
}

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
 * block plus derivations from trusted contact and location data, validates
 * every URL, then picks one primary and at most two secondary actions.
 *
 * Priority: order > reserve > call > directions > email.
 *
 * When `ctx` is provided, call and email actions exist only if the
 * policy-resolved phone/email exist, and directions derive only from
 * policy-resolved location data.
 */
export function resolveCtas(
  record: BusinessPocRecord,
  ctx?: CtaContext,
): {
  primary: CtaT | null;
  secondary: CtaT[];
  mobile: CtaT[];
  dropped: Array<{ label: string; reason: string }>;
} {
  const dropped: Array<{ label: string; reason: string }> = [];
  const byKind = new Map<string, CtaT>();

  const phoneUsable = ctx ? ctx.phone !== null : true;
  const emailUsable = ctx ? ctx.email !== null : true;

  const explicitRecord = record.callsToAction ?? {};
  const explicitCandidates: Array<[string, ActionLink | null]> = ctx?.explicit
    ? KIND_ORDER.map((kind) => [
        kind,
        ctx.explicit!.find((link) => link.kind === kind) ?? null,
      ])
    : KIND_ORDER.map((kind) => [kind, explicitRecord[kind] ?? null]);

  for (const [kind, link] of explicitCandidates) {
    if (!link) continue;

    if (kind === "call" && !phoneUsable) {
      dropped.push({ label: link.label, reason: "Phone blocked or missing" });
      continue;
    }
    if (kind === "email" && !emailUsable) {
      dropped.push({ label: link.label, reason: "Email blocked or missing" });
      continue;
    }

    const sanitized = sanitizeActionLink(link);
    if (!sanitized) {
      dropped.push({ label: link.label, reason: `Invalid or unsafe ${kind} URL` });
      continue;
    }
    byKind.set(kind, sanitized);
  }

  // Derive actions the record did not declare explicitly, using only
  // policy-resolved facts when a context was provided.
  if (!byKind.has("call")) {
    const phone = ctx ? ctx.phone : record.contact?.phone?.value ?? null;
    const href = telHref(phone);
    if (phone && href) {
      byKind.set("call", { label: "Call", href, kind: "call", external: false });
    }
  }
  if (!byKind.has("directions")) {
    let href: string | null;
    if (ctx) {
      href = ctx.directionsUrl;
      if (!href && ctx.mapsPlace) {
        href = mapsQueryUrl(ctx.mapsPlace);
      }
    } else {
      const explicitUrl =
        record.location?.directionsUrl?.value ?? record.location?.mapsUrl?.value ?? null;
      href = safeExternalUrl(explicitUrl);
      if (!href) {
        href = mapsQueryUrl({
          latitude: record.location?.latitude?.value ?? null,
          longitude: record.location?.longitude?.value ?? null,
          formattedAddress: record.location?.formattedAddress?.value ?? null,
        });
      }
    }
    if (href) {
      byKind.set("directions", {
        label: "Directions",
        href,
        kind: "directions",
        external: true,
      });
    }
  }
  if (!byKind.has("email")) {
    const email = ctx ? ctx.email : record.contact?.email?.value ?? null;
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
