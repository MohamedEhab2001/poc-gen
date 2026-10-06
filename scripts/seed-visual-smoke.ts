/**
 * Seeds rich fixture records plus sparse synthetic records for the visual
 * redesign smoke targets, so before/after screenshots and browser QA can run
 * against the production server:
 *
 *   node --import tsx --conditions=react-server scripts/seed-visual-smoke.ts --database=postgres://...
 *
 * Rich variants reuse the canonical src/data/businesses fixtures (with the
 * slug/id namespaced and motion forced to expressive so QA exercises the
 * full motion language). Sparse variants are synthetic, like
 * automation-smoke. Prints one /p/<token> URL per variant at the end.
 */

import { randomBytes } from "node:crypto";

function syntheticCandidate(suffix: string) {
  return {
    candidateKey: `vis-smoke-${suffix}`,
    business: {
      sourceType: "smoke_test",
      sourceExternalId: `vis-smoke-place-${suffix}`,
      displayName: "Harbor Fig Kitchen",
      primaryCategory: "Restaurant",
      website: `https://harborfig-${suffix}.example.com`,
      phone: `+1 (503) 555-01${suffix.slice(0, 2).padEnd(2, "0")}`,
      address: `${suffix} Smoke Test Way, Portland, OR 97209`,
      city: "Portland",
      region: "Oregon",
      country: "United States",
    },
    score: 82,
    scoreReasons: ["synthetic-smoke-lead", "verified-public-contact"],
    evidence: [
      {
        // google_places so provider-sourced facts in the rich fixtures pass
        // the deterministic provider-evidence gate.
        provider: "google_places",
        sourceIdentifier: `vis-smoke-evidence-${suffix}`,
        retrievedAt: new Date().toISOString(),
        payload: {
          note: "synthetic evidence — no real business data",
          publicFacts: { category: "Restaurant", hasPublicEmail: true },
        },
        attribution: { label: "Synthetic smoke data (no provider)" },
      },
    ],
    contact: {
      address: `owner@harborfig-${suffix}.example.com`,
      verified: true,
      provenance: "official_website",
    },
  };
}

function syntheticRecord(suffix: string, themeId: string) {
  const now = new Date().toISOString();
  const sv = (value: unknown, source = "official_website", verified = true) => ({
    value,
    source,
    verified,
  });
  return {
    schemaVersion: 1,
    id: `rec-vis-smoke-${suffix}`,
    slug: `vis-smoke-${themeId}-${suffix}`,
    status: "active",
    expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    themeId,
    identity: {
      name: sv("Harbor Fig Kitchen"),
      primaryCategory: sv("Restaurant"),
      categories: sv(["Restaurant", "Cafe"]),
      businessStatus: sv("operational"),
    },
    hero: {
      headline: sv("Coastal cooking, wood-fired and unfussy", "manual"),
    },
    contact: {
      phone: sv(`+1 (503) 555-01${suffix.slice(0, 2).padEnd(2, "0")}`),
    },
    location: {
      formattedAddress: sv(`${suffix} Smoke Test Way, Portland, OR 97209`),
      city: sv("Portland"),
      region: sv("Oregon"),
      country: sv("United States"),
    },
    media: { images: [] },
    poc: {
      disclaimer:
        "This is an unofficial concept website created for demonstration. It is not published by or endorsed by the business.",
      createdAt: now,
      leadId: null,
    },
  };
}

