import { getRecordDisposition } from "@/lib/poc/disposition";
import { normalizeRecord } from "@/lib/poc/normalize";
import { renderPolicy } from "@/lib/poc/policy";
import type { BusinessPocRecord, PocImage } from "@/lib/poc/schema";
import { CONCEPT_LABEL_PREFIX, MEDIA_SOURCES, isGooglePhotoUrl, isUnsplashUrl } from "@/lib/poc/media";
import { isAllowedImageUrl, isTrustedMapEmbed, mailtoHref, safeExternalUrl, telHref } from "@/lib/poc/url";
import type { ResolvedBusiness } from "@/lib/poc/types";

/**
 * Deterministic Phase 2A QA gates. Pure function over a validated record:
 * same record + same clock => same report. Any blocking check failing means
 * the operation fails automatically — there is no override parameter and no
 * manual review state. Screenshot and AI-vision checks are planned for the
 * next phase; their results will join the same checks array with the same
 * { code, severity, status, details } shape, so callers will not break.
 */

export type QaSeverity = "blocking" | "warning";
export type QaCheckStatus = "pass" | "warn" | "fail";

export interface QaCheck {
  code: string;
  severity: QaSeverity;
  status: QaCheckStatus;
  /** Safe details only: counts, codes, field paths. Never raw payloads. */
  details?: Record<string, unknown>;
}

export interface QaReport {
  passed: boolean;
  checkedAt: string;
  blockingFailures: string[];
  checks: QaCheck[];
}

/** Raw placeholder tokens that must never appear in user-visible values. */
const PLACEHOLDER_PATTERNS: RegExp[] = [
  /\{\{[^}]{0,120}\}\}/,
  /\$\{[^}]{0,120}\}/,
  /%[A-Z][A-Z0-9_]{1,40}%/,
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bPLACEHOLDER\b/i,
  /\bLorem ipsum\b/i,
];

/**
 * User-visible string fields of the normalized render model, walked
 * generically. Internal diagnostics (provenance notes, warnings) and
 * technical fields (urls, ids, focal points) are not customer copy.
 */
function collectVisibleStrings(value: unknown, out: string[], depth = 0): void {
  if (out.length > 500 || depth > 8) return;
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectVisibleStrings(item, out, depth + 1);
  } else if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    for (const [key, nested] of Object.entries(record)) {
      if (
        key === "url" ||
        key === "href" ||
        key === "embedUrl" ||
        key === "sourceUrl" ||
        key === "id" ||
        key === "focalPoint" ||
        key === "provenance" ||
        key === "warnings"
      ) {
        continue;
      }
      collectVisibleStrings(nested, out, depth + 1);
    }
  }
}

/** Provider content that renders must carry attribution/license metadata. */
function checkProviderAttribution(record: BusinessPocRecord): QaCheck {
  const missing: string[] = [];
  const push = (field: string, hasAttribution: boolean) => {
    if (!hasAttribution) missing.push(field);
  };

  const logo = record.brand?.logo;
  if (logo?.source === "google_places" && logo.value) {
    push("brand.logo", Boolean(logo.value.license ?? logo.value.attribution?.label ?? logo.attribution?.label));
  }
  const hero = record.hero.image;
  if (hero?.source === "google_places" && hero.value) {
    push("hero.image", Boolean(hero.value.license ?? hero.value.attribution?.label ?? hero.attribution?.label));
  }
  for (const [index, image] of record.media.images.entries()) {
    if (image.source === "google_places") {
      push(`media.images[${index}]`, Boolean(image.license ?? image.attribution?.label));
    }
  }
  for (const [index, review] of (record.reputation?.reviews ?? []).entries()) {
    if (review.source === "google_places") {
      push(`reputation.reviews[${index}]`, Boolean(review.attribution?.label ?? review.sourceUrl));
    }
  }

  return {
    code: "ATTRIBUTION_METADATA",
    severity: "blocking",
    status: missing.length === 0 ? "pass" : "fail",
    ...(missing.length > 0 ? { details: { missingFields: missing.slice(0, 10) } } : {}),
  };
}

