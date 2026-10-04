import "server-only";

import { placeIdSchema } from "@/lib/poc/schema";

/**
 * Determines the Google place id that may be used to fetch photos of THIS
 * business. Only ids the lead's own Google-sourced data carries are trusted:
 * the ingested business identity (sourceType "google_places") and Google
 * evidence snapshots. A record's self-declared placeId is accepted only when
 * it matches one of those; nothing is ever guessed from the business name.
 */
export interface TrustedPlaceInput {
  recordPlaceId: string | null | undefined;
  business: { sourceType: string; sourceExternalId: string | null };
  snapshots: ReadonlyArray<{ provider: string; sourceIdentifier: string | null }>;
}

function normalizePlaceId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^places\//, "");
  return placeIdSchema.safeParse(trimmed).success ? trimmed : null;
}

export function resolveTrustedPlaceId(input: TrustedPlaceInput): string | null {
  const evidenced = new Set<string>();
  if (input.business.sourceType === "google_places") {
    const id = normalizePlaceId(input.business.sourceExternalId);
    if (id) evidenced.add(id);
  }
  for (const snapshot of input.snapshots) {
    if (snapshot.provider !== "google_places") continue;
    const id = normalizePlaceId(snapshot.sourceIdentifier);
    if (id) evidenced.add(id);
  }

  const declared = normalizePlaceId(input.recordPlaceId);
  if (declared) return evidenced.has(declared) ? declared : null;
  // No declared id: use the evidence only when it is unambiguous.
  return evidenced.size === 1 ? [...evidenced][0]! : null;
}
