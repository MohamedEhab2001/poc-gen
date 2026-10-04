import { z } from "zod";

/**
 * Raw POC record schema. This is the contract the future lead-generation
 * pipeline must satisfy. Every third-party or enrichment field is nullable
 * or optional unless truly required.
 *
 * themeId is intentionally a plain string at this layer so that records
 * carrying an unknown theme can still be loaded and safely routed to the
 * documented fallback theme (see theme-registry). Use strictThemeIdSchema
 * when a caller wants hard rejection of unknown themes.
 */
export const themeIds = [
  "heritage-bistro",
  "neon-night",
  "minimal-japanese",
  "mediterranean-sun",
  "coffee-editorial",
  "american-diner",
  "luxury-fine-dining",
  "street-food-poster",
  "botanical-brunch",
  "modern-industrial",
  "deco-supper-club",
  "atelier-lookbook",
  "memphis-play",
] as const;

export type ThemeId = (typeof themeIds)[number];

export const strictThemeIdSchema = z.enum(themeIds);

export const slugSchema = z
  .string()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case");

export const dataOriginSchema = z.enum([
  "google_places",
  "business_owner",
  "official_website",
  "official_social",
  "licensed_asset",
  "ai_derived",
  "manual",
  "fallback",
  /**
   * Unsplash stock photography resolved automatically as CONCEPT imagery.
   * Never business-specific: it only ever illustrates the category and must
   * carry a visible "Concept imagery · Photo by … on Unsplash" credit.
   */
  "unsplash",
]);

export const attributionSchema = z.object({
  label: z.string().min(1),
  url: z.string().url().nullable().optional(),
  authorName: z.string().nullable().optional(),
  authorUrl: z.string().url().nullable().optional(),
});

export function sourced<T extends z.ZodTypeAny>(inner: T) {
  return z.object({
    value: inner.nullable(),
    source: dataOriginSchema,
    confidence: z.number().min(0).max(1).nullable().optional(),
    verified: z.boolean().optional(),
    retrievedAt: z.string().datetime().nullable().optional(),
    attribution: attributionSchema.nullable().optional(),
  });
}

export const focalPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const pocImageSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  alt: z.string(),
  role: z.enum(["logo", "hero", "gallery", "about", "menu", "location"]).optional(),
  source: dataOriginSchema,
  /** Trust fields for direct media: policy applies exactly as to text. */
  confidence: z.number().min(0).max(1).nullable().optional(),
  verified: z.boolean().optional(),
  retrievedAt: z.string().datetime().nullable().optional(),
  attribution: attributionSchema.nullable().optional(),
  /** License identifier when the asset carries one (for example "CC-BY-2.0"). */
  license: z.string().max(120).nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  blurDataUrl: z.string().nullable().optional(),
  focalPoint: focalPointSchema.nullable().optional(),
  /** Dominant color (#rrggbb) used as the loading backdrop when known. */
  averageColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  /** Provider asset id (for example the Unsplash photo id) for deduplication. */
  providerId: z.string().max(64).nullable().optional(),
});

/** Google place ids: opaque URL-safe tokens (no resource-name prefix). */
export const placeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{4,256}$/);

/**
 * Server-managed media resolution metadata, written only by the automation
 * bridge at generation time (any caller-supplied value is overwritten).
 * Google photo names/URIs are NEVER stored here: they expire and must not be
 * cached, so Google photos resolve at render time from the trusted place id.
 */
export const mediaResolutionSchema = z
  .object({
    /** Place id confirmed against the lead's own Google evidence. */
    trustedPlaceId: placeIdSchema.nullable().optional(),
    /** Deterministic Unsplash query used for the stored concept imagery. */
    conceptQuery: z.string().max(120).nullable().optional(),
  })
  .strict();

export const actionKindSchema = z.enum([
  "order",
  "reserve",
  "call",
  "directions",
  "email",
  "external",
]);

export const actionLinkSchema = z.object({
  label: z.string().min(1).max(64),
  href: z.string().min(1).max(2048),
  kind: actionKindSchema,
  external: z.boolean().optional(),
  /** Provenance is required: unsourced actions never render. */
  source: dataOriginSchema,
  confidence: z.number().min(0).max(1).nullable().optional(),
  verified: z.boolean().optional(),
});

export const socialLinkSchema = z.object({
  platform: z.enum(["instagram", "facebook", "tiktok", "youtube", "x", "other"]),
  url: z.string().url(),
  label: z.string().max(48).optional(),
});

export const menuSectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(64),
  description: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(96),
        description: z.string().nullable().optional(),
        price: z.string().max(24).nullable().optional(),
        image: pocImageSchema.nullable().optional(),
        tags: z.array(z.string().max(32)).max(8).optional(),
        featured: z.boolean().optional(),
      }),
    )
    .max(40),
});

