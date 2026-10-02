import { resolveCtas } from "./cta";
import {
  HOURS_NOT_PROVIDED,
  SAMPLE_MENU_NOTICE,
  fallbackHeadline,
  fallbackSubheadline,
  outcomeForSourced,
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

function luminance(hex: string): number {  const clean = hex.replace("#", "");
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
 * explicit themeOverrides. A contrast guard reverts text/background pairings
 * that would fall below 3:1 so overrides cannot destroy readability.
 */
function resolvePalette(
  record: BusinessPocRecord,
  themeId: ResolvedBusiness["themeId"],
  warnings: string[],
): ThemePalette {
  const base = themeMeta[themeId].defaultPalette;
  const palette: ThemePalette = { ...base };

  const brand = record.brand?.palette;
  const apply = (value: string | null | undefined, key: keyof ThemePalette, label: string) => {
    if (value == null) return;
    if (!isHexColor(value)) {
      warnings.push(`Brand palette value "${value}" for ${label} is not a valid hex color; ignored.`);
      return;
    }
    palette[key] = value.trim();
  };
  apply(brand?.primary?.value ?? null, "primary", "primary");
  apply(brand?.secondary?.value ?? null, "secondary", "secondary");
  apply(brand?.accent?.value ?? null, "accent", "accent");
  apply(brand?.background?.value ?? null, "background", "background");
  apply(brand?.foreground?.value ?? null, "text", "foreground");

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

type ServicesBlock = NonNullable<BusinessPocRecord["offering"]>["services"];
const SERVICE_LABELS: Array<[keyof NonNullable<ServicesBlock>, string]> = [
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
 * every theme consumes, applying all placeholder and fallback rules.
 */
export function normalizeRecord(record: BusinessPocRecord): ResolvedBusiness {
  const provenance: ProvenanceEntry[] = [];
  const warnings: string[] = [];

  /**
   * Narrative-field gate: routes every story/marketing value through the
   * central render policy. Blocked values are dropped before the fallback
   * engine runs, so untrusted content never renders as business fact.
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

  const { themeId, overridden, warning } = resolveThemeId(record.themeId);
  if (warning) warnings.push(warning);

  // Identity
  const rawName = trimToNull(record.identity.name.value);
  const name = rawName ?? titleFromSlug(record.slug);
  if (!rawName) {
    provenance.push({
      field: "identity.name",
      source: "fallback",
      outcome: "fallback",
      note: "Name missing; derived from slug",
    });
  }
  const shortName = trimToNull(record.identity.shortName?.value) ?? name.split(" ")[0] ?? name;
  const primaryCategory =
    trimToNull(record.identity.primaryCategory.value) ?? "Local business";
  const categories = (record.identity.categories.value ?? []).filter(
    (c) => trimToNull(c) !== null,
  );
  const businessStatus = record.identity.businessStatus.value ?? "unknown";

  // Wordmark (fallback rule 1: missing logo becomes a typographic wordmark)
  const logoSourced = record.brand?.logo;
  const logo =
    logoSourced?.value && isAllowedImageUrl(logoSourced.value.url)
      ? logoSourced.value
      : null;
  if (logoSourced?.value && !logo) {
    warnings.push("brand.logo URL is not on the image host allowlist; ignored.");
    provenance.push({
      field: "brand.logo",
      source: logoSourced.source,
      outcome: "hidden",
      note: "Blocked: image host not allowlisted",
    });
  }
  const wordmarkText = trimToNull(record.brand?.wordmark?.value) ?? name;
  let wordmark: ResolvedBusiness["wordmark"];
  if (logo && logoSourced) {
    const outcome = outcomeForSourced(logoSourced);
    wordmark = {
      text: wordmarkText,
      image: resolveImage(logo, outcome),
      outcome,
    };
  } else {
    wordmark = { text: wordmarkText, image: null, outcome: "fallback" };
    provenance.push({
      field: "brand.logo",
      source: "fallback",
      outcome: "fallback",
      note: "No logo; typographic wordmark generated from business name",
    });
  }

  // Palette (fallback rule 2)
  const palette = resolvePalette(record, themeId, warnings);

  // Hero copy (narrative policy gates everything)
  const city = trimToNull(record.location?.city?.value);
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

  // Hero image (fallback rule 3, plus the image-host allowlist)
  const heroSourced = record.hero.image;
  const heroFromMedia = record.media.images.find(
    (img) => img.role === "hero" && isAllowedImageUrl(img.url),
  );
  let heroImage: ResolvedImage;
  if (heroSourced?.value && isAllowedImageUrl(heroSourced.value.url)) {
    heroImage = resolveImage(heroSourced.value, outcomeForSourced(heroSourced));
  } else if (heroSourced?.value) {
    warnings.push("hero.image URL is not on the image host allowlist; placeholder used.");
    provenance.push({
      field: "hero.image",
      source: heroSourced.source,
      outcome: "hidden",
      note: "Blocked: image host not allowlisted",
    });
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
  } else if (heroFromMedia) {
    heroImage = resolveImage(heroFromMedia, outcomeForSourced({ source: heroFromMedia.source }));
  } else {
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
      note: "No hero image; theme placeholder artwork used",
    });
  }

  // Reputation (fallback rule 6: hidden when absent)
  const rating = record.reputation?.rating?.value ?? null;
  const reviewCount = record.reputation?.reviewCount?.value ?? null;
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
    const summarySourced = record.reputation?.summary;
    const summary = summarySourced
      ? narrativeText("reputation.summary", summarySourced)
      : null;
    reputation = {
      rating,
      reviewCount,
      summary,
      reviews,
      reviewsUrl: safeExternalUrl(record.reputation?.reviewsUrl?.value ?? null),
    };
    provenance.push({
      field: "reputation.rating",
      source: record.reputation!.rating!.source,
      outcome: outcomeForSourced(record.reputation!.rating!),
    });
  }

  // Services and amenities (fallback rule 11: compact strip under three)
  const servicesRaw = record.offering?.services;
  const services: ServiceFlag[] = [];
  for (const [key, label] of SERVICE_LABELS) {
    if (servicesRaw?.[key]?.value === true) services.push({ key, label });
  }
  const amenitiesRaw = record.amenities;
  const amenities: ServiceFlag[] = [];
  const amenitiesTyped = amenitiesRaw as unknown as
    | Record<string, Sourced<boolean> | undefined>
    | undefined;
  for (const [key, label] of AMENITY_LABELS) {
    if (amenitiesTyped?.[key]?.value === true) amenities.push({ key, label });
  }
  for (const spot of amenitiesRaw?.parking?.value ?? []) {
    amenities.push({ key: "parking", label: spot });
  }
  for (const method of amenitiesRaw?.paymentMethods?.value ?? []) {
    amenities.push({ key: "payment", label: `Accepts ${method}` });
  }
  for (const item of amenitiesRaw?.accessibility?.value ?? []) {
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

  // Menu (fallback rule 5)
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
    if (sections.length > 0) {
      menu = {
        mode: menuRaw.mode === "sample" ? "sample" : "verified",
        notice:
          menuRaw.mode === "sample"
            ? (trimToNull(menuRaw.notice ?? null) ?? SAMPLE_MENU_NOTICE)
            : (trimToNull(menuRaw.notice ?? null) ?? null),
        sections,
      };
      if (menu.mode === "sample") {
        provenance.push({
          field: "offering.menu",
          source: "fallback",
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

  // Gallery (fallback rule 4: reduce or hide, never repeat; allowlist-gated)
  const galleryImages = record.media.images
    .filter((img) => img.role === undefined || img.role === "gallery")
    .filter((img) => isAllowedImageUrl(img.url))
    .filter((img, index, all) => all.findIndex((other) => other.url === img.url) === index)
    .map((img) => resolveImage(img, outcomeForSourced({ source: img.source })));
  const blockedImageCount =
    record.media.images.filter(
      (img) =>
        (img.role === undefined || img.role === "gallery") && !isAllowedImageUrl(img.url),
    ).length +
    (record.media.images.some((img) => img.role === "hero" && !isAllowedImageUrl(img.url)) ? 1 : 0);
  if (blockedImageCount > 0) {
    warnings.push(
      `${blockedImageCount} image URL(s) are not on the image host allowlist; dropped.`,
    );
  }
  const gallery =
    galleryImages.length > 0
      ? { title: trimToNull(record.media.galleryTitle?.value), images: galleryImages }
      : null;

  // Hours (fallback rule 9)
  const hoursRaw = record.hours;
  let hours: ResolvedHours | null = null;
  if (hoursRaw) {
    let descriptions = (hoursRaw.weekdayDescriptions?.value ?? []).filter(
      (line) => trimToNull(line) !== null,
    );
    if (descriptions.length === 0 && hoursRaw.periods && hoursRaw.periods.length > 0) {
      descriptions = hoursRaw.periods.map((period) =>
        period.isClosed
          ? `${period.day}: Closed`
          : `${period.day}: ${period.open} to ${period.close}`,
      );
    }
    hours = {
      descriptions,
      openNow: hoursRaw.openNow?.value ?? null,
      statusLabel: trimToNull(hoursRaw.statusLabel?.value),
      missing: descriptions.length === 0,
    };
    if (hours.openNow == null && hours.missing && !hours.statusLabel) hours = null;
  }

  // Location (fallback rule 8; embeds must be trusted map origins)
  const locationRaw = record.location;
  const embedUrlSafe = safeExternalUrl(locationRaw?.embedUrl?.value ?? null);
  const embedUrl =
    embedUrlSafe && isTrustedMapEmbed(embedUrlSafe) ? embedUrlSafe : null;
  if (locationRaw?.embedUrl?.value && !embedUrl) {
    warnings.push(
      "location.embedUrl failed the trusted map-embed origin check; location card rendered instead.",
    );
  }
  const mapsUrl = safeExternalUrl(locationRaw?.mapsUrl?.value ?? null);
  const directionsUrlRaw = safeExternalUrl(locationRaw?.directionsUrl?.value ?? null);
  const formattedAddress = trimToNull(locationRaw?.formattedAddress?.value);
  const shortAddress = trimToNull(locationRaw?.shortAddress?.value);
  const latitude = locationRaw?.latitude?.value ?? null;
  const longitude = locationRaw?.longitude?.value ?? null;
  // Zero coordinates are valid: explicit null checks, never truthiness.
  const hasPlace = Boolean(
    formattedAddress ||
      shortAddress ||
      (latitude !== null && longitude !== null),
  );
  const location: ResolvedBusiness["location"] = hasPlace
    ? {
        formattedAddress,
        shortAddress,
        city,
        region: trimToNull(locationRaw?.region?.value),
        country: trimToNull(locationRaw?.country?.value),
        latitude,
        longitude,
        mapsUrl,
        directionsUrl: directionsUrlRaw,
        embedUrl,
        hasPlace: true,
      }
    : null;
  if (locationRaw?.mapsUrl?.value && !mapsUrl) {
    warnings.push("location.mapsUrl failed URL validation; dropped.");
  }

  // Contact (fallback rule 7: missing phone removes Call CTAs)
  const phoneRaw = trimToNull(record.contact?.phone?.value);
  const phone = phoneRaw && telHref(phoneRaw) ? phoneRaw : null;
  if (phoneRaw && !phone) warnings.push("contact.phone is not dialable; ignored.");
  const emailRaw = trimToNull(record.contact?.email?.value);
  const email = emailRaw && mailtoHref(emailRaw) ? emailRaw : null;
  if (emailRaw && !email) warnings.push("contact.email failed validation; ignored.");
  const website = safeExternalUrl(record.contact?.website?.value ?? null);
  const socials = (record.contact?.socialLinks ?? []).filter((social) =>
    safeExternalUrl(social.url),
  );

  // CTA priority engine (fallback rules 7, 8, 10)
  const cta = resolveCtas(record);
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

  const tagline = narrativeText("brand.tagline", record.brand?.tagline);

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
    tagline,
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
      priceLevel: trimToNull(record.offering?.priceLevel?.value),
      priceRange: trimToNull(record.offering?.priceRange?.value),
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

export { HOURS_NOT_PROVIDED };