async function main() {
  const { configureSmokeEnvironment } = await import("./smoke-env");
  configureSmokeEnvironment(process.argv.slice(2));

  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const dbUrl = process.env.DATABASE_URL ?? process.env.TEST_DATABASE_URL!;
  const client = postgres(dbUrl, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: "src/server/db/migrations" });
    console.log("migrations applied");
  } finally {
    await client.end();
  }

  const { dispatchOperation } = await import("@/server/automation/registry");
  const { closeDb } = await import("@/server/db/client");
  const { folioCoffeeRoasters } = await import("@/data/businesses/folio-coffee-roasters");
  const { junosDiner } = await import("@/data/businesses/junos-diner");
  const { sableRoom } = await import("@/data/businesses/sable-room");

  const principal = { principal: "visual-smoke", scopes: ["poc:read", "poc:write"] as const };
  const call = (operation: string, input: unknown) =>
    dispatchOperation(operation, input, { ...principal, baseUrl: "http://localhost:3000" });

  const urls: Record<string, string> = {};

  async function seed(label: string, record: Record<string, unknown>) {
    const suffix = randomBytes(3).toString("hex");
    record = { ...record, slug: `${record.slug}-${suffix}` };
    const key = (tag: string) => `vis-${tag}-${suffix}`;
    const run = await call("start_automation_run", {
      idempotencyKey: key("run"),
      kind: "daily_smoke",
    });
    const runId = ((run as { result?: { runId?: string } }).result?.runId) ?? "";
    if (!runId) throw new Error(`run start failed for ${label}: ${JSON.stringify(run).slice(0, 300)}`);
    const ingested = await call("ingest_leads", {
      idempotencyKey: key("ingest"),
      runId,
      candidates: [syntheticCandidate(suffix)],
    });
    const created = ((ingested as { result?: { results?: Array<Record<string, unknown>> } }).result?.results ?? [])[0];
    if (!created) throw new Error(`ingest failed for ${label}`);
    const leadId = created.leadId as string;
    const snapshotIds = created.snapshotIds as string[];
    const upsert = await call("upsert_poc_record", {
      idempotencyKey: key("upsert"),
      runId,
      leadId,
      record: { ...record, id: `${record.id}-${suffix}` },
      evidenceRefs: snapshotIds,
      reason: "visual-smoke",
    });
    if ((upsert as { ok?: boolean }).ok === false) {
      throw new Error(`upsert failed for ${label}: ${JSON.stringify(upsert).slice(0, 400)}`);
    }
    const qa = await call("run_poc_qa", { idempotencyKey: key("qa"), runId, leadId });
    const qaResult = (qa as { result?: { passed?: boolean; blockingFailures?: string[]; checks?: Array<{ id: string; passed: boolean; severity?: string }> } }).result;
    if (!qaResult?.passed) {
      console.warn(`QA blocked ${label}: ${JSON.stringify(qaResult?.blockingFailures ?? qa).slice(0, 400)}`);
    }
    const published = await call("publish_poc", {
      idempotencyKey: key("publish"),
      runId,
      leadId,
      expiresInDays: 30,
      maxViews: 500,
    });
    const url = ((published as { result?: { shareLinkUrl?: string } }).result?.shareLinkUrl) ?? undefined;
    if (url) urls[label] = url;
    if (!url) console.log(`publish detail for ${label}: ${JSON.stringify(published).slice(0, 400)}`);
    console.log(`seeded ${label}: ${url ?? "NO LINK"}`);
  }

  // Rich variants: canonical fixtures, motion forced to expressive for QA.
  // Google-sourced review entries get a sourceUrl on the seeded copy so the
  // blocking ATTRIBUTION_METADATA check passes (the canonical fixtures omit
  // it; the enrichment never touches the fixture files).
  const withReviewSources = (fixture: Record<string, unknown>) => ({
    ...fixture,
    reputation: fixture.reputation
      ? {
          ...((fixture.reputation as Record<string, unknown>) ?? {}),
          reviews: ((fixture.reputation as { reviews?: Array<Record<string, unknown>> }).reviews ?? []).map(
            (review, index) => ({
              sourceUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(fixture.slug))}#review-${index}`,
              ...review,
            }),
          ),
        }
      : undefined,
  });
  const rich = [
    ["rich-coffee-editorial", folioCoffeeRoasters],
    ["rich-american-diner", junosDiner],
    ["rich-luxury-fine-dining", sableRoom],
  ] as const;
  for (const [label, fixture] of rich) {
    await seed(label, {
      ...withReviewSources(fixture as unknown as Record<string, unknown>),
      slug: `vis-${fixture.slug}`,
      themeOverrides: { ...(fixture.themeOverrides ?? {}), motion: "expressive" },
    });
  }

  // Sparse variants: one synthetic record per target theme.
  for (const themeId of ["coffee-editorial", "american-diner", "luxury-fine-dining"]) {
    const suffix = randomBytes(3).toString("hex");
    await seed(`sparse-${themeId}`, syntheticRecord(suffix, themeId));
  }

  await closeDb();
  console.log("VISUAL_URLS=" + JSON.stringify(urls));
}

main().catch((error) => {
  console.error("seed failed:", error);
  process.exit(1);
});