export const recordSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    slug: slugSchema,
    status: z.enum(["draft", "active", "expired", "archived"]),
    expiresAt: z.string().datetime().nullable().optional(),
    themeId: z.string().min(1),
    themeOverrides: z
      .object({
        primaryColor: z.string().nullable().optional(),
        secondaryColor: z.string().nullable().optional(),
        accentColor: z.string().nullable().optional(),
        backgroundColor: z.string().nullable().optional(),
        displayFont: z.string().nullable().optional(),
        bodyFont: z.string().nullable().optional(),
        density: z.enum(["compact", "comfortable", "spacious"]).nullable().optional(),
        motion: z.enum(["none", "subtle", "expressive"]).nullable().optional(),
      })
      .nullable()
      .optional(),

    identity: z.object({
      placeId: z.string().nullable().optional(),
      name: sourced(z.string().min(1).max(96)),
      shortName: sourced(z.string().min(1).max(48)).optional(),
      primaryCategory: sourced(z.string().min(1).max(64)),
      categories: sourced(z.array(z.string().min(1).max(48)).max(12)),
      businessStatus: sourced(
        z.enum(["operational", "temporarily_closed", "permanently_closed", "unknown"]),
      ),
    }),

    brand: z
      .object({
        logo: sourced(pocImageSchema).optional(),
        wordmark: sourced(z.string().min(1).max(64)).optional(),
        tagline: sourced(z.string().min(1).max(140)).optional(),
        palette: z
          .object({
            primary: sourced(z.string().min(4).max(32)).optional(),
            secondary: sourced(z.string().min(4).max(32)).optional(),
            accent: sourced(z.string().min(4).max(32)).optional(),
            background: sourced(z.string().min(4).max(32)).optional(),
            foreground: sourced(z.string().min(4).max(32)).optional(),
          })
          .optional(),
      })
      .optional(),

    hero: z.object({
      eyebrow: sourced(z.string().min(1).max(64)).optional(),
      headline: sourced(z.string().min(1).max(140)).optional(),
      subheadline: sourced(z.string().min(1).max(280)).optional(),
      image: sourced(pocImageSchema).optional(),
      primaryAction: actionLinkSchema.nullable().optional(),
      secondaryAction: actionLinkSchema.nullable().optional(),
    }),

    contact: z
      .object({
        phone: sourced(z.string().min(7).max(32)).optional(),
        email: sourced(z.string().email()).optional(),
        website: sourced(z.string().url()).optional(),
        socialLinks: sourced(z.array(socialLinkSchema).max(8)).optional(),
      })
      .optional(),

    location: z
      .object({
        formattedAddress: sourced(z.string().min(4).max(200)).optional(),
        shortAddress: sourced(z.string().min(4).max(120)).optional(),
        city: sourced(z.string().min(1).max(64)).optional(),
        region: sourced(z.string().min(1).max(64)).optional(),
        country: sourced(z.string().min(1).max(64)).optional(),
        latitude: sourced(z.number().min(-90).max(90)).optional(),
        longitude: sourced(z.number().min(-180).max(180)).optional(),
        timezone: sourced(z.string().min(1).max(48)).optional(),
        mapsUrl: sourced(z.string().url()).optional(),
        directionsUrl: sourced(z.string().url()).optional(),
        embedUrl: sourced(z.string().url()).optional(),
      })
      .optional(),

    hours: z
      .object({
        openNow: sourced(z.boolean()).optional(),
        statusLabel: sourced(z.string().min(1).max(64)).optional(),
        nextOpenTime: sourced(z.string().min(1).max(64)).optional(),
        nextCloseTime: sourced(z.string().min(1).max(64)).optional(),
        weekdayDescriptions: sourced(z.array(z.string().min(1).max(80)).max(7)).optional(),
        periods: sourced(
          z
            .array(
              z.object({
                day: z.string().min(1).max(12),
                open: z.string().min(1).max(12),
                close: z.string().min(1).max(12),
                isClosed: z.boolean().optional(),
              }),
            )
            .max(14),
        ).optional(),
      })
      .optional(),

    reputation: z
      .object({
        rating: sourced(z.number().min(0).max(5)).optional(),
        reviewCount: sourced(z.number().int().min(0).max(10_000_000)).optional(),
        summary: sourced(z.string().min(1).max(400)).optional(),
        reviews: z
          .array(
            z.object({
              id: z.string().min(1),
              authorName: z.string().min(1).max(64),
              authorAvatarUrl: z.string().url().nullable().optional(),
              rating: z.number().min(1).max(5),
              text: z.string().min(1).max(600),
              publishedAt: z.string().nullable().optional(),
              sourceUrl: z.string().url().nullable().optional(),
              /** Provenance is required: a review without a source never renders. */
              source: dataOriginSchema,
              confidence: z.number().min(0).max(1).nullable().optional(),
              verified: z.boolean().optional(),
              retrievedAt: z.string().datetime().nullable().optional(),
              attribution: attributionSchema.nullable().optional(),
            }),
          )
          .max(12)
          .optional(),
        reviewsUrl: sourced(z.string().url()).optional(),
        writeReviewUrl: sourced(z.string().url()).optional(),
      })
      .optional(),

    media: z.object({
      images: z.array(pocImageSchema).max(24),
      galleryTitle: sourced(z.string().min(1).max(80)).optional(),
      resolution: mediaResolutionSchema.nullable().optional(),
    }),

    offering: z
      .object({
        priceLevel: sourced(z.string().min(1).max(8)).optional(),
        priceRange: sourced(z.string().min(1).max(24)).optional(),
        services: z
          .object({
            delivery: sourced(z.boolean()).optional(),
            takeout: sourced(z.boolean()).optional(),
            dineIn: sourced(z.boolean()).optional(),
            curbsidePickup: sourced(z.boolean()).optional(),
            reservable: sourced(z.boolean()).optional(),
          })
          .optional(),
        mealTypes: sourced(z.array(z.string().min(1).max(32)).max(8)).optional(),
        dietaryOptions: sourced(z.array(z.string().min(1).max(32)).max(8)).optional(),
        menu: z
          .object({
            mode: z.enum(["verified", "sample", "hidden"]),
            /** Explicit provenance: missing source fails validation (no silent manual default). */
            source: dataOriginSchema,
            verified: z.boolean().optional(),
            notice: z.string().max(280).nullable().optional(),
            sections: z.array(menuSectionSchema).max(12),
          })
          .optional(),
      })
      .optional(),

    amenities: z
      .object({
        outdoorSeating: sourced(z.boolean()).optional(),
        liveMusic: sourced(z.boolean()).optional(),
        allowsDogs: sourced(z.boolean()).optional(),
        goodForChildren: sourced(z.boolean()).optional(),
        goodForGroups: sourced(z.boolean()).optional(),
        goodForWatchingSports: sourced(z.boolean()).optional(),
        restroom: sourced(z.boolean()).optional(),
        parking: sourced(z.array(z.string().min(1).max(48)).max(6)).optional(),
        paymentMethods: sourced(z.array(z.string().min(1).max(32)).max(8)).optional(),
        accessibility: sourced(z.array(z.string().min(1).max(48)).max(8)).optional(),
      })
      .optional(),

    content: z
      .object({
        aboutTitle: sourced(z.string().min(1).max(80)).optional(),
        aboutBody: sourced(z.string().min(1).max(1200)).optional(),
        neighborhoodSummary: sourced(z.string().min(1).max(400)).optional(),
        announcement: sourced(z.string().min(1).max(200)).optional(),
      })
      .optional(),

    callsToAction: z
      .object({
        order: actionLinkSchema.nullable().optional(),
        reserve: actionLinkSchema.nullable().optional(),
        call: actionLinkSchema.nullable().optional(),
        directions: actionLinkSchema.nullable().optional(),
        email: actionLinkSchema.nullable().optional(),
      })
      .optional(),

    poc: z.object({
      conceptLabel: z.string().min(1).max(64).optional(),
      disclaimer: z.string().min(1).max(400),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime().nullable().optional(),
      leadId: z.string().nullable().optional(),
    }),
  })
  .strict()
  .superRefine((record, ctx) => {
    // Wrapped images (logo, hero) carry provenance on BOTH the Sourced
    // wrapper and the image itself. The wrapper is authoritative at render
    // time, and the two must agree — mixing layers can never smuggle a
    // trust level across the policy boundary.
    const wrapped: Array<[string, { source?: string } | undefined, { source?: string } | null | undefined]> = [
      ["brand.logo", record.brand?.logo, record.brand?.logo?.value ?? null],
      ["hero.image", record.hero.image, record.hero.image?.value ?? null],
    ];
    for (const [field, wrapper, image] of wrapped) {
      if (wrapper?.source && image?.source && wrapper.source !== image.source) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: field.split("."),
          message: `Wrapped image provenance mismatch: wrapper source "${wrapper.source}" != image source "${image.source}".`,
        });
      }
    }
  });

export type BusinessPocRecord = z.infer<typeof recordSchema>;
export type DataOrigin = z.infer<typeof dataOriginSchema>;
export type Attribution = z.infer<typeof attributionSchema>;
export type PocImage = z.infer<typeof pocImageSchema>;
export type MediaResolution = z.infer<typeof mediaResolutionSchema>;
export type ActionLink = z.infer<typeof actionLinkSchema>;
export type ActionKind = z.infer<typeof actionKindSchema>;
export type SocialLink = z.infer<typeof socialLinkSchema>;
export type Sourced<T> = {
  value: T | null;
  source: DataOrigin;
  confidence?: number | null;
  verified?: boolean;
  retrievedAt?: string | null;
  attribution?: Attribution | null;
};
export type MenuSection = z.infer<typeof menuSectionSchema>;
