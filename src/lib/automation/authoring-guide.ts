import { themeIds, recordSchema, dataOriginSchema, actionKindSchema } from "@/lib/poc/schema";
import { themeMeta } from "@/lib/poc/theme-meta";

/**
 * Read-only POC authoring guide for the external scheduler: the live theme
 * catalog (derived from the single existing registry — never a second list),
 * a minimal schema-valid record example with obviously fictional data, the
 * Sourced-field contract, the allowed enum values (derived from the same
 * schemas that validate writes), and the concise authoring rules. No
 * database, no network, no secrets.
 */

export interface AuthoringGuide {
  themes: Array<{
    id: string;
    name: string;
    description: string;
    character: string;
    supportedCategories: string[];
    typePairing: { display: string; body: string };
    motion: string;
  }>;
  minimalRecordExample: Record<string, unknown>;
  sourcedFieldFormat: Record<string, unknown>;
  allowedValues: {
    dataOrigins: string[];
    recordStatuses: string[];
    businessStatuses: string[];
    actionKinds: string[];
    themeIds: string[];
  };
  authoringRules: string[];
}

export function buildPocAuthoringGuide(): AuthoringGuide {
  const themes = themeIds.map((id) => {
    const meta = themeMeta[id];
    return {
      id: meta.id,
      name: meta.name,
      description: meta.description,
      character: meta.character,
      supportedCategories: meta.supportedCategories,
      typePairing: meta.typePairing,
      motion: meta.motion,
    };
  });

  return {
    themes,
    minimalRecordExample: minimalRecordExample(),
    sourcedFieldFormat: {
      value: "the field value, or null when unknown — never an invented fact",
      source: "one of allowedValues.dataOrigins",
      confidence: "optional 0..1 — required trust level for ai_derived values (>= 0.7)",
      verified: "optional boolean — provider/owner confirmation",
      retrievedAt: 'optional ISO timestamp, e.g. "2026-10-04T00:00:00Z"',
      attribution: "optional { label, url?, authorName?, authorUrl? } — required for provider content that renders",
    },
    allowedValues: {
      dataOrigins: [...dataOriginSchema.options],
      recordStatuses: [...recordSchema.shape.status.options],
      businessStatuses: [...recordSchema.shape.identity.shape.businessStatus.shape.value.unwrap().options],
      actionKinds: [...actionKindSchema.options],
      themeIds: [...themeIds],
    },
    authoringRules: [
      "Never invent factual business data; unknown values are omitted or null where allowed.",
      "Every factual value must use the Sourced wrapper (see sourcedFieldFormat).",
      "Images must carry valid provenance; untrusted origins are replaced by the theme placeholder at render time.",
      "Do not pick pictures: upsert_poc_record resolves media automatically (record media → Google place photos at render time via the lead's evidenced place id → Unsplash concept imagery → theme concept art). Set identity.placeId only from Google evidence; never author media.resolution, unsplash images, or googleusercontent URLs.",
      "Reviews and menus must include provenance; AI-derived menus must use sample mode with the demonstration notice.",
      "Pick the theme from supportedCategories and the business character (themes[].character).",
      "Run run_poc_qa and require a pass before publish_poc; QA failures cannot be overridden.",
      "Never call send_outreach while health.sendingEnabled is false.",
    ],
  };
}

/**
 * A compact, complete BusinessPocRecord that passes recordSchema. Every
 * business fact is obviously fictional placeholder data sourced as "manual"
 * (a demo record, not a real business).
 */
function minimalRecordExample(): Record<string, unknown> {
  return {
    schemaVersion: 1,
    id: "rec-sample-fictional-0001",
    slug: "sample-fictional-cafe",
    status: "active",
    themeId: "heritage-bistro",
    identity: {
      name: { value: "The Fictional Sample Café (demo data)", source: "manual", verified: true },
      primaryCategory: { value: "Café", source: "manual", verified: true },
      categories: { value: ["Café", "Bakery"], source: "manual" },
      businessStatus: { value: "operational", source: "manual", verified: true },
    },
    hero: {
      // Empty hero actions are explicit nulls; copy comes from the record's
      // own fields or falls back safely at render time.
      primaryAction: null,
      secondaryAction: null,
    },
    contact: {
      phone: { value: "+1 555 010 0100", source: "manual", verified: false },
      website: { value: "https://example.com", source: "manual" },
    },
    location: {
      city: { value: "Sample City", source: "manual" },
      formattedAddress: { value: "1 Fictional Demo Street, Sample City", source: "manual" },
    },
    media: { images: [] },
    poc: {
      disclaimer:
        "This is an unofficial concept website created for demonstration. It is not published by or endorsed by the business.",
      createdAt: "2026-10-04T00:00:00Z",
    },
    callsToAction: {
      // One provenance-carrying CTA example; omit the block when the
      // business has no real ordering destination.
      order: {
        label: "Order online",
        href: "https://example.com/order",
        kind: "order",
        external: true,
        source: "manual",
        verified: false,
      },
    },
  };
}
