import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, cp, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { resolveIntegrationTestDatabaseUrl } from "@/server/db/url";
import { getDb, closeDb } from "@/server/db/client";
import { automationRunSteps } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { dispatchOperation } from "./registry";
import { recordSchema } from "@/lib/poc/schema";
import { DISCLAIMER } from "@/data/businesses/helpers";

/**
 * Contactless POC pipeline coverage: an evidence-backed lead WITHOUT a
 * verified contact must generate, QA-pass, and publish a POC; outreach
 * preparation must then fail safely with contact_not_verified. Also covers
 * the structured lifecycle error and failed-run-step diagnostics.
 */

const dbUrl = resolveIntegrationTestDatabaseUrl();

describe.skipIf(!dbUrl)("contactless POC pipeline (integration)", () => {
  const ALL_SCOPES = ["poc:read", "poc:write", "outreach:prepare", "outreach:send", "reports:read"] as const;
  const suffix = randomBytes(4).toString("hex");

  function call(operation: string, input: unknown) {
    return dispatchOperation(operation, input, {
      principal: "integration-test",
      scopes: [...ALL_SCOPES],
      baseUrl: "http://localhost:3000",
    });
  }
  async function ok(operation: string, input: unknown): Promise<Record<string, unknown>> {
    const result = await call(operation, input);
    if (!result.ok) throw new Error(`${operation} failed: ${JSON.stringify(result.failure)}`);
    return result.result as Record<string, unknown>;
  }
  async function failureOf(operation: string, input: unknown) {
    const result = await call(operation, input);
    if (result.ok) throw new Error(`${operation} unexpectedly succeeded`);
    return result.failure;
  }

  const key = `cl${suffix}`;

  beforeAll(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.CONTACT_DATA_ENCRYPTION_KEYS = `clk:${randomBytes(32).toString("base64")}`;
    process.env.CONTACT_DATA_ACTIVE_KEY_ID = "clk";
    process.env.AUTOMATION_ENABLED = "true";
    process.env.OUTREACH_SEND_ENABLED = "false";
    process.env.OUTREACH_EMAIL_PROVIDER = "mock";
    process.env.SHARE_LINK_BASE_URL = "http://localhost:3000";

    const staging = await mkdtemp(join(tmpdir(), "poc-gen-migrations-"));
    try {
      await mkdir(`${staging}/meta`, { recursive: true });
      for (const file of [
        "0000_share_links.sql",
        "0001_automation_bridge.sql",
        "0002_phase2a1_hardening.sql",
      ]) {
        await cp(`src/server/db/migrations/${file}`, `${staging}/${file}`);
      }
      await cp("src/server/db/migrations/meta", `${staging}/meta`, { recursive: true });
      const admin = postgres(dbUrl!, { max: 1, prepare: false });
      try {
        await admin`DROP SCHEMA IF EXISTS drizzle CASCADE`;
        await admin`DROP SCHEMA public CASCADE`;
        await admin`CREATE SCHEMA public`;
        await migrate(drizzle(admin), { migrationsFolder: staging });
      } finally {
        await admin.end();
      }
    } finally {
      await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  afterAll(async () => {
    await closeDb();
  });

  function recordFor(key: string) {
    const sv = (value: unknown) => ({ value, source: "official_website", verified: true });
    return recordSchema.parse({
      schemaVersion: 1,
      id: `rec-cl-${key}`,
      slug: `cl-${key}`,
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      themeId: "heritage-bistro",
      identity: {
        name: sv(`Contactless Kitchen ${key}`),
        primaryCategory: sv("Restaurant"),
        categories: sv(["Restaurant"]),
        businessStatus: sv("operational"),
      },
      hero: { headline: { value: "Wood-fired neighborhood cooking", source: "manual" } },
      contact: { phone: sv(`+1555${key.replace(/[^0-9]/g, "").padStart(7, "0")}`) },
      location: {
        formattedAddress: sv(`${key} Contactless Way, Portland, OR 97209`),
        city: sv("Portland"),
      },
      media: { images: [] },
      poc: { disclaimer: DISCLAIMER, createdAt: new Date().toISOString() },
    });
  }

  it("enriched lead without contact: generate, QA, publish; outreach stays contact-gated", async () => {
    // 1. start a run
    const run = await ok("start_automation_run", { idempotencyKey: `cl-run-${key}`, kind: "contactless_test" });
    const runId = String(run.runId);

    // 2. ingest with evidence and NO contact
    const ingested = (await ok("ingest_leads", {
      idempotencyKey: `cl-in-${key}`,
      runId,
      candidates: [
        {
          candidateKey: `cl-${key}`,
          business: {
            sourceType: "contactless_test",
            sourceExternalId: `cl-place-${key}`,
            displayName: `Contactless Kitchen ${key}`,
            primaryCategory: "Restaurant",
            website: `https://${key}.example.net`,
            address: `${key} Contactless Way, Portland, OR 97209`,
            city: "Portland",
          },
          score: 80,
          scoreReasons: ["evidence-no-contact"],
          evidence: [
            {
              provider: "google_places",
              sourceIdentifier: `cl-ev-${key}`,
              retrievedAt: new Date().toISOString(),
              payload: { facts: { category: "Restaurant" } },
              attribution: { label: "Synthetic integration data" },
            },
          ],
          contact: undefined,
        },
      ],
    })) as { results: Array<{ outcome: string; leadId: string; snapshotIds: string[] }> };
    const created = ingested.results[0]!;
    // 3. ENRICHED, not CONTACT_VERIFIED
    expect(created.outcome).toBe("created");
    const { leads } = await import("@/server/db/schema");
    const leadRow = (await getDb().select().from(leads).where(eq(leads.id, created.leadId)))[0]!;
    expect(leadRow.status).toBe("ENRICHED");

    // 4-5. upsert a schema-valid record -> lead becomes POC_GENERATED
    const upserted = await ok("upsert_poc_record", {
      idempotencyKey: `cl-up-${key}`,
      runId,
      leadId: created.leadId,
      record: recordFor(key),
      evidenceRefs: created.snapshotIds,
      reason: "contactless-pipeline",
    });
    expect(upserted.leadStatus).toBe("POC_GENERATED");

    // 6. QA passes
    const qa = await ok("run_poc_qa", { idempotencyKey: `cl-qa-${key}`, runId, leadId: created.leadId });
    expect(qa.passed).toBe(true);

    // 7. publish returns a share URL
    const published = await ok("publish_poc", { idempotencyKey: `cl-pb-${key}`, runId, leadId: created.leadId });
    expect(String(published.shareLinkUrl)).toMatch(/^http:\/\/localhost:3000\/p\//);

    // 8-9. outreach preparation fails safely — no fake contact was invented
    const outreachFailure = await failureOf("prepare_outreach", {
      idempotencyKey: `cl-prep-${key}`,
      runId,
      leadId: created.leadId,
      subject: `A website concept for Contactless Kitchen ${key}`,
      body: "Your private concept page: {{poc_link}}",
      evidenceRefs: created.snapshotIds,
    });
    expect(outreachFailure.code).toBe("contact_not_verified");

    // 10. finish: the run contains a failed step (the refused prepare) —
    // with outreach intentionally refused, the run must NOT be "completed".
    const finished = await ok("finish_automation_run", { idempotencyKey: `cl-fin-${key}`, runId });
    expect(["completed_with_skips", "failed"]).toContain(String(finished.status));
  });

  it("lifecycle failures are structured and recorded as failed run steps", async () => {
    // DISCOVERED may not jump to POC_GENERATED: the structured error must
    // carry the transition, never internal_error, and a failed run step
    // must survive for finish_automation_run to derive a failed status.
    const { leads, businesses } = await import("@/server/db/schema");
    const { randomUUID: uuid } = await import("node:crypto");
    const businessId = uuid();
    const leadId = uuid();
    await getDb().insert(businesses).values({
      id: businessId,
      sourceType: "contactless_test",
      sourceExternalId: `cl-d-${suffix}`,
      displayName: `Discovered Only ${suffix}`,
      normalizedNameKey: `discovered only ${suffix}`,
      primaryCategory: "Restaurant",
    });
    await getDb().insert(leads).values({ id: leadId, businessId, status: "DISCOVERED", score: 10 });
    const { insertSnapshot } = await import("./store/leads");
    const snapshot = await getDb().transaction(async (tx) =>
      insertSnapshot(tx, {
        leadId,
        provider: "google_places",
        sourceUrl: null,
        sourceIdentifier: `cl-d-ev-${suffix}`,
        retrievedAt: new Date(),
        payload: { facts: {} },
        attribution: { label: "Synthetic integration data" },
        freshUntil: null,
      }),
    );

    const run = await ok("start_automation_run", { idempotencyKey: `cl-frun-${suffix}`, kind: "failure_path" });
    const runId = String(run.runId);

    const failure = await failureOf("upsert_poc_record", {
      idempotencyKey: `cl-fup-${suffix}`,
      runId,
      leadId,
      record: recordFor(`d${suffix}`),
      evidenceRefs: [snapshot.id],
      reason: "illegal-transition-path",
    });
    expect(failure.code).toBe("illegal_lead_transition");
    expect(failure.outcome).toBe("REJECTED");
    expect(failure.details).toEqual({ from: "DISCOVERED", to: "POC_GENERATED" });
    expect(JSON.stringify(failure)).not.toContain("internal_error");

    // The failed run step survived the rolled-back transaction.
    const failedSteps = await getDb()
      .select()
      .from(automationRunSteps)
      .where(eq(automationRunSteps.runId, runId));
    expect(failedSteps.length).toBeGreaterThanOrEqual(1);
    const upsertStep = failedSteps.find((step) => step.operation === "upsert_poc_record");
    expect(upsertStep?.status).toBe("failed");
    expect(upsertStep?.errorCode).toBe("illegal_lead_transition");
    expect(upsertStep?.leadId).toBe(leadId);

    // finish derives failed — never completed.
    const finished = await ok("finish_automation_run", { idempotencyKey: `cl-ffin-${suffix}`, runId });
    expect(String(finished.status)).toBe("failed");
  });
});