function checkCtas(model: ResolvedBusiness): QaCheck {
  const invalid: string[] = [];
  const validate = (cta: { label: string; href: string; kind: string } | null, slot: string) => {
    if (!cta) return;
    const ok =
      cta.href.startsWith("tel:") ? telHref(cta.href.replace("tel:", "")) !== null :
      cta.href.startsWith("mailto:") ? mailtoHref(cta.href.replace("mailto:", "")) !== null :
      safeExternalUrl(cta.href) !== null;
    if (!ok) invalid.push(`${slot}:${cta.kind}`);
  };
  validate(model.cta.primary, "primary");
  model.cta.secondary.forEach((cta, i) => validate(cta, `secondary[${i}]`));
  model.cta.mobile.forEach((cta, i) => validate(cta, `mobile[${i}]`));
  return {
    code: "CTA_PROTOCOLS",
    severity: "blocking",
    status: invalid.length === 0 ? "pass" : "fail",
    ...(invalid.length > 0 ? { details: { invalid: invalid.slice(0, 10) } } : {}),
  };
}

function checkImageOrigins(model: ResolvedBusiness): QaCheck {
  const blocked: string[] = [];
  const check = (url: string, field: string) => {
    if (!isAllowedImageUrl(url)) blocked.push(field);
  };
  if (model.hero.image) check(model.hero.image.url, "hero.image");
  if (model.wordmark.image) check(model.wordmark.image.url, "brand.logo");
  for (const image of model.gallery?.images ?? []) check(image.url, "media.images");
  return {
    code: "IMAGE_ORIGINS",
    severity: "blocking",
    status: blocked.length === 0 ? "pass" : "fail",
    ...(blocked.length > 0 ? { details: { blocked: blocked.slice(0, 10) } } : {}),
  };
}

/**
 * Deterministic visual-readiness signals that can be evaluated without a
 * browser screenshot. Theme concept art is an honest supported strategy, but
 * it remains visible as a warning so the scheduler can prefer a licensed
 * business photo when one exists. Very thin pages fail before publication.
 */
function checkVisualReadiness(record: BusinessPocRecord, model: ResolvedBusiness): QaCheck[] {
  const tier = model.hero.image?.mediaSource ?? "concept_art";
  const heroStrategy =
    tier === "concept_art" ? "theme_concept_art" : tier === "unsplash" ? "concept_photography" : "business_media";
  const heroCheck: QaCheck = {
    code: "HERO_VISUAL_STRATEGY",
    severity: "warning",
    status: heroStrategy === "theme_concept_art" ? "warn" : "pass",
    details: {
      strategy: heroStrategy,
      themeId: model.themeId,
      // Google place photos resolve at render time; a stored record can only
      // say whether that tier is available.
      googlePlacePhotosEligible: Boolean(record.media.resolution?.trustedPlaceId),
    },
  };

  const signals = {
    heroSubheadline: Boolean(model.hero.subheadline),
    primaryAction: Boolean(model.cta.primary),
    location: Boolean(model.location?.hasPlace),
    contact: Boolean(
      model.contact.phone ||
        model.contact.email ||
        model.contact.website ||
        model.contact.socials.length > 0,
    ),
    about: Boolean(model.about),
    menuOrGallery: Boolean(model.menu || model.gallery),
    hours: Boolean(model.hours),
    reputation: Boolean(model.reputation),
  };
  const present = Object.values(signals).filter(Boolean).length;
  const contentCheck: QaCheck = {
    code: "VISUAL_CONTENT_DEPTH",
    severity: "blocking",
    status: present >= 3 ? "pass" : "fail",
    details: {
      present,
      required: 3,
      missing: Object.entries(signals)
        .filter(([, value]) => !value)
        .map(([key]) => key),
    },
  };

  return [heroCheck, contentCheck];
}

/** Every stored image with the field path it lives at. */
function recordImages(record: BusinessPocRecord): Array<[string, PocImage]> {
  const out: Array<[string, PocImage]> = [];
  if (record.brand?.logo?.value) out.push(["brand.logo", record.brand.logo.value]);
  if (record.hero.image?.value) out.push(["hero.image", record.hero.image.value]);
  record.media.images.forEach((image, index) => out.push([`media.images[${index}]`, image]));
  return out;
}

/**
 * Media integrity. Never requires a provider: a record with no photos and
 * no credentials passes on ConceptHeroArt. What it forbids is mislabeled
 * media — stock imagery presented as the business, concept imagery without
 * its disclosure/credit, Google photos without a place id, or expiring
 * Google photo URIs persisted into the record.
 */
