import { resolveCtas } from "./cta";
import {
  HOURS_NOT_PROVIDED,
  SAMPLE_MENU_NOTICE,
  fallbackHeadline,
  fallbackSubheadline,
  themePlaceholderHero,
} from "./fallbacks";
import { renderPolicy } from "./policy";
import type { PolicyOutcome } from "./policy";
import { themeMeta } from "./theme-meta";
import { resolveThemeId } from "./theme-registry";
import type {
  BusinessPocRecord,
  Outcome,
  ProvenanceEntry,
  ResolvedBusiness,
  ResolvedHours,
  ResolvedImage,
  ResolvedMenu,
  ResolvedReview,
  ServiceFlag,
  ThemePalette,
} from "./types";
import { isAllowedImageUrl, isHexColor, isTrustedMapEmbed, safeExternalUrl, telHref, mailtoHref } from "./url";
import type { PocImage, Sourced } from "./schema";

/** Sources that speak for the business itself (mirrors policy.ts). */
const BUSINESS_ORIGIN_SOURCES: ReadonlySet<string> = new Set([
  "business_owner",
  "official_website",
  "official_social",
  "manual",
]);

const trimToNull = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveImage(image: PocImage, outcome: Outcome): ResolvedImage {
  return {
    url: image.url,
    alt: image.alt,
    role: image.role ?? "gallery",
    source: image.source,
    outcome,
    width: image.width ?? null,
    height: image.height ?? null,
    attribution: image.attribution ?? null,
    focalPoint: image.focalPoint ?? null,
  };
}

function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Resolves the palette: theme default, then record brand palette, then
 * explicit themeOverrides. Every brand color passes the factual render
 * policy; a contrast guard reverts text/background pairings that would fall
 * below 3:1 so overrides cannot destroy readability.
 */
function resolvePalette(
  record: BusinessPocRecord,
  themeId: ResolvedBusiness["themeId"],
  warnings: string[],
  factual: <T>(field: string, sourced: Sourced<T> | undefined) => T | null,
): ThemePalette {
  const base = themeMeta[themeId].defaultPalette;
  const palette: ThemePalette = { ...base };

  const brand = record.brand?.palette;
  const apply = (value: string | null, key: keyof ThemePalette, label: string) => {
    if (value == null) return;
    if (!isHexColor(value)) {
      warnings.push(`Brand palette value "${value}" for ${label} is not a valid hex color; ignored.`);
      return;
    }
    palette[key] = value.trim();
  };
  apply(factual("brand.palette.primary", brand?.primary), "primary", "primary");
  apply(factual("brand.palette.secondary", brand?.secondary), "secondary", "secondary");
  apply(factual("brand.palette.accent", brand?.accent), "accent", "accent");
  apply(factual("brand.palette.background", brand?.background), "background", "background");
  apply(factual("brand.palette.foreground", brand?.foreground), "text", "foreground");

  const overrides = record.themeOverrides ?? null;
  apply(overrides?.primaryColor ?? null, "primary", "themeOverrides.primaryColor");
  apply(overrides?.secondaryColor ?? null, "secondary", "themeOverrides.secondaryColor");
  apply(overrides?.accentColor ?? null, "accent", "themeOverrides.accentColor");
  apply(overrides?.backgroundColor ?? null, "background", "themeOverrides.backgroundColor");

  if (contrastRatio(palette.text, palette.background) < 3) {
    warnings.push(
      "Resolved palette failed the 3:1 text contrast guard; text and background reverted to theme defaults.",
    );
    palette.text = base.text;
    palette.background = base.background;
  }
  return palette;
}

const SERVICE_LABELS: Array<[string, string]> = [
  ["delivery", "Delivery"],
  ["takeout", "Takeout"],
  ["dineIn", "Dine-in"],
  ["curbsidePickup", "Curbside pickup"],
  ["reservable", "Reservations"],
];

const AMENITY_LABELS: Array<[string, string]> = [
  ["outdoorSeating", "Outdoor seating"],
  ["liveMusic", "Live music"],
  ["allowsDogs", "Dog friendly"],
  ["goodForChildren", "Good for children"],
  ["goodForGroups", "Good for groups"],
  ["goodForWatchingSports", "Good for watching sports"],
  ["restroom", "Restroom available"],
];

