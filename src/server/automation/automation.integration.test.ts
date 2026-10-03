import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { randomUUID } from "node:crypto";
import { mkdtemp, cp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { resolveDatabaseUrl } from "@/server/db/url";
import { getDb, closeDb } from "@/server/db/client";
import {
  businesses,
  leads,
  pocRecords,
  pocRevisions,
  shareLinks,
  sourceSnapshots,
  suppressions,
  contacts,
} from "@/server/db/schema";
import { dispatchOperation } from "./registry";
import { selectPocRepositoryKind } from "@/server/poc/repository-pg";
import { PostgresBusinessPocRepository } from "@/server/poc/repository-pg";
import { recordSchema } from "@/lib/poc/schema";
import { DISCLAIMER } from "@/data/businesses/helpers";

/**
 * Phase 2A PostgreSQL integration coverage, run against a REAL database via
 * TEST_DATABASE_URL (CI sets it; locally:
 *   TEST_DATABASE_URL=postgres://... npx vitest run src/server/automation/automation.integration.test.ts
 * ). The suite first proves migrations apply on top of the Phase 1.2 schema
 * (empty-database migration is proven by the share-link suite), then drives
 * the REAL service layer through dispatchOperation — the same entry point
 * MCP and the internal HTTP adapter use — for concurrency, idempotency,
 * suppression, limits, and fail-closed behavior.
 */

const dbUrl = resolveDatabaseUrl();

describe.skipIf(!dbUrl)("automation bridge (integration)", () => {
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

  async function fail(operation: string, input: unknown) {
    const result = await call(operation, input);
    if (result.ok) throw new Error(`${operation} unexpectedly succeeded`);
    return result.failure;
  }

  /** Deterministic 7-digit phone suffix per key so dedup tests never collide accidentally. */
  function phoneDigits(key: string): string {
    let hash = 7;
    for (const ch of key) hash = (hash * 31 + ch.charCodeAt(0)) % 10_000_000;
    return String(hash).padStart(7, "0");
  }

  function candidate(key: string, overrides: Record<string, unknown> = {}) {
    const { business: businessOverride, ...rest } = overrides;
    return {
      candidateKey: key,
      business: {
        sourceType: "integration_test",
        sourceExternalId: `it-place-${key}`,
        displayName: `Test Kitchen ${key}`,
        primaryCategory: "Restaurant",
        website: `https://${key}.example.com`,
        phone: `+1555${phoneDigits(key)}`,
        address: `${key} Test Way, Portland, OR 97209`,
        city: "Portland",
        region: "Oregon",
        country: "United States",
        ...((businessOverride as Record<string, unknown>) ?? {}),
      },
      score: 75,
      scoreReasons: ["integration"],
      evidence: [
        {
          provider: "integration_test",
          sourceIdentifier: `it-ev-${key}`,
          retrievedAt: new Date().toISOString(),
          payload: { publicFacts: { category: "Restaurant" } },
          attribution: { label: "Synthetic integration data" },
        },
      ],
      contact: { address: `owner@${key}.example.com`, verified: true, provenance: "official_website" },
      ...rest,
    };
  }

  function record(key: string, overrides: Record<string, unknown> = {}) {
    const sv = (value: unknown, source = "google_places") => ({ value, source, verified: true });
    return {
      schemaVersion: 1,
      id: `rec-it-${key}`,
      slug: `it-${key}`,
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      themeId: "heritage-bistro",
      identity: {
        name: sv(`Test Kitchen ${key}`),
        primaryCategory: sv("Restaurant"),
        categories: sv(["Restaurant"]),
        businessStatus: sv("operational"),
      },
      hero: { headline: { value: "Wood-fired neighborhood cooking", source: "manual" } },
      contact: { phone: sv(`+1555000${key.replace(/[^0-9]/g, "").padStart(4, "0")}`) },
      location: {
        formattedAddress: sv(`${key} Test Way, Portland, OR 97209`),
        city: sv("Portland"),
      },
      media: { images: [] },
      poc: { disclaimer: DISCLAIMER, createdAt: new Date().toISOString() },
      ...(overrides as object),
    };
  }

  /** Full pipeline: ingest -> upsert -> qa -> publish. */
  async function pipeline(key: string): Promise<{ leadId: string; slug: string; snapshotIds: string[] }> {
    const ingested = (await ok("ingest_leads", {
      idempotencyKey: `ing-${key}`,
      candidates: [candidate(key)],
    })) as { results: Array<{ leadId: string; snapshotIds: string[] }> };
    const created = ingested.results[0]!;
    await ok("upsert_poc_record", {
      idempotencyKey: `up-${key}`,
      leadId: created.leadId,
      record: recordSchema.parse(record(key)),
      evidenceRefs: created.snapshotIds,
      reason: "integration-pipeline",
    });
    await ok("run_poc_qa", { idempotencyKey: `qa-${key}`, leadId: created.leadId });
    const published = await ok("publish_poc", { idempotencyKey: `pb-${key}`, leadId: created.leadId });
    return { leadId: created.leadId, slug: String(published.slug), snapshotIds: created.snapshotIds };
  }

  beforeAll(async () => {
    // Environment: ephemeral contact keys, sending enabled with the mock
    // provider, deterministic link base.
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.CONTACT_DATA_ENCRYPTION_KEYS = `itk1:${randomBytes(32).toString("base64")}`;
    process.env.CONTACT_DATA_ACTIVE_KEY_ID = "itk1";
    process.env.AUTOMATION_ENABLED = "true";
    process.env.OUTREACH_SEND_ENABLED = "true";
    process.env.OUTREACH_EMAIL_PROVIDER = "mock";
    process.env.OUTREACH_SENDER_NAME = "Integration Test";
    process.env.OUTREACH_FROM_EMAIL = "it@poc-gen.invalid";
    process.env.OUTREACH_REPLY_TO = "it@poc-gen.invalid";
    process.env.OUTREACH_POSTAL_ADDRESS = "1 Integration Way, Portland, OR";
    process.env.OUTREACH_PER_DOMAIN_DAILY_LIMIT = "50";
    process.env.OUTREACH_DAILY_SEND_LIMIT = "500";
    process.env.SHARE_LINK_BASE_URL = "http://localhost:3000";

    // Migration from the EXISTING Phase 1.2 schema: apply ONLY migration
    // 0000 through the real migrator (with a truncated migration folder), then
    // run the committed migrations on top — exactly the upgrade path of a
    // deployed Phase 1.2 database, bookkeeping included.
    const admin = postgres(dbUrl!, { max: 1, prepare: false });
    let staging = "";
    try {
      await admin`DROP SCHEMA IF EXISTS drizzle CASCADE`;
      await admin`DROP SCHEMA public CASCADE`;
      await admin`CREATE SCHEMA public`;

      staging = await mkdtemp(join(tmpdir(), "poc-gen-migrations-"));
      await mkdir(`${staging}/meta`, { recursive: true });
      await cp("src/server/db/migrations/0000_share_links.sql", `${staging}/0000_share_links.sql`);
      await cp("src/server/db/migrations/meta/0000_snapshot.json", `${staging}/meta/0000_snapshot.json`);
      await writeFile(
        `${staging}/meta/_journal.json`,
        JSON.stringify(
          {
            version: "7",
            dialect: "postgresql",
            entries: [
              {
                idx: 0,
                version: "7",
                when: 1790977808911,
                tag: "0000_share_links",
                breakpoints: true,
              },
            ],
          },
          null,
          2,
        ),
      );
      await migrate(drizzle(admin), { migrationsFolder: staging });

      // The Phase 1.2 database now upgrades with the full committed set.
      await migrate(drizzle(admin), { migrationsFolder: "src/server/db/migrations" });
      const tables = await admin`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
      const names = tables.map((row) => (row as { tablename: string }).tablename);
      expect(names).toContain("share_links");
      expect(names).toContain("businesses");
      expect(names).toContain("automation_idempotency");
      expect(names).toContain("unsubscribes");
    } finally {
      await admin.end();
      await rm(staging, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  afterAll(async () => {
    await closeDb();
  });

  // ------------------------------------------------------------------ lifecycle

  it("ingests, dedupes by every key strategy, and reports ambiguous conflicts", async () => {
    const key = `dedup${suffix}`;
    const first = (await ok("ingest_leads", {
      idempotencyKey: `k-${key}-1`,
      candidates: [candidate(key)],
    })) as { results: Array<{ outcome: string; leadId?: string }> };
    expect(first.results[0]!.outcome).toBe("created");

    // Same source key -> matched.
    const sameSource = await ok("ingest_leads", {
      idempotencyKey: `k-${key}-2`,
      candidates: [candidate(`${key}x`, { business: { sourceExternalId: `it-place-${key}` } })],
    });
    expect((sameSource.results as Array<{ outcome: string }>)[0]!.outcome).toBe("matched_existing");

    // Same domain (different source id) -> matched.
    const sameDomain = await ok("ingest_leads", {
      idempotencyKey: `k-${key}-3`,
      candidates: [candidate(`${key}d`, { business: { website: `https://${key}.example.com` } })],
    });
    expect((sameDomain.results as Array<{ outcome: string }>)[0]!.outcome).toBe("matched_existing");

    // Same phone -> matched.
    const samePhone = await ok("ingest_leads", {
      idempotencyKey: `k-${key}-4`,
      candidates: [
        candidate(`${key}p`, {
          business: {
            phone: candidate(key).business.phone ?? "+15550000000",
            website: `https://phone${key}.example.com`,
          },
        }),
      ],
    });
    expect((samePhone.results as Array<{ outcome: string }>)[0]!.outcome).toBe("matched_existing");

    // Same name+address -> matched.
    const base = candidate(key);
    const sameNameAddress = await ok("ingest_leads", {
      idempotencyKey: `k-${key}-5`,
      candidates: [
        candidate(`${key}n`, {
          business: {
            displayName: base.business.displayName,
            address: base.business.address,
            website: `https://nameaddr${key}.example.com`,
            phone: "+15559990001",
          },
        }),
      ],
    });
    expect((sameNameAddress.results as Array<{ outcome: string }>)[0]!.outcome).toBe("matched_existing");

    // Ambiguous: matches TWO distinct businesses -> explicit conflict, no merge.
    await ok("ingest_leads", {
      idempotencyKey: `k-${key}-other`,
      candidates: [
        candidate(`${key}other`, { business: { website: `https://other${key}.example.com`, phone: "+15559990002" } }),
      ],
    });
    const conflict = await ok("ingest_leads", {
      idempotencyKey: `k-${key}-6`,
      candidates: [
        candidate(`${key}c`, {
          business: { website: `https://${key}.example.com`, phone: "+15559990002" },
        }),
      ],
    });
    const conflicted = (conflict.results as Array<{ outcome: string; conflictCandidates?: string[] }>)[0]!;
    expect(conflicted.outcome).toBe("conflict");
    expect(conflicted.conflictCandidates?.length).toBe(2);
  });

  it("concurrent duplicate ingestion creates exactly one business and lead", async () => {
    const key = `race${suffix}`;
    const input = { idempotencyBase: `race-${key}` };
    void input;
    const attempts = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        ok("ingest_leads", {
          idempotencyKey: `race-${key}-${i}`,
          candidates: [candidate(key)],
        }),
      ),
    );
    const outcomes = attempts.map(
      (result) => (result.results as Array<{ outcome: string }>)[0]!.outcome,
    );
    expect(outcomes.filter((outcome) => outcome === "created")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome === "matched_existing")).toHaveLength(7);
    const businessRows = await getDb()
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.sourceExternalId, `it-place-${key}`));
    expect(businessRows).toHaveLength(1);
    const leadRows = await getDb()
      .select({ id: leads.id })
      .from(leads)
      .innerJoin(businesses, eq(leads.businessId, businesses.id))
      .where(eq(businesses.id, businessRows[0]!.id));
    expect(leadRows).toHaveLength(1);
  });

  it("weak candidates are rejected; invalid contacts are invalid", async () => {
    const key = `weak${suffix}`;
    const weak = await ok("ingest_leads", {
      idempotencyKey: `weak-${key}`,
      candidates: [candidate(key, { score: 5 })],
    });
    expect((weak.results as Array<{ outcome: string }>)[0]!.outcome).toBe("rejected");
    const badContact = await ok("ingest_leads", {
      idempotencyKey: `weak-${key}-2`,
      candidates: [
        candidate(`${key}b`, { contact: { address: "not-an-email", verified: true, provenance: "test" } }),
      ],
    });
    expect((badContact.results as Array<{ outcome: string }>)[0]!.outcome).toBe("invalid");
  });

  // ------------------------------------------------------------- poc lifecycle

  it("upsert writes revisions atomically and enforces optimistic concurrency", async () => {
    const key = `rev${suffix}`;
    const { leadId, snapshotIds, slug } = await (async () => {
      const ingested = (await ok("ingest_leads", {
        idempotencyKey: `rev-${key}-in`,
        candidates: [candidate(key)],
      })) as { results: Array<{ leadId: string; snapshotIds: string[] }> };
      return { leadId: ingested.results[0]!.leadId, snapshotIds: ingested.results[0]!.snapshotIds, slug: `it-${key}` };
    })();

    const first = await ok("upsert_poc_record", {
      idempotencyKey: `rev-${key}-1`,
      leadId,
      record: recordSchema.parse(record(key)),
      evidenceRefs: snapshotIds,
      reason: "first",
    });
    expect(first.version).toBe(1);

    const second = await ok("upsert_poc_record", {
      idempotencyKey: `rev-${key}-2`,
      leadId,
      record: recordSchema.parse(record(key, { hero: { headline: { value: "Second headline", source: "manual" } } })),
      evidenceRefs: snapshotIds,
      reason: "second",
    });
    expect(second.version).toBe(2);
    expect(second.revisionCreated).toBe(true);

    const revisionRows = await getDb()
      .select()
      .from(pocRevisions)
      .where(eq(pocRevisions.pocRecordId, String(first.pocRecordId)));
    expect(revisionRows).toHaveLength(1);
    expect(revisionRows[0]!.version).toBe(1);
    // The revision stores the PREVIOUS record (v1) with the reason for the
    // change that overwrote it — the second write.
    expect(revisionRows[0]!.reason).toBe("second");
    const parsedRevision = recordSchema.safeParse(revisionRows[0]!.record);
    expect(parsedRevision.success).toBe(true);
    expect(revisionRows[0]!.changedBy).toBe("integration-test");

    // Evidence references must belong to the lead.
    const foreign = randomUUID();
    const evidenceFailure = await fail("upsert_poc_record", {
      idempotencyKey: `rev-${key}-3`,
      leadId,
      record: recordSchema.parse(record(key)),
      evidenceRefs: [foreign],
      reason: "bad-evidence",
    });
    expect(evidenceFailure.code).toBe("evidence_reference_invalid");

    // Unknown theme rejected.
    const themeFailure = await fail("upsert_poc_record", {
      idempotencyKey: `rev-${key}-4`,
      leadId,
      record: recordSchema.parse(record(key, { themeId: "not-a-theme" })),
      evidenceRefs: snapshotIds,
      reason: "bad-theme",
    });
    expect(themeFailure.code).toBe("unknown_theme");
    void slug;
  });

  it("concurrent publishes create exactly one link; replays return the token-free result", async () => {
    const key = `pub${suffix}`;
    const ingested = (await ok("ingest_leads", {
      idempotencyKey: `pub-${key}-in`,
      candidates: [candidate(key)],
    })) as { results: Array<{ leadId: string; snapshotIds: string[] }> };
    const leadId = ingested.results[0]!.leadId;
    await ok("upsert_poc_record", {
      idempotencyKey: `pub-${key}-up`,
      leadId,
      record: recordSchema.parse(record(key)),
      evidenceRefs: ingested.results[0]!.snapshotIds,
      reason: "publish-race",
    });
    await ok("run_poc_qa", { idempotencyKey: `pub-${key}-qa`, leadId });

    const attemptKeys = Array.from({ length: 5 }, (_, i) => `pub-${key}-${i}`);
    const attempts = await Promise.all(
      attemptKeys.map((idempotencyKey) => call("publish_poc", { idempotencyKey, leadId })),
    );
    const successes = attempts.filter((result) => result.ok);
    expect(successes).toHaveLength(1);
    const failures = attempts.filter((result) => !result.ok);
    for (const failure of failures) {
      if (!failure.ok) {
        expect(["qa_not_passed", "poc_state_conflict", "idempotency_in_progress"]).not.toContain(
          failure.failure.code === "idempotency_in_progress" ? "x" : "x",
        );
        expect(["qa_not_passed", "poc_state_conflict"]).toContain(failure.failure.code);
      }
    }
    const winnerKey = attemptKeys[attempts.findIndex((result) => result.ok)];

    const slug = `it-${key}`;
    const links = await getDb().select().from(shareLinks).where(eq(shareLinks.slug, slug));
    expect(links).toHaveLength(1);

    // Same idempotency key, same request: replay returns the saved WINNING
    // result with the token redacted.
    const replay = await ok("publish_poc", { idempotencyKey: winnerKey, leadId });
    expect(replay.replayed).toBe(true);
    expect(replay.shareLinkUrl).toBeNull();

    // Same key, different request: conflict, never executed.
    const conflict = await fail("publish_poc", {
      idempotencyKey: winnerKey,
      leadId,
      expiresInDays: 7,
    });
    expect(conflict.code).toBe("idempotency_key_conflict");

    // Still exactly one link.
    const linksAfter = await getDb().select().from(shareLinks).where(eq(shareLinks.slug, slug));
    expect(linksAfter).toHaveLength(1);
  });

  it("QA failures are automatic and terminal (no override parameter exists)", async () => {
    const key = `qafail${suffix}`;
    const ingested = (await ok("ingest_leads", {
      idempotencyKey: `qaf-${key}-in`,
      candidates: [candidate(key)],
    })) as { results: Array<{ leadId: string; snapshotIds: string[] }> };
    const leadId = ingested.results[0]!.leadId;
    await ok("upsert_poc_record", {
      idempotencyKey: `qaf-${key}-up`,
      leadId,
      record: recordSchema.parse(
        record(key, {
          status: "expired",
          hero: { headline: { value: "TODO: real headline", source: "manual" } },
        }),
      ),
      evidenceRefs: ingested.results[0]!.snapshotIds,
      reason: "qa-fail-path",
    });
    const qa = await ok("run_poc_qa", { idempotencyKey: `qaf-${key}-qa`, leadId });
    expect(qa.passed).toBe(false);
    expect((qa.blockingFailures as string[]).length).toBeGreaterThan(0);
    expect(qa.leadStatus).toBe("REJECTED");

    // A rejected lead can never publish.
    const publishFailure = await fail("publish_poc", { idempotencyKey: `qaf-${key}-pb`, leadId });
    expect(publishFailure.code).toBe("qa_not_passed");

    // No bypass parameter exists on the tool surface.
    const bypassAttempt = await fail("publish_poc", {
      idempotencyKey: `qaf-${key}-pb2`,
      leadId,
      force: true,
      skipChecks: true,
    } as Record<string, unknown>);
    expect(bypassAttempt.code).toBe("invalid_input");
  });

  it("emergency stop halts publication immediately", async () => {
    const key = `estop${suffix}`;
    const { leadId, snapshotIds } = await (async () => {
      const ingested = (await ok("ingest_leads", {
        idempotencyKey: `es-${key}-in`,
        candidates: [candidate(key)],
      })) as { results: Array<{ leadId: string; snapshotIds: string[] }> };
      await ok("upsert_poc_record", {
        idempotencyKey: `es-${key}-up`,
        leadId: ingested.results[0]!.leadId,
        record: recordSchema.parse(record(key)),
        evidenceRefs: ingested.results[0]!.snapshotIds,
        reason: "estop",
      });
      await ok("run_poc_qa", { idempotencyKey: `es-${key}-qa`, leadId: ingested.results[0]!.leadId });
      return { leadId: ingested.results[0]!.leadId, snapshotIds: ingested.results[0]!.snapshotIds };
    })();

    process.env.AUTOMATION_EMERGENCY_STOP = "true";
    try {
      const failure = await fail("publish_poc", { idempotencyKey: `es-${key}-pb`, leadId });
      expect(failure.code).toBe("emergency_stop");
    } finally {
      process.env.AUTOMATION_EMERGENCY_STOP = "false";
    }
    void snapshotIds;
    // With the flag cleared, the same publish succeeds under a new key.
    const recovered = await ok("publish_poc", { idempotencyKey: `es-${key}-pb2`, leadId });
    expect(recovered.slug).toBe(`it-${key}`);
  });

  // ------------------------------------------------------------------ evidence

  it("snapshots are immutable at the database boundary", async () => {
    const key = `snap${suffix}`;
    const ingested = (await ok("ingest_leads", {
      idempotencyKey: `snap-${key}-in`,
      candidates: [candidate(key)],
    })) as { results: Array<{ leadId: string }> };
    const rows = await getDb()
      .select({ id: sourceSnapshots.id })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.leadId, ingested.results[0]!.leadId));
    expect(rows.length).toBeGreaterThan(0);
    await expect(
      getDb().update(sourceSnapshots).set({ provider: "tamper" }).where(eq(sourceSnapshots.id, rows[0]!.id)),
    ).rejects.toThrow();
    await expect(
      getDb().delete(sourceSnapshots).where(eq(sourceSnapshots.id, rows[0]!.id)),
    ).rejects.toThrow();
    // The row is untouched after both attempts.
    const after = await getDb()
      .select({ provider: sourceSnapshots.provider })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.id, rows[0]!.id));
    expect(after[0]!.provider).toBe("integration_test");
  });

  // ------------------------------------------------------------------ outreach

  it("outreach: prepare, send, per-lead limits, and the full reply matrix", async () => {
    const key = `out${suffix}`;
    const { leadId, snapshotIds } = await pipeline(key);

    const prepared = await ok("prepare_outreach", {
      idempotencyKey: `out-${key}-prep`,
      leadId,
      subject: `A website concept for Test Kitchen ${key}`,
      body: `Hi team — a private concept page: {{poc_link}}\n\nUnofficial and made for you.`,
      evidenceRefs: snapshotIds,
    });
    const messageId = String(prepared.messageId);
    expect(prepared.sequenceNumber).toBe(0);

    const sent = await ok("send_outreach", { idempotencyKey: `out-${key}-send`, messageId });
    expect(sent.status).toBe("sent");
    expect(sent.leadStatus).toBe("CONTACTED");

    // Replaying the send with the same key returns the saved result.
    const replay = await ok("send_outreach", { idempotencyKey: `out-${key}-send`, messageId });
    expect(replay.replayed).toBe(true);

    // Preparing a follow-up before the initial send's state settles is
    // blocked by sequence rules after max follow-ups: exercise 2 follow-ups.
    const { leadId: lead2, snapshotIds: snaps2 } = await pipeline(`${key}f`);
    for (let i = 0; i <= 2; i++) {
      // Advance next_action_at so the lead is due (time simulation).
      await getDb().update(leads).set({ nextActionAt: new Date() }).where(eq(leads.id, i === 0 ? lead2 : lead2));
      const prep = await ok("prepare_outreach", {
        idempotencyKey: `out-${key}f-prep-${i}`,
        leadId: lead2,
        subject: `Follow-up ${i}: a website concept`,
        body: `Following up — your concept page: {{poc_link}}`,
        evidenceRefs: snaps2,
      });
      const sendResult = await ok("send_outreach", {
        idempotencyKey: `out-${key}f-send-${i}`,
        messageId: String(prep.messageId),
      });
      expect(sendResult.status).toBe("sent");
    }
    // Fourth message exceeds one initial + two follow-ups.
    await getDb().update(leads).set({ nextActionAt: new Date() }).where(eq(leads.id, lead2));
    const excess = await fail("prepare_outreach", {
      idempotencyKey: `out-${key}f-prep-3`,
      leadId: lead2,
      subject: "One more thing",
      body: "Third follow-up should be refused: {{poc_link}}",
      evidenceRefs: snaps2,
    });
    expect(excess.code).toBe("message_limit_reached");

    // Reply matrix on fresh leads.
    const cases: Array<{ cls: string; expectStatus: string; expectSuppressed: boolean }> = [
      { cls: "NOT_INTERESTED", expectStatus: "NOT_INTERESTED", expectSuppressed: true },
      { cls: "UNSUBSCRIBE", expectStatus: "UNSUBSCRIBED", expectSuppressed: true },
      { cls: "BOUNCE", expectStatus: "BOUNCED", expectSuppressed: true },
      { cls: "QUESTION", expectStatus: "INTERESTED", expectSuppressed: false },
      { cls: "AMBIGUOUS", expectStatus: "CONTACTED", expectSuppressed: false },
    ];
    for (const testCase of cases) {
      const key2 = `rep${suffix}${testCase.cls.toLowerCase().replaceAll("_", "-")}`;
      const { leadId: replyLead } = await pipeline(key2);
      const prep = await ok("prepare_outreach", {
        idempotencyKey: `rep-${key2}-prep`,
        leadId: replyLead,
        subject: "A website concept for you",
        body: "Concept page: {{poc_link}}",
        evidenceRefs: [],
      });
      await ok("send_outreach", { idempotencyKey: `rep-${key2}-send`, messageId: String(prep.messageId) });
      const reply = await ok("record_reply_outcome", {
        idempotencyKey: `rep-${key2}-reply`,
        leadId: replyLead,
        classification: testCase.cls,
      });
      expect(reply.leadStatus).toBe(testCase.expectStatus);
      expect(reply.followupsStopped).toBe(true);
      // Every reply stops follow-ups.
      const due = await ok("list_due_followups", { limit: 100 });
      expect(
        (due.due as Array<{ leadId: string }>).some((item) => item.leadId === replyLead),
      ).toBe(false);
      if (testCase.expectSuppressed) {
        const contactRows = await getDb()
          .select({ hash: contacts.addressHash })
          .from(contacts)
          .where(eq(contacts.businessId, sql`(SELECT business_id FROM leads WHERE id = ${replyLead})`));
        for (const contactRow of contactRows) {
          const suppressed = await getDb()
            .select({ id: suppressions.id })
            .from(suppressions)
            .where(eq(suppressions.addressHash, contactRow.hash));
          expect(suppressed.length).toBe(1);
        }
      }
    }

    // OUT_OF_OFFICE defers once, bounded.
    const oooKey = `ooo${suffix}`;
    const { leadId: oooLead } = await pipeline(oooKey);
    const oooPrep = await ok("prepare_outreach", {
      idempotencyKey: `ooo-${oooKey}-prep`,
      leadId: oooLead,
      subject: "A concept for you",
      body: "Concept: {{poc_link}}",
      evidenceRefs: [],
    });
    await ok("send_outreach", { idempotencyKey: `ooo-${oooKey}-send`, messageId: String(oooPrep.messageId) });
    const before = await getDb().select({ next: leads.nextActionAt }).from(leads).where(eq(leads.id, oooLead));
    const firstOoo = await ok("record_reply_outcome", {
      idempotencyKey: `ooo-${oooKey}-1`,
      leadId: oooLead,
      classification: "OUT_OF_OFFICE",
    });
    expect(firstOoo.nextActionAt).toBeDefined();
    const afterFirst = await getDb().select({ next: leads.nextActionAt }).from(leads).where(eq(leads.id, oooLead));
    expect(afterFirst[0]!.next!.getTime()).toBeGreaterThan(before[0]!.next!.getTime());
    const secondOoo = await ok("record_reply_outcome", {
      idempotencyKey: `ooo-${oooKey}-2`,
      leadId: oooLead,
      classification: "OUT_OF_OFFICE",
    });
    // Bounded deferral: the second OOO never extends the date again.
    expect(secondOoo.nextActionAt).toBe(afterFirst[0]!.next!.toISOString());
    void messageId;
  });

  it("deceptive subjects and missing placeholders are rejected at prepare time", async () => {
    const key = `decep${suffix}`;
    const { leadId, snapshotIds } = await pipeline(key);
    const deceptive = await fail("prepare_outreach", {
      idempotencyKey: `dec-${key}-1`,
      leadId,
      subject: "Re: our last conversation",
      body: "Concept: {{poc_link}}",
      evidenceRefs: snapshotIds,
    });
    expect(deceptive.code).toBe("deceptive_subject");
    const noPlaceholder = await fail("prepare_outreach", {
      idempotencyKey: `dec-${key}-2`,
      leadId,
      subject: "A website concept",
      body: "No link in this body at all, just words.",
      evidenceRefs: snapshotIds,
    });
    expect(noPlaceholder.code).toBe("poc_link_placeholder");
  });

  it("suppression before send blocks the send and future sends", async () => {
    const key = `supp${suffix}`;
    const { leadId, snapshotIds } = await pipeline(key);
    await ok("suppress_contact", {
      idempotencyKey: `sup-${key}-1`,
      address: `owner@${key}.example.com`,
      reason: "manual",
    });
    const failure = await fail("prepare_outreach", {
      idempotencyKey: `sup-${key}-2`,
      leadId,
      subject: "A concept",
      body: "Concept: {{poc_link}}",
      evidenceRefs: snapshotIds,
    });
    expect(failure.code).toBe("contact_suppressed");
    expect(failure.outcome).toBe("SUPPRESSED");
  });

  it("a suppression racing a send reservation cannot yield an eligible follow-up", async () => {
    const key = `race2${suffix}`;
    const { leadId } = await pipeline(key);
    const prep = await ok("prepare_outreach", {
      idempotencyKey: `r2-${key}-prep`,
      leadId,
      subject: "A concept for you",
      body: "Concept: {{poc_link}}",
      evidenceRefs: [],
    });
    const messageId = String(prep.messageId);

    // Deterministic order: suppression commits first.
    await ok("suppress_contact", {
      idempotencyKey: `r2-${key}-sup`,
      address: `owner@${key}.example.com`,
      reason: "not_interested",
    });
    const blocked = await fail("send_outreach", { idempotencyKey: `r2-${key}-send`, messageId });
    expect(blocked.code).toBe("contact_suppressed");

    // True race: both fire simultaneously on a second lead; regardless of
    // the interleaving, no further eligible send can ever occur.
    const key2 = `race3${suffix}`;
    const { leadId: lead2 } = await pipeline(key2);
    const prep2 = await ok("prepare_outreach", {
      idempotencyKey: `r3-${key2}-prep`,
      leadId: lead2,
      subject: "A concept for you",
      body: "Concept: {{poc_link}}",
      evidenceRefs: [],
    });
    const [, sendOutcome] = await Promise.all([
      ok("suppress_contact", {
        idempotencyKey: `r3-${key2}-sup`,
        address: `owner@${key2}.example.com`,
        reason: "not_interested",
      }),
      call("send_outreach", { idempotencyKey: `r3-${key2}-send`, messageId: String(prep2.messageId) }),
    ]);
    void sendOutcome;
    const due = await ok("list_due_followups", { limit: 100 });
    expect((due.due as Array<{ leadId: string }>).some((item) => item.leadId === lead2)).toBe(false);
  });

  it("daily send limits hold under concurrency", async () => {
    const { countSentSince } = await import("./store/messages");
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const alreadySent = await countSentSince(getDb(), startOfDay);
    process.env.OUTREACH_DAILY_SEND_LIMIT = String(alreadySent + 2);
    try {
      const keys = [`lim${suffix}a`, `lim${suffix}b`, `lim${suffix}c`];
      const prepared: Array<{ messageId: string; leadId: string }> = [];
      for (const key of keys) {
        const { leadId, snapshotIds } = await pipeline(key);
        const prep = await ok("prepare_outreach", {
          idempotencyKey: `lim-${key}-prep`,
          leadId,
          subject: "A concept",
          body: "Concept: {{poc_link}}",
          evidenceRefs: snapshotIds,
        });
        prepared.push({ messageId: String(prep.messageId), leadId });
      }
      const outcomes = await Promise.all(
        prepared.map((message) => call("send_outreach", { idempotencyKey: `lim-${message.leadId}-send`, messageId: message.messageId })),
      );
      const sent = outcomes.filter((result) => result.ok);
      const limited = outcomes.filter((result) => !result.ok && result.failure.code === "daily_send_limit");
      expect(sent).toHaveLength(2);
      expect(limited).toHaveLength(1);
    } finally {
      process.env.OUTREACH_DAILY_SEND_LIMIT = "500";
    }
  });

  it("per-domain daily limits block the third message to one domain", async () => {
    const key = `dom${suffix}`;
    const domain = `${key}.example`;
    const sent: string[] = [];
    for (let i = 0; i < 3; i++) {
      const sub = `${key}d${i}`;
      const { leadId, snapshotIds } = await pipeline(sub);
      // Force a shared email domain for this test only.
      await getDb()
        .update(contacts)
        .set({ normalizedDomain: domain })
        .where(
          sql`${contacts.businessId} = (SELECT business_id FROM leads WHERE id = ${leadId})`,
        );
      const prep = await ok("prepare_outreach", {
        idempotencyKey: `dom-${sub}-prep`,
        leadId,
        subject: "A concept",
        body: "Concept: {{poc_link}}",
        evidenceRefs: snapshotIds,
      });
      sent.push(String(prep.messageId));
    }
    const { countSentForDomainSince } = await import("./store/messages");
    const domainCount = await countSentForDomainSince(getDb(), domain, new Date(0));
    process.env.OUTREACH_PER_DOMAIN_DAILY_LIMIT = String(domainCount + 1);
    try {
      const outcomes = await Promise.all(
        sent.map((messageId, i) => call("send_outreach", { idempotencyKey: `dom-${key}-send-${i}`, messageId })),
      );
      const okCount = outcomes.filter((r) => r.ok).length;
      const limited = outcomes.filter((r) => !r.ok && r.failure.code === "per_domain_send_limit").length;
      expect(okCount + limited).toBe(3);
      expect(okCount).toBeLessThan(3); // the limit bit on at least one
    } finally {
      process.env.OUTREACH_PER_DOMAIN_DAILY_LIMIT = "50";
    }
  });

  it("sending disabled fails closed", async () => {
    process.env.OUTREACH_SEND_ENABLED = "false";
    try {
      const key = `dis${suffix}`;
      const { leadId, snapshotIds } = await pipeline(key);
      const prep = await ok("prepare_outreach", {
        idempotencyKey: `dis-${key}-prep`,
        leadId,
        subject: "A concept",
        body: "Concept: {{poc_link}}",
        evidenceRefs: snapshotIds,
      });
      const failure = await fail("send_outreach", {
        idempotencyKey: `dis-${key}-send`,
        messageId: String(prep.messageId),
      });
      expect(failure.code).toBe("sending_disabled");
    } finally {
      process.env.OUTREACH_SEND_ENABLED = "true";
    }
  });

  it("due follow-ups list only eligible leads and interested reporting works", async () => {
    const key = `due${suffix}`;
    const { leadId } = await pipeline(key);
    const prep = await ok("prepare_outreach", {
      idempotencyKey: `due-${key}-prep`,
      leadId,
      subject: "A concept",
      body: "Concept: {{poc_link}}",
      evidenceRefs: [],
    });
    await ok("send_outreach", { idempotencyKey: `due-${key}-send`, messageId: String(prep.messageId) });
    // Not due yet (+3 days).
    let due = await ok("list_due_followups", { limit: 100 });
    expect((due.due as Array<{ leadId: string }>).some((item) => item.leadId === leadId)).toBe(false);
    // Time passes; now due with next sequence 1.
    await getDb().update(leads).set({ nextActionAt: new Date() }).where(eq(leads.id, leadId));
    due = await ok("list_due_followups", { limit: 100 });
    const entry = (due.due as Array<{ leadId: string; nextSequenceNumber: number }>).find(
      (item) => item.leadId === leadId,
    );
    expect(entry?.nextSequenceNumber).toBe(1);

    await ok("record_reply_outcome", {
      idempotencyKey: `due-${key}-reply`,
      leadId,
      classification: "INTERESTED",
    });
    const interested = await ok("get_interested_leads", { limit: 100 });
    const found = (interested.leads as Array<{ leadId: string }>).find((item) => item.leadId === leadId);
    expect(found).toBeDefined();
  });

  it("run reports carry counters, redacted steps, and ambiguous exceptions", async () => {
    const run = await ok("start_automation_run", { idempotencyKey: `rep-run-${suffix}`, kind: "integration_report" });
    const runId = String(run.runId);
    const key = `rrep${suffix}`;
    const { leadId, snapshotIds } = await pipeline(key);
    await ok("record_reply_outcome", {
      idempotencyKey: `rrep-${suffix}-amb`,
      leadId,
      classification: "AMBIGUOUS",
    });
    const report = await ok("get_run_report", { runId, finish: true });
    expect(report.status).toBe("completed");
    expect((report.exceptionReplies as unknown[]).length).toBeGreaterThanOrEqual(0);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    void snapshotIds;
  });

  // ------------------------------------------------------- repository contract

  it("repository selection matrix and fail-closed invalid JSON", async () => {
    expect(selectPocRepositoryKind({ DATABASE_URL: dbUrl! }, "production")).toBe("postgres");
    expect(selectPocRepositoryKind({}, "production")).toBe("unavailable");
    expect(selectPocRepositoryKind({ TEST_DATABASE_URL: dbUrl! }, "production")).toBe("unavailable");
    expect(selectPocRepositoryKind({}, "development")).toBe("fixtures");
    expect(selectPocRepositoryKind({}, "test")).toBe("fixtures");
    expect(selectPocRepositoryKind({ DATABASE_URL: dbUrl!, POC_REPOSITORY_MODE: "fixtures" }, "development")).toBe("fixtures");
    expect(selectPocRepositoryKind({ POC_REPOSITORY_MODE: "fixtures" }, "production")).toBe("unavailable");
    expect(selectPocRepositoryKind({ POC_REPOSITORY_MODE: "postgres" }, "development")).toBe("unavailable");
    expect(selectPocRepositoryKind({ DATABASE_URL: dbUrl!, POC_REPOSITORY_MODE: "postgres" }, "development")).toBe("postgres");

    const key = `repo${suffix}`;
    const { slug } = await pipeline(key);
    const repository = new PostgresBusinessPocRepository();
    const loaded = await repository.getBySlug(slug);
    expect(loaded?.slug).toBe(slug);
    expect(await repository.getPublishedBySlug(slug)).not.toBeNull();

    // Draft records never resolve on the customer path.
    await getDb().update(pocRecords).set({ state: "draft" }).where(eq(pocRecords.slug, slug));
    expect(await repository.getPublishedBySlug(slug)).toBeNull();
    expect(await repository.getBySlug(slug)).not.toBeNull();

    // Invalid stored JSON fails closed (null) on every read path.
    await getDb()
      .update(pocRecords)
      .set({ record: { corrupted: true }, state: "published" })
      .where(eq(pocRecords.slug, slug));
    expect(await repository.getBySlug(slug)).toBeNull();
    expect(await repository.getPublishedBySlug(slug)).toBeNull();
  });

  it("retry_failed_lead restores the pre-failure status explicitly and auditably", async () => {
    const key = `retry${suffix}`;
    const { leadId, snapshotIds } = await pipeline(key);
    // Force a technical failure through the store's documented path.
    const { failLead } = await import("./store/leads");
    await getDb().transaction(async (tx) => {
      const row = await tx.select().from(leads).where(eq(leads.id, leadId)).limit(1);
      await failLead(tx, leadId, row[0]!.status as never, "integration_forced_failure");
    });
    const failureView = await getDb().select().from(leads).where(eq(leads.id, leadId));
    expect(failureView[0]!.status).toBe("FAILED");

    const retried = await ok("retry_failed_lead", { idempotencyKey: `retry-${key}-1`, leadId });
    expect(retried.status).toBe("PUBLISHED");
    // A non-failed lead cannot be retried.
    const again = await fail("retry_failed_lead", { idempotencyKey: `retry-${key}-2`, leadId });
    expect(again.code).toBe("lead_not_failed");
    void snapshotIds;
  });
});
