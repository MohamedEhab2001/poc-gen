import "server-only";

import { getPocRepository } from "@/lib/poc/repository";
import { PostgresBusinessPocRepository } from "./repository-pg";
import type { BusinessPocRecord } from "@/lib/poc/schema";

/**
 * Customer-path record resolution for /p/[token]. Both the share link AND
 * the POC publication state must be valid at request time: the persistent
 * adapter additionally enforces state=published and expiration, while the
 * fixture adapter (development) relies on the record's own disposition.
 */
export async function getShareableRecord(slug: string, now: Date = new Date()): Promise<BusinessPocRecord | null> {
  const repository = getPocRepository();
  if (repository instanceof PostgresBusinessPocRepository) {
    return repository.getPublishedBySlug(slug, now);
  }
  return repository.getBySlug(slug);
}