/**
 * Central normalization. Turns a validated raw record into the view model
 * every theme consumes.
 *
 * Data-trust architecture: EVERY sourced value (narrative and factual,
 * including images, menus, and palettes) passes through the central render
 * policy via the resolveNarrativeValue / resolveFactualValue /
 * resolveImageValue helpers below. Blocked values become null before any
 * fallback runs, and blocked data is never reused to synthesize fallback
 * copy (a blocked AI-derived city cannot appear inside the fallback
 * headline because the fallback consumes only policy-resolved values).
 */
export function normalizeRecord(record: BusinessPocRecord): ResolvedBusiness {
  const provenance: ProvenanceEntry[] = [];
  const warnings: string[] = [];

  /**
   * Factual-field gate: operational data may render unverified from any
   * provider, but ai_derived data must still clear the confidence threshold.
   */
  function factualValue<T>(field: string, sourced: Sourced<T> | undefined): T | null {
    if (!sourced || sourced.value == null) return null;
    const outcome: PolicyOutcome = renderPolicy("factual", sourced);
    if (outcome === "blocked") {
      provenance.push({
        field,
        source: sourced.source,
        outcome: "hidden",
        note: "Blocked by the render policy (untrusted derived data)",
      });
      return null;
    }
    provenance.push({ field, source: sourced.source, outcome });
    return sourced.value;
  }

  /**
   * Narrative-field gate: story and marketing copy renders only from
   * business-origin sources (or verified/derived values above threshold).
   */
  function narrativeText<T extends string>(
    field: string,
    sourced: Sourced<T> | undefined,
  ): string | null {
    if (!sourced || sourced.value == null) return null;
    const outcome: PolicyOutcome = renderPolicy("narrative", sourced);
    if (outcome === "blocked") {
      provenance.push({
        field,
        source: sourced.source,
        outcome: "hidden",
        note: "Blocked by the render policy (unverified or low confidence)",
      });
      return null;
    }
    provenance.push({ field, source: sourced.source, outcome });
    return trimToNull(sourced.value);
  }

  /**
   * Image gate: trust policy AND host allowlist. Trust fields may live on the
   * image itself or on the Sourced wrapper (logo/hero); the image's own
   * values win when present. A blocked or non-allowlisted image resolves to
   * null (callers fall back to theme placeholder artwork or drop the gallery
   * slot); provenance records why.
   */
  function imageValue(
    field: string,
    image: PocImage | null | undefined,
    wrapper?: Sourced<PocImage>,
  ): ResolvedImage | null {
    if (!image) return null;
    const verified = image.verified ?? wrapper?.verified;
    const confidence = image.confidence ?? wrapper?.confidence ?? null;
    const outcome = renderPolicy("factual", {
      source: image.source,
      verified,
      confidence,
    });
    if (outcome === "blocked") {
      provenance.push({
        field,
        source: image.source,
        outcome: "hidden",
        note: "Blocked by the render policy (untrusted derived imagery)",
      });
      return null;
    }
    if (!isAllowedImageUrl(image.url)) {
      provenance.push({
        field,
        source: image.source,
        outcome: "hidden",
        note: "Blocked: image host not allowlisted",
      });
      return null;
    }
    provenance.push({ field, source: image.source, outcome });
    return resolveImage(image, outcome);
  }

  const { themeId, overridden, warning } = resolveThemeId(record.themeId);
  if (warning) warnings.push(warning);

  // Identity (all factual policy)
  const rawName = factualValue("identity.name", record.identity.name);
  const name = trimToNull(rawName) ?? titleFromSlug(record.slug);
  if (!rawName) {
    provenance.push({
      field: "identity.name",
      source: "fallback",
      outcome: "fallback",
      note: "Name missing; derived from slug",
    });
  }
  const shortName =
    trimToNull(factualValue("identity.shortName", record.identity.shortName)) ??
    name.split(" ")[0] ??
    name;
  const rawCategory = factualValue("identity.primaryCategory", record.identity.primaryCategory);
  const primaryCategory = trimToNull(rawCategory) ?? "Local business";
  if (!rawCategory) {
    provenance.push({
      field: "identity.primaryCategory",
      source: "fallback",
      outcome: "fallback",
      note: "Neutral fallback category",
    });
  }
  const categories = (factualValue("identity.categories", record.identity.categories) ?? []).filter(
    (c) => trimToNull(c) !== null,
  );
  const businessStatus =
    factualValue("identity.businessStatus", record.identity.businessStatus) ?? "unknown";

  // Location resolves first: the policy-resolved city feeds hero fallbacks,
  // so blocked data can never leak into generated copy.
  const locationRaw = record.location;
  const city = trimToNull(factualValue("location.city", locationRaw?.city));
  const formattedAddress = trimToNull(
    factualValue("location.formattedAddress", locationRaw?.formattedAddress),
  );
  const shortAddress = trimToNull(
    factualValue("location.shortAddress", locationRaw?.shortAddress),
  );
  const region = trimToNull(factualValue("location.region", locationRaw?.region));
  const country = trimToNull(factualValue("location.country", locationRaw?.country));
  const latitude = factualValue("location.latitude", locationRaw?.latitude);
  const longitude = factualValue("location.longitude", locationRaw?.longitude);

  // Wordmark (fallback rule 1: missing or blocked logo becomes a wordmark)
  const logoImage = imageValue("brand.logo", record.brand?.logo?.value, record.brand?.logo);
  if (record.brand?.logo?.value && !logoImage) {
    warnings.push("brand.logo was blocked by policy or host validation; typographic wordmark used.");
  }
  const wordmarkText = narrativeText("brand.wordmark", record.brand?.wordmark) ?? name;
  let wordmark: ResolvedBusiness["wordmark"];
  if (logoImage) {
    wordmark = { text: wordmarkText, image: logoImage, outcome: logoImage.outcome };
  } else {
    wordmark = { text: wordmarkText, image: null, outcome: "fallback" };
    provenance.push({
      field: "brand.logo",
      source: "fallback",
      outcome: "fallback",
      note: "No renderable logo; typographic wordmark generated from business name",
    });
  }

  // Palette (factual policy per color)
  const palette = resolvePalette(record, themeId, warnings, factualValue);

  // Hero copy (narrative policy; fallbacks use only resolved values)
  const heroEyebrowRaw = narrativeText("hero.eyebrow", record.hero.eyebrow);
  const heroHeadlineRaw = narrativeText("hero.headline", record.hero.headline);
  const heroSubRaw = narrativeText("hero.subheadline", record.hero.subheadline);
  const headline = heroHeadlineRaw ?? fallbackHeadline({ name, primaryCategory, city });
  const subheadline =
    heroSubRaw ??
    (heroHeadlineRaw ? null : fallbackSubheadline({ primaryCategory, city }));
  if (!heroHeadlineRaw) {
    provenance.push({
      field: "hero.headline",
      source: "fallback",
      outcome: "fallback",
      note: "Category-informed fallback headline",
    });
  }

  // Hero image (fallback rule 3 plus policy and host gates)
  const heroFromRecord = imageValue("hero.image", record.hero.image?.value, record.hero.image);
  const heroFromMedia = record.media.images.find((img) => img.role === "hero");
  const heroFromMediaResolved = heroFromMedia ? imageValue("hero.image", heroFromMedia) : null;
  let heroImage: ResolvedImage;
  if (heroFromRecord) {
    heroImage = heroFromRecord;
  } else if (heroFromMediaResolved) {
    heroImage = heroFromMediaResolved;
  } else {
    if (record.hero.image?.value || heroFromMedia) {
      warnings.push("hero.image was blocked by policy or host validation; theme placeholder used.");
    }
    heroImage = {
      url: themePlaceholderHero[themeId],
      alt: `Abstract ${themeMeta[themeId].name.toLowerCase()} pattern standing in for a photograph of ${name}`,
      role: "hero",
      source: "fallback",
      outcome: "fallback",
      width: 1600,
      height: 900,
      attribution: null,
      focalPoint: { x: 0.5, y: 0.5 },
    };
    provenance.push({
      field: "hero.image",
      source: "fallback",
      outcome: "fallback",
      note: "No renderable hero image; theme placeholder artwork used",
    });
  }

  // Reputation (factual policy; summary is narrative)
  const rating = factualValue("reputation.rating", record.reputation?.rating);
  const reviewCount = factualValue("reputation.reviewCount", record.reputation?.reviewCount);
  let reputation: ResolvedBusiness["reputation"] = null;
  if (rating != null && reviewCount != null) {
    const seen = new Set<string>();
    const reviews: ResolvedReview[] = (record.reputation?.reviews ?? [])
      .filter((review) => {
        const key = review.id + review.authorName;
        if (seen.has(key)) return false;
        seen.add(key);
        return trimToNull(review.text) !== null;
      })
      .map((review) => ({
        id: review.id,
        authorName: review.authorName,
        rating: review.rating,
        text: review.text.trim(),
        publishedAt: review.publishedAt ?? null,
        sourceUrl: safeExternalUrl(review.sourceUrl ?? null),
        attribution: review.attribution ?? null,
      }));
    const summary = record.reputation?.summary
      ? narrativeText("reputation.summary", record.reputation.summary)
      : null;
    reputation = {
      rating,
      reviewCount,
      summary,
      reviews,
      reviewsUrl: safeExternalUrl(factualValue("reputation.reviewsUrl", record.reputation?.reviewsUrl) ?? null),
    };
  }

  // Services and amenities (factual policy; only explicitly trusted trues render)
  const servicesRaw = record.offering?.services;
  const services: ServiceFlag[] = [];
  for (const [key, label] of SERVICE_LABELS) {
    const typed = servicesRaw as Record<string, Sourced<boolean> | undefined> | undefined;
    if (factualValue(`offering.services.${key}`, typed?.[key]) === true) {
      services.push({ key, label });
    }
  }
  const amenitiesRaw = record.amenities;
  const amenitiesTyped = amenitiesRaw as unknown as
    | Record<string, Sourced<boolean> | undefined>
    | undefined;
  const amenities: ServiceFlag[] = [];
  for (const [key, label] of AMENITY_LABELS) {
    if (factualValue(`amenities.${key}`, amenitiesTyped?.[key]) === true) {
      amenities.push({ key, label });
    }
  }
  for (const spot of factualValue("amenities.parking", amenitiesRaw?.parking) ?? []) {
    amenities.push({ key: "parking", label: spot });
  }
  for (const method of factualValue("amenities.paymentMethods", amenitiesRaw?.paymentMethods) ?? []) {
    amenities.push({ key: "payment", label: `Accepts ${method}` });
  }
  for (const item of factualValue("amenities.accessibility", amenitiesRaw?.accessibility) ?? []) {
    amenities.push({ key: "accessibility", label: item });
  }
  const compactServiceStrip =
    services.length + amenities.length > 0 && services.length + amenities.length < 3;

  // About (narrative policy)
  const aboutBody = narrativeText("content.aboutBody", record.content?.aboutBody);
  const aboutTitleRaw = narrativeText("content.aboutTitle", record.content?.aboutTitle);
  const neighborhood = narrativeText(
    "content.neighborhoodSummary",
    record.content?.neighborhoodSummary,
  );
  const about = aboutBody
    ? {
        title: aboutTitleRaw ?? `About ${shortName}`,
        body: aboutBody,
      }
    : neighborhood
      ? { title: `About ${shortName}`, body: neighborhood }
      : null;

  // Menu (fallback rule 5 plus source trust). Verified mode requires a
  // business-origin source or explicit verification; anything else — and any
  // ai_derived content — is demonstrative sample data with the notice.
  const menuRaw = record.offering?.menu;
  let menu: ResolvedMenu | null = null;
  if (menuRaw && menuRaw.mode !== "hidden") {
    const sections = menuRaw.sections
      .map((section) => ({
        id: section.id,
        name: section.name,
        description: trimToNull(section.description ?? null),
        items: section.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: trimToNull(item.description ?? null),
          price: trimToNull(item.price ?? null),
          tags: item.tags ?? [],
          featured: item.featured ?? false,
        })),
      }))
      .filter((section) => section.items.length > 0);

    const source = menuRaw.source ?? "manual";
    const trustedOrigin =
      menuRaw.verified === true || BUSINESS_ORIGIN_SOURCES.has(source);
    const isAi = source === "ai_derived";
    let mode: "verified" | "sample" = menuRaw.mode === "sample" ? "sample" : "verified";
    if (mode === "verified" && (!trustedOrigin || isAi)) {
      mode = "sample";
      warnings.push(
        "Menu was marked verified but its source is not trusted; downgraded to sample with the demonstration notice.",
      );
      provenance.push({
        field: "offering.menu",
        source,
        outcome: "sample",
        note: "Downgraded to sample: untrusted origin for verified menu",
      });
    }

    if (sections.length > 0) {
      menu = {
        mode,
        notice:
          mode === "sample"
            ? (trimToNull(menuRaw.notice ?? null) ?? SAMPLE_MENU_NOTICE)
            : (trimToNull(menuRaw.notice ?? null) ?? null),
        sections,
      };
      if (mode === "sample") {
        provenance.push({
          field: "offering.menu",
          source,
          outcome: "sample",
          note: "Menu content is demonstrative sample data",
        });
      }
    } else if (menuRaw.mode === "sample") {
      warnings.push("Menu marked sample but has no sections; hidden.");
    } else {
      warnings.push("Menu marked verified but has no sections; hidden.");
    }
  }

  // Gallery (fallback rule 4: reduce or hide, never repeat; policy + host gates)
  const galleryImages = record.media.images
    .filter((img) => img.role === undefined || img.role === "gallery")
    .map((img) => imageValue("media.images", img))
    .filter((img): img is ResolvedImage => img !== null)
    .filter((img, index, all) => all.findIndex((other) => other.url === img.url) === index);
  const blockedGallery = record.media.images.filter(
    (img) =>
      (img.role === undefined || img.role === "gallery") &&
      imagePreviewBlocked(img),
  ).length;
  if (blockedGallery > 0) {
    warnings.push(
      `${blockedGallery} gallery image(s) were blocked by policy or host validation; dropped.`,
    );
  }
  const gallery =
    galleryImages.length > 0
      ? { title: narrativeText("media.galleryTitle", record.media.galleryTitle), images: galleryImages }
      : null;

  // Hours (fallback rule 9; factual policy on sourced fields)
  const hoursRaw = record.hours;
  let hours: ResolvedHours | null = null;
  if (hoursRaw) {
    let descriptions = (
      factualValue("hours.weekdayDescriptions", hoursRaw.weekdayDescriptions) ?? []
    ).filter((line) => trimToNull(line) !== null);
    if (descriptions.length === 0 && hoursRaw.periods && hoursRaw.periods.length > 0) {
      descriptions = hoursRaw.periods.map((period) =>
        period.isClosed
          ? `${period.day}: Closed`
          : `${period.day}: ${period.open} to ${period.close}`,
      );
    }
    const openNow = factualValue("hours.openNow", hoursRaw.openNow);
    const statusLabel = trimToNull(factualValue("hours.statusLabel", hoursRaw.statusLabel));
    hours = { descriptions, openNow, statusLabel, missing: descriptions.length === 0 };
    if (hours.openNow == null && hours.missing && !hours.statusLabel) hours = null;
  }

  // Location assembly (embeds must be trusted map origins)
  const embedUrlSafe = safeExternalUrl(factualValue("location.embedUrl", locationRaw?.embedUrl) ?? null);
  const embedUrl =
    embedUrlSafe && isTrustedMapEmbed(embedUrlSafe) ? embedUrlSafe : null;
  if (locationRaw?.embedUrl?.value && !embedUrl) {
    warnings.push(
      "location.embedUrl failed the trusted map-embed origin check; location card rendered instead.",
    );
  }
  const mapsUrl = safeExternalUrl(factualValue("location.mapsUrl", locationRaw?.mapsUrl) ?? null);
  const directionsUrlRaw = safeExternalUrl(
    factualValue("location.directionsUrl", locationRaw?.directionsUrl) ?? null,
  );
  // Zero coordinates are valid: explicit null checks, never truthiness.
  const hasPlace = Boolean(
    formattedAddress || shortAddress || (latitude !== null && longitude !== null),
  );
  const location: ResolvedBusiness["location"] = hasPlace
    ? {
        formattedAddress,
        shortAddress,
        city,
        region,
        country,
        latitude,
        longitude,
        mapsUrl,
        directionsUrl: directionsUrlRaw,
        embedUrl,
        hasPlace: true,
      }
    : null;

  // Contact (factual policy then format validation)
  const phoneRaw = trimToNull(factualValue("contact.phone", record.contact?.phone));
  const phone = phoneRaw && telHref(phoneRaw) ? phoneRaw : null;
  if (phoneRaw && !phone) warnings.push("contact.phone is not dialable; ignored.");
  const emailRaw = trimToNull(factualValue("contact.email", record.contact?.email));
  const email = emailRaw && mailtoHref(emailRaw) ? emailRaw : null;
  if (emailRaw && !email) warnings.push("contact.email failed validation; ignored.");
  const website = safeExternalUrl(factualValue("contact.website", record.contact?.website) ?? null);
  const socials = (record.contact?.socialLinks ?? []).filter((social) =>
    safeExternalUrl(social.url),
  );

  // CTA priority engine (fallback rules 7, 8, 10). The context carries
  // policy-resolved facts so blocked phones/emails/locations can never
  // derive or preserve an action.
  const cta = resolveCtas(record, {
    phone,
    email,
    directionsUrl: directionsUrlRaw,
    mapsPlace:
      latitude !== null || longitude !== null || formattedAddress !== null
        ? { latitude, longitude, formattedAddress }
        : null,
  });
  for (const drop of cta.dropped) {
    warnings.push(`CTA "${drop.label}" dropped: ${drop.reason}.`);
    provenance.push({
      field: "callsToAction",
      source: "manual",
      outcome: "hidden",
      note: `${drop.label}: ${drop.reason}`,
    });
  }
  if (cta.primary) {
    provenance.push({
      field: "cta.primary",
      source: "manual",
      outcome: "verified",
      note: `${cta.primary.label} (${cta.primary.kind})`,
    });
  }

  return {
    id: record.id,
    slug: record.slug,
    status: record.status,
    themeId,
    themeWasOverridden: overridden,
    palette,
    density: record.themeOverrides?.density ?? "comfortable",
    motion:
      record.themeOverrides?.motion ??
      (themeMeta[themeId].motion === "energetic" ? "expressive" : "subtle"),
    identity: { name, shortName, primaryCategory, categories, businessStatus },
    wordmark,
    tagline: narrativeText("brand.tagline", record.brand?.tagline),
    hero: {
      eyebrow: heroEyebrowRaw,
      headline,
      subheadline,
      image: heroImage,
    },
    cta: { primary: cta.primary, secondary: cta.secondary, mobile: cta.mobile },
    reputation,
    services,
    amenities,
    compactServiceStrip,
    about,
    menu,
    gallery,
    hours,
    location,
    contact: { phone, email, website, socials },
    announcement: narrativeText("content.announcement", record.content?.announcement),
    offering: {
      priceLevel: trimToNull(factualValue("offering.priceLevel", record.offering?.priceLevel)),
      priceRange: trimToNull(factualValue("offering.priceRange", record.offering?.priceRange)),
      mealTypes: record.offering?.mealTypes ?? [],
      dietaryOptions: record.offering?.dietaryOptions ?? [],
    },
    poc: {
      conceptLabel: trimToNull(record.poc.conceptLabel) ?? "Unofficial website concept",
      disclaimer: record.poc.disclaimer,
      createdAt: record.poc.createdAt,
    },
    provenance,
    warnings,
  };
}

/** Preview check for gallery warnings without resolving the image twice. */
function imagePreviewBlocked(image: PocImage, wrapper?: Sourced<PocImage>): boolean {
  const verified = image.verified ?? wrapper?.verified;
  const confidence = image.confidence ?? wrapper?.confidence ?? null;
  const outcome = renderPolicy("factual", { source: image.source, verified, confidence });
  return outcome === "blocked" || !isAllowedImageUrl(image.url);
}

export { HOURS_NOT_PROVIDED };