function checkMedia(record: BusinessPocRecord, model: ResolvedBusiness): QaCheck[] {
  const problems: string[] = [];
  const flag = (field: string, reason: string) => problems.push(`${field}:${reason}`);

  for (const [field, image] of recordImages(record)) {
    if (image.source === "unsplash") {
      if (!isUnsplashUrl(image.url)) flag(field, "unsplash_host");
      if (image.role === "logo" || field === "brand.logo") flag(field, "unsplash_logo");
      if (image.verified) flag(field, "unsplash_marked_verified");
      const label = image.attribution?.label ?? "";
      if (!label.startsWith(CONCEPT_LABEL_PREFIX) || !label.includes("on Unsplash") || !image.attribution?.authorName) {
        flag(field, "unsplash_attribution");
      }
    } else if (isUnsplashUrl(image.url)) {
      flag(field, "stock_image_as_business_media");
    }
    if (image.source === "google_places" && !record.identity.placeId) flag(field, "google_without_place_id");
    if (isGooglePhotoUrl(image.url)) flag(field, "google_photo_uri_persisted");
  }

  const rendered = [model.hero.image, model.wordmark.image, ...(model.gallery?.images ?? [])].filter(
    (image): image is NonNullable<typeof image> => image !== null,
  );
  for (const image of rendered) {
    if (!MEDIA_SOURCES.includes(image.mediaSource)) flag(image.role ?? "image", "unknown_media_source");
    if (image.mediaSource === "unsplash" && image.isBusinessSpecific) flag(image.role ?? "image", "concept_marked_business");
    if (image.mediaSource === "concept_art" && image.isBusinessSpecific) flag(image.role ?? "image", "concept_marked_business");
  }

  const missingAlt: string[] = [];
  if (!model.hero.image?.alt.trim()) missingAlt.push("hero.image");
  (model.gallery?.images ?? []).forEach((image, index) => {
    if (!image.alt.trim()) missingAlt.push(`gallery[${index}]`);
  });

  const urls = record.media.images.map((image) => image.url.trim());
  const duplicates = urls.length - new Set(urls).size;

  return [
    {
      code: "MEDIA_SOURCE_INTEGRITY",
      severity: "blocking",
      status: problems.length === 0 ? "pass" : "fail",
      details: { heroSource: model.hero.image?.mediaSource ?? "concept_art", ...(problems.length > 0 ? { problems: problems.slice(0, 10) } : {}) },
    },
    {
      code: "MEDIA_ALT_TEXT",
      severity: "blocking",
      status: missingAlt.length === 0 ? "pass" : "fail",
      ...(missingAlt.length > 0 ? { details: { missing: missingAlt.slice(0, 10) } } : {}),
    },
    {
      // Duplicates are removed at render (never shown twice); flagged so the
      // generator can tidy the record.
      code: "MEDIA_DUPLICATES",
      severity: "warning",
      status: duplicates === 0 ? "pass" : "warn",
      ...(duplicates > 0 ? { details: { removedAtRender: duplicates } } : {}),
    },
  ];
}

/**
 * Re-runs the central render policy over every sourced wrapper in the raw
 * record and asserts normalization hid every blocked value. The policy
 * outcome per value is recomputed with the same field classification
 * normalization uses (narrative copy vs factual data); a blocked value that
 * normalization did NOT record as hidden would mean the policy boundary
 * leaked, and this gate fails.
 */
