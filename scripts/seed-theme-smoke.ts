/**
 * Seeds one published POC per theme (synthetic data only) so every theme
 * can be smoke-tested through the real production server via /p/<token>:
 *
 *   node --import tsx --conditions=react-server scripts/seed-theme-smoke.ts
 *
 * Uses the same automation operations as automation-smoke. Prints one URL
 * per theme at the end.
 */

import { randomBytes } from "node:crypto";

function syntheticCandidate(suffix: string) {
  return {
    candidateKey: `motion-smoke-${suffix}`,
    business: {
      sourceType: "smoke_test",
      sourceExternalId: `motion-smoke-place-${suffix}`,
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
        provider: "smoke_test",
        sourceIdentifier: `motion-smoke-evidence-${suffix}`,
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
    id: `rec-motion-smoke-${suffix}`,
    slug: `motion-smoke-${themeId}-${suffix}`,
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
  const { themeIds } = await import("@/lib/poc/schema");

  const principal = {
    principal: "motion-smoke",
    scopes: ["poc:read", "poc:write"] as const,
  };
  const call = (operation: string, input: unknown) =>
    dispatchOperation(operation, input, { ...principal, baseUrl: "http://localhost:3000" });

  const urls: Record<string, string> = {};

  for (const themeId of themeIds) {
    const suffix = randomBytes(3).toString("hex");
    const key = (label: string) => `motion-${label}-${suffix}`;
    const run = await call("start_automation_run", {
      idempotencyKey: key("run"),
      kind: "daily_smoke",
    });
    const runResult = (run as { result?: Record<string, unknown> }).result;
    const runId = ((runResult?.runId as string) ?? (runResult?.id as string) ?? "");
    if (!runId) {
      console.error(`run start failed for ${themeId}:`, JSON.stringify(run).slice(0, 400));
      continue;
    }
    const ingested = await call("ingest_leads", {
      idempotencyKey: key("ingest"),
      runId,
      candidates: [syntheticCandidate(suffix)],
    });
    if ((ingested as { ok?: boolean }).ok === false) {
      console.error(`ingest failed for ${themeId}:`, JSON.stringify(ingested));
      continue;
    }
    const result = (ingested as { result?: { results?: Array<Record<string, unknown>> } }).result;
    const created = (result?.results ?? [])[0];
    if (!created || created.outcome === "skipped") {
      console.error(`ingest unexpected for ${themeId}:`, created);
      continue;
    }
    const leadId = created.leadId as string;
    const snapshotIds = created.snapshotIds as string[];
    await call("upsert_poc_record", {
      idempotencyKey: key("upsert"),
      runId,
      leadId,
      record: syntheticRecord(suffix, themeId),
      evidenceRefs: snapshotIds,
      reason: "motion-smoke",
    });
    await call("run_poc_qa", { idempotencyKey: key("qa"), runId, leadId });
    const published = await call("publish_poc", {
      idempotencyKey: key("publish"),
      runId,
      leadId,
      expiresInDays: 7,
      maxViews: 50,
    });
    const url = ((published as { result?: { shareLinkUrl?: string } }).result?.shareLinkUrl) ?? undefined;
    if (url) urls[themeId] = url;
    console.log(`seeded ${themeId}: ${url ?? "NO LINK"}`);
  }

  await closeDb();
  console.log("THEME_URLS=" + JSON.stringify(urls));
}

main().catch((error) => {
  console.error("seed failed:", error);
  process.exit(1);
});
