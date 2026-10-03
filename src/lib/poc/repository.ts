import { recordSchema } from "./schema";
import type { BusinessPocRecord } from "./types";
import {
  PostgresBusinessPocRepository,
  UnavailableBusinessPocRepository,
} from "@/server/poc/repository-pg";
import { merchantAndVine } from "@/data/businesses/merchant-and-vine";
import { afterglowDessertBar } from "@/data/businesses/afterglow-dessert-bar";
import { hakoTeaRoom } from "@/data/businesses/hako-tea-room";
import { tavernaOnda } from "@/data/businesses/taverna-onda";
import { folioCoffeeRoasters } from "@/data/businesses/folio-coffee-roasters";
import { junosDiner } from "@/data/businesses/junos-diner";
import { sableRoom } from "@/data/businesses/sable-room";
import { lobaTaqueria } from "@/data/businesses/loba-taqueria";
import { sageAndSparrow } from "@/data/businesses/sage-and-sparrow";
import { foundryCoffeeLab } from "@/data/businesses/foundry-coffee-lab";
import { fjordCoffeePartial } from "@/data/businesses/fjord-coffee-partial";
import { cornerPhoMinimal } from "@/data/businesses/corner-pho-minimal";
import { docksideProvisionsClosed } from "@/data/businesses/dockside-provisions-closed";
import { oldMillCantinaPermanent } from "@/data/businesses/old-mill-cantina-permanent";
import { sunsetRamenExpired } from "@/data/businesses/sunset-ramen-expired";
import { theGildedFan } from "@/data/businesses/the-gilded-fan";
import { maisonLumen } from "@/data/businesses/maison-lumen";
import { fizzClub } from "@/data/businesses/fizz-club";

/**
 * Repository abstraction. The app reads POC records only through this
 * interface so the pipeline can swap the fixture source for PostgreSQL
 * without touching routes, themes, or normalization.
 *
 * Phase 2A: a PostgreSQL adapter exists (src/server/poc/repository-pg.ts).
 * Selection is explicit and deterministic:
 * - production (auto): PostgreSQL when DATABASE_URL is set, otherwise a
 *   fail-closed unavailable repository (customer records must come from the
 *   database in production);
 * - development/test (auto): fixtures, preserving the zero-config flow;
 * - POC_REPOSITORY_MODE=postgres|fixtures forces a mode deliberately
 *   (fixtures are structurally impossible to force in production).
 * Fixtures remain available for development and the theme showroom;
 * production customer records come from PostgreSQL.
 */
export interface BusinessPocRepository {
  getBySlug(slug: string): Promise<BusinessPocRecord | null>;
  listAll(): Promise<BusinessPocRecord[]>;
}

const fixtures: unknown[] = [
  merchantAndVine,
  afterglowDessertBar,
  hakoTeaRoom,
  tavernaOnda,
  folioCoffeeRoasters,
  junosDiner,
  sableRoom,
  lobaTaqueria,
  sageAndSparrow,
  foundryCoffeeLab,
  fjordCoffeePartial,
  cornerPhoMinimal,
  docksideProvisionsClosed,
  oldMillCantinaPermanent,
  sunsetRamenExpired,
  theGildedFan,
  maisonLumen,
  fizzClub,
];

let cache: BusinessPocRecord[] | null = null;

function loadAll(): BusinessPocRecord[] {
  if (cache) return cache;
  const parsed: BusinessPocRecord[] = [];
  for (const fixture of fixtures) {
    const result = recordSchema.safeParse(fixture);
    if (result.success) {
      parsed.push(result.data);
    } else {
      const slug =
        typeof fixture === "object" && fixture !== null && "slug" in fixture
          ? String((fixture as { slug: unknown }).slug)
          : "unknown";
      console.error(`[poc] Fixture "${slug}" failed schema validation`, result.error.issues);
    }
  }
  cache = parsed;
  return parsed;
}

export class FixtureBusinessPocRepository implements BusinessPocRepository {
  async getBySlug(slug: string): Promise<BusinessPocRecord | null> {
    return loadAll().find((record) => record.slug === slug) ?? null;
  }

  async listAll(): Promise<BusinessPocRecord[]> {
    return loadAll();
  }
}

let active: BusinessPocRepository | null = null;

/** Test seam: pin a repository explicitly (tests, smoke). */
export function setPocRepository(repository: BusinessPocRepository): void {
  active = repository;
}

/** Test seam: clear the pinned repository and re-run selection. */
export function resetPocRepository(): void {
  active = null;
}

/**
 * Returns the active repository. Selection is deterministic (see the module
 * comment); the fixture repository is never silently swapped mid-process.
 * The PostgreSQL adapter is statically imported: every consumer of this
 * module is server-side, and the adapter's "server-only" marker turns any
 * accidental client import into a build error (the boundary we want).
 */
export function getPocRepository(): BusinessPocRepository {
  if (active) return active;
  const kind = selectRepositoryKind();
  if (kind === "postgres") {
    active = new PostgresBusinessPocRepository();
  } else if (kind === "unavailable") {
    active = new UnavailableBusinessPocRepository();
  } else {
    active = new FixtureBusinessPocRepository();
  }
  return active;
}

function selectRepositoryKind(): "fixtures" | "postgres" | "unavailable" {
  const env = process.env as Record<string, string | undefined>;
  const nodeEnv = env.NODE_ENV;
  const hasDb = Boolean(nodeEnv === "test" ? env.TEST_DATABASE_URL ?? env.DATABASE_URL : env.DATABASE_URL);
  const mode = env.POC_REPOSITORY_MODE;
  if (mode === "postgres") return hasDb ? "postgres" : "unavailable";
  if (mode === "fixtures") return nodeEnv === "production" ? "unavailable" : "fixtures";
  if (nodeEnv === "production") return hasDb ? "postgres" : "unavailable";
  return "fixtures";
}