function checkPolicyPass(record: BusinessPocRecord, model: ResolvedBusiness): QaCheck {
  // Exact narrative fields, mirroring normalize.ts (everything else factual).
  const NARRATIVE_PATHS = new Set([
    "brand.wordmark",
    "brand.tagline",
    "hero.eyebrow",
    "hero.headline",
    "hero.subheadline",
    "content.aboutTitle",
    "content.aboutBody",
    "content.neighborhoodSummary",
    "content.announcement",
    "reputation.summary",
    "media.galleryTitle",
  ]);
  let rawBlocked = 0;
  const walk = (value: unknown, path: string, depth: number): void => {
    if (depth > 7 || value == null || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    if (typeof node.source === "string" && "value" in node) {
      const outcome = renderPolicy(NARRATIVE_PATHS.has(path) ? "narrative" : "factual", {
        source: node.source as never,
        verified: node.verified as boolean | undefined,
        confidence: node.confidence as number | null | undefined,
      });
      if (outcome === "blocked" && node.value != null) rawBlocked += 1;
      if (node.value && typeof node.value === "object") walk(node.value, `${path}.value`, depth + 1);
      return;
    }
    for (const [key, nested] of Object.entries(node)) walk(nested, `${path}.${key}`, depth + 1);
  };
  walk(record, "", 0);

  const modelHidden = model.provenance.filter((entry) => entry.outcome === "hidden").length;
  const leaked = rawBlocked > modelHidden;
  return {
    code: "RENDER_POLICY",
    severity: "blocking",
    status: leaked ? "fail" : "pass",
    details: { blockedRawValues: rawBlocked, hiddenByNormalization: modelHidden },
  };
}

export function runDeterministicQa(record: BusinessPocRecord, now: Date = new Date()): QaReport {
  const checks: QaCheck[] = [];

  // 1. Schema: the record reaching QA is already recordSchema-validated at
  //    the write boundary; invalid stored JSON fails closed at read.
  checks.push({
    code: "SCHEMA_VALID",
    severity: "blocking",
    status: "pass",
    details: { schemaVersion: record.schemaVersion },
  });

  // 2. Record disposition: active, not expired, not permanently closed.
  const disposition = getRecordDisposition(record, now);
  checks.push({
    code: "RECORD_DISPOSITION",
    severity: "blocking",
    status: disposition === "render" ? "pass" : "fail",
    ...(disposition !== "render" ? { details: { disposition } } : {}),
  });

  // 3. Normalized render model can be produced without throwing.
  let model: ResolvedBusiness;
  try {
    model = normalizeRecord(record);
    checks.push({ code: "RENDER_MODEL_OK", severity: "blocking", status: "pass" });
  } catch (error) {
    checks.push({
      code: "RENDER_MODEL_OK",
      severity: "blocking",
      status: "fail",
      details: { reason: error instanceof Error ? error.name : "unknown" },
    });
    // Normalization threw: every model-based check below is meaningless.
    const blockingFailures = checks.filter((c) => c.status === "fail").map((c) => c.code);
    return { passed: false, checkedAt: now.toISOString(), blockingFailures, checks };
  }

  // 4. Allowed image origins for everything that renders.
  checks.push(checkImageOrigins(model));

  // 4b. Deterministic visual readiness. Screenshot/vision review can build
  //     on these stable codes without treating concept art as photography.
  checks.push(...checkVisualReadiness(record, model));

  // 4c. Media source integrity, alt text, and duplicate removal.
  checks.push(...checkMedia(record, model));

  // 5. Map embed origin.
  const embedOk = model.location?.embedUrl == null || isTrustedMapEmbed(model.location.embedUrl);
  checks.push({
    code: "MAP_ORIGIN",
    severity: "blocking",
    status: embedOk ? "pass" : "fail",
  });

  // 6. No raw placeholder tokens in user-visible values.
  const visible: string[] = [];
  collectVisibleStrings(model, visible);
  const placeholderHits: string[] = [];
  for (const text of visible) {
    if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) {
      placeholderHits.push(text.slice(0, 60));
      if (placeholderHits.length >= 10) break;
    }
  }
  checks.push({
    code: "PLACEHOLDER_TOKENS",
    severity: "blocking",
    status: placeholderHits.length === 0 ? "pass" : "fail",
    ...(placeholderHits.length > 0 ? { details: { hits: placeholderHits } } : {}),
  });

  // 7. CTA protocols and sourced CTA policy.
  checks.push(checkCtas(model));

  // 8. Attribution and license metadata for provider content.
  checks.push(checkProviderAttribution(record));

  // 9. Business not permanently closed (explicit code; disposition also covers).
  const businessStatusOutcome = renderPolicy("factual", {
    source: record.identity.businessStatus.source,
    verified: record.identity.businessStatus.verified,
    confidence: record.identity.businessStatus.confidence ?? null,
  });
  const trustedStatus = businessStatusOutcome !== "blocked" ? record.identity.businessStatus.value : "unknown";
  checks.push({
    code: "BUSINESS_OPEN",
    severity: "blocking",
    status: trustedStatus !== "permanently_closed" ? "pass" : "fail",
    ...(trustedStatus === "permanently_closed" ? { details: { businessStatus: trustedStatus } } : {}),
  });

  // 10. Record not expired (explicit code).
  const expired = Boolean(record.expiresAt && new Date(record.expiresAt).getTime() <= now.getTime());
  checks.push({ code: "NOT_EXPIRED", severity: "blocking", status: expired ? "fail" : "pass" });

  // 11. Central render policy re-run (rendered values must all be allowed).
  checks.push(checkPolicyPass(record, model));

  const blockingFailures = checks
    .filter((check) => check.severity === "blocking" && check.status === "fail")
    .map((check) => check.code);

  return {
    passed: blockingFailures.length === 0,
    checkedAt: now.toISOString(),
    blockingFailures,
    checks,
  };
}
