import { recordSchema } from "./schema";
import type { BusinessPocRecord } from "./types";
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
 * interface so a future pipeline can swap the fixture source for PostgreSQL
 * without touching routes, themes, or normalization.
 *
 * Future adapter (PostgreSQL):
 *   export class PostgresBusinessPocRepository implements BusinessPocRepository {
 *     constructor(private db: Database) {}
 *     async getBySlug(slug: string) {
 *       const row = await this.db.select().from(pocRecords).where(eq(pocRecords.slug, slug));
 *       return row ? recordSchema.parse(row.data) : null;
 *     }
 *     async listAll() { ... }
 *   }
 * Records stay JSON documents in the database; the Zod schema above remains
 * the single validation boundary. Externously sourced details (ratings,
 * hours) can be refreshed at render time by the adapter before parsing.
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

/** Returns the active repository. Fixture-backed until a database adapter is wired in. */
export function getPocRepository(): BusinessPocRepository {
  if (!active) active = new FixtureBusinessPocRepository();
  return active;
}
