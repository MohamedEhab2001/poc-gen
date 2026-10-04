import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { mkdtemp, cp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { eq, sql } from "drizzle-orm";
import postgres from "postgres";
import { resolveIntegrationTestDatabaseUrl } from "@/server/db/url";
import { getDb, closeDb } from "@/server/db/client";
import { leads, pocRecords, shareLinks, sourceSnapshots, businesses, contacts } from "@/server/db/schema";
import { dispatchOperation } from "./registry";
import { setEmailProviderOverride } from "./email/provider";
import type { EmailProvider, OutgoingEmail, ProviderSendOutcome } from "./email/provider";
import { reserveProviderSlot, waitForSlot, realClock } from "./email/rate-limit";
import type { InjectedClock } from "./email/rate-limit";
import { recordSchema } from "@/lib/poc/schema";
import { DISCLAIMER } from "@/data/businesses/helpers";

/**
 * Phase 2A.1 hardening integration coverage: atomic publication (including
 * an injected share-link failure with full rollback), linearized
 * suppression/sending with a deterministic provider spy, principal-scoped
 * idempotency, branch-safe deduplication, evidence-claim verification, and
 * the PostgreSQL-backed EmailJS rate limiter. Run with TEST_DATABASE_URL.
 */

// SAFETY GATE: this suite rebuilds schemas destructively. The URL must
// come from TEST_DATABASE_URL only (never a DATABASE_URL fallback), must
// differ from DATABASE_URL, and must name an unmistakable test database.
// Throws before any DROP when set-but-unsafe; null (skip) when unset.
const dbUrl = resolveIntegrationTestDatabaseUrl();

describe.skipIf(!dbUrl)("phase 2a.1 hardening (integration)", () => {
  const ALL_SCOPES = ["poc:read", "poc:write", "outreach:prepare", "outreach:send", "reports:read"] as const;
  const suffix = randomBytes(4).toString("hex");

  function callAs(principal: string, operation: string, input: unknown) {
    return dispatchOperation(operation, input, {
      principal,
      scopes: [...ALL_SCOPES],
      baseUrl: "http://localhost:3000",
    });
  }
  function call(operation: string, input: unknown) {
    return callAs("integration-test", operation, input);
  }
  async function ok(operation: string, input: unknown): Promise<Record<string, unknown>> {
    const result = await call(operation, input);
    if (!result.ok) throw new Error(`${operation} failed: ${JSON.stringify(result.failure)}`);
    return result.result as Record<string, unknown>;
  }
  async function failWith(operation: string, input: unknown) {
    const result = await call(operation, input);
    if (result.ok) throw new Error(`${operation} unexpectedly succeeded`);
    return result.failure;
  }

  /** Deterministic unique 7-digit phone suffix per key (soft signals must
   *  not collide across tests — that is the point of branch-safe dedup). */
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
        sourceExternalId: `it2-place-${key}`,
        displayName: `Second Kitchen ${key}`,
        primaryCategory: "Restaurant",
        website: `https://${key}.example.org`,
        phone: `+1555${phoneDigits(key)}`,
        address: `${key} Second Way, Portland, OR 97209`,
        city: "Portland",
        region: "Oregon",
        country: "United States",
        ...((businessOverride as Record<string, unknown>) ?? {}),
      },
      score: 75,
      scoreReasons: ["integration"],
      evidence: [
        {
          provider: "google_places",
          sourceIdentifier: `it2-ev-${key}`,
          retrievedAt: new Date().toISOString(),
          payload: {
            facts: { rating: 4.7, reviewCount: 132, note: "Coastal menu with wood-fired specials" },
          },
          attribution: { label: "Synthetic integration data" },
        },
      ],
      contact: { address: `owner@${key}.example.org`, verified: true, provenance: "official_website" },
      ...rest,
    };
  }

  function record(key: string, overrides: Record<string, unknown> = {}) {
    const sv = (value: unknown, source = "official_website") => ({ value, source, verified: true });
    return {
      schemaVersion: 1,
      id: `rec-it2-${key}`,
      slug: `it2-${key}`,
      status: "active",
      expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      themeId: "heritage-bistro",
      identity: {
        name: sv(`Second Kitchen ${key}`),
        primaryCategory: sv("Restaurant"),
        categories: sv(["Restaurant"]),
        businessStatus: sv("operational"),
      },
      hero: { headline: { value: "Wood-fired neighborhood cooking", source: "manual" } },
      contact: { phone: sv(`+1555${phoneDigits(key)}`) },
      location: {
        formattedAddress: sv(`${key} Second Way, Portland, OR 97209`),
        city: sv("Portland"),
      },
      media: { images: [] },
      poc: { disclaimer: DISCLAIMER, createdAt: new Date().toISOString() },
      ...(overrides as object),
    };
  }

  async function toQaPassed(key: string): Promise<{ leadId: string; slug: string; snapshotIds: string[] }> {
    const ingested = (await ok("ingest_leads", {
      idempotencyKey: `it2-in-${key}`,
      candidates: [candidate(key)],
    })) as { results: Array<{ leadId: string; snapshotIds: string[] }> };
    const created = ingested.results[0]!;
    await ok("upsert_poc_record", {
      idempotencyKey: `it2-up-${key}`,
      leadId: created.leadId,
      record: recordSchema.parse(record(key)),
      evidenceRefs: created.snapshotIds,
      reason: "phase2a1",
    });
    await ok("run_poc_qa", { idempotencyKey: `it2-qa-${key}`, leadId: created.leadId });
    return { leadId: created.leadId, slug: `it2-${key}`, snapshotIds: created.snapshotIds };
  }

  async function toPublished(key: string): Promise<{ leadId: string; slug: string; snapshotIds: string[] }> {
    const qa = await toQaPassed(key);
    await ok("publish_poc", { idempotencyKey: `it2-pb-${key}`, leadId: qa.leadId });
    return qa;
  }

  beforeAll(async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.CONTACT_DATA_ENCRYPTION_KEYS = `it2k:${randomBytes(32).toString("base64")}`;
    process.env.CONTACT_DATA_ACTIVE_KEY_ID = "it2k";
    process.env.AUTOMATION_ENABLED = "true";
    process.env.OUTREACH_SEND_ENABLED = "true";
    process.env.OUTREACH_EMAIL_PROVIDER = "mock";
    process.env.OUTREACH_SENDER_NAME = "Integration Test";
    process.env.OUTREACH_FROM_EMAIL = "it2@poc-gen.invalid";
    process.env.OUTREACH_REPLY_TO = "it2@poc-gen.invalid";
    process.env.OUTREACH_POSTAL_ADDRESS = "2 Integration Way, Portland, OR";
    process.env.OUTREACH_PER_DOMAIN_DAILY_LIMIT = "500";
    process.env.OUTREACH_DAILY_SEND_LIMIT = "500";
    process.env.SHARE_LINK_BASE_URL = "http://localhost:3000";

    // Fresh schema through the committed migrations (from empty).
    const admin = postgres(dbUrl!, { max: 1, prepare: false });
    try {
      await admin`DROP SCHEMA IF EXISTS drizzle CASCADE`;
      await admin`DROP SCHEMA public CASCADE`;
      await admin`CREATE SCHEMA public`;
      await migrate(drizzle(admin), { migrationsFolder: "src/server/db/migrations" });
    } finally {
      await admin.end();
    }
  });

  afterAll(async () => {
    setEmailProviderOverride(null);
    await closeDb();
  });

  // ------------------------------------------------- Part 1: atomic publication

  it("successful publication creates the link and transitions both states atomically", async () => {
    const key = `atom${suffix}`;
    const { leadId, slug } = await toQaPassed(key);
    const published = await ok("publish_poc", { idempotencyKey: `it2-pb-${key}`, leadId });
    expect(published.shareLinkUrl).toMatch(/^http:\/\/localhost:3000\/p\//);

    const pocRow = await getDb().select().from(pocRecords).where(eq(pocRecords.leadId, leadId));
    expect(pocRow[0]!.state).toBe("published");
    const leadRow = await getDb().select().from(leads).where(eq(leads.id, leadId));
    expect(leadRow[0]!.status).toBe("PUBLISHED");
    const linkRows = await getDb().select().from(shareLinks).where(eq(shareLinks.slug, slug));
    expect(linkRows).toHaveLength(1);
    // Hash only at rest.
    expect(JSON.stringify(linkRows[0])).not.toContain(String(published.shareLinkUrl).split("/p/")[1]);
  });

  it("an injected share-link insertion failure rolls back POC, lead, and link", async () => {
    const key = `roll${suffix}`;
    const { leadId, slug } = await toQaPassed(key);

    // Fault injection at the database boundary: refuse share_links inserts
    // for the probe principal only.
    const admin = getDb();
    await admin.execute(
      sql`CREATE OR REPLACE FUNCTION it2_fail_link() RETURNS trigger AS $fn$ BEGIN RAISE EXCEPTION 'injected link failure'; END; $fn$ LANGUAGE plpgsql`,
    );
    await admin.execute(
      sql`CREATE TRIGGER it2_link_fail BEFORE INSERT ON share_links FOR EACH ROW WHEN (NEW.created_by = 'link-fail-probe') EXECUTE FUNCTION it2_fail_link()`,
    );
    try {
      const failure = await (async () => {
        const result = await callAs("link-fail-probe", "publish_poc", {
          idempotencyKey: `it2-pb-${key}`,
          leadId,
        });
        if (result.ok) throw new Error("probe publish unexpectedly succeeded");
        return result.failure;
      })();
      expect(failure.outcome).toBe("RETRYABLE"); // db error surfaces retryable

      // FULL ROLLBACK: POC still qa_passed, lead still QA_PASSED, no link.
      const pocRow = await getDb().select().from(pocRecords).where(eq(pocRecords.leadId, leadId));
      expect(pocRow[0]!.state).toBe("qa_passed");
      const leadRow = await getDb().select().from(leads).where(eq(leads.id, leadId));
      expect(leadRow[0]!.status).toBe("QA_PASSED");
      const linkRows = await getDb().select().from(shareLinks).where(eq(shareLinks.slug, slug));
      expect(linkRows).toHaveLength(0);

      // With the fault removed, the same lead publishes cleanly.
      await admin.execute(sql`DROP TRIGGER it2_link_fail ON share_links`);
      await admin.execute(sql`DROP FUNCTION it2_fail_link()`);
      const published = await ok("publish_poc", { idempotencyKey: `it2-pb-${key}-2`, leadId });
      expect(published.shareLinkUrl).toMatch(/\/p\//);
    } finally {
      await admin.execute(sql`DROP TRIGGER IF EXISTS it2_link_fail ON share_links`);
      await admin.execute(sql`DROP FUNCTION IF EXISTS it2_fail_link()`);
    }
  });

  it("republishing a revision revokes the old link and creates exactly one new link", async () => {
    const key = `repo${suffix}`;
    const { leadId, slug } = await toQaPassed(key);
    const first = await ok("publish_poc", { idempotencyKey: `it2-pb-${key}-1`, leadId });
    const firstLinkId = String(first.shareLinkId);

    // A revision resets the record to draft (backward transition), then QA
    // and publish run again.
    const snapshots = await getDb()
      .select({ id: sourceSnapshots.id })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.leadId, leadId));
    await ok("upsert_poc_record", {
      idempotencyKey: `it2-up-${key}-2`,
      leadId,
      record: recordSchema.parse(
        record(key, { hero: { headline: { value: "Revised headline", source: "manual" } } }),
      ),
      evidenceRefs: snapshots.map((row) => row.id),
      reason: "revision",
    });
    await ok("run_poc_qa", { idempotencyKey: `it2-qa-${key}-2`, leadId });
    const second = await ok("publish_poc", { idempotencyKey: `it2-pb-${key}-2`, leadId });
    expect(second.shareLinkId).not.toBe(firstLinkId);
    expect(second.shareLinkUrl).toMatch(/\/p\//);

    const all = await getDb().select().from(shareLinks).where(eq(shareLinks.slug, slug));
    expect(all).toHaveLength(2);
    const active = all.filter((row) => row.revokedAt === null);
    expect(active).toHaveLength(1);
    expect(active[0]!.id).toBe(second.shareLinkId);
    const revoked = all.find((row) => row.id === firstLinkId);
    expect(revoked?.revokedAt).not.toBeNull();
  });

  it("an idempotency replay returns the redacted result and creates no additional link", async () => {
    const key = `play${suffix}`;
    const { leadId, slug } = await toQaPassed(key);
    const first = await ok("publish_poc", { idempotencyKey: `it2-pb-${key}-x`, leadId });
    const replay = await ok("publish_poc", { idempotencyKey: `it2-pb-${key}-x`, leadId });
    expect(replay.replayed).toBe(true);
    expect(replay.shareLinkUrl).toBeNull();
    const all = await getDb().select().from(shareLinks).where(eq(shareLinks.slug, slug));
    expect(all).toHaveLength(1);
    void first;
  });

  // ------------------------------------------ Part 2: linearized suppression

  it("suppression committed first: the provider is never called", async () => {
    const key = `lin1${suffix}`;
    const { leadId, snapshotIds } = await toPublished(key);
    const prep = await ok("prepare_outreach", {
      idempotencyKey: `it2-pr-${key}`,
      leadId,
      subject: `A concept for Second Kitchen ${key}`,
      body: "Your private concept page: {{poc_link}}",
      evidenceRefs: snapshotIds,
    });
    const spy = providerSpy();
    setEmailProviderOverride(spy.provider);

    await ok("suppress_contact", {
      idempotencyKey: `it2-sup-${key}`,
      address: `owner@${key}.example.org`,
      reason: "manual",
    });
    const failure = await failWith("send_outreach", {
      idempotencyKey: `it2-sd-${key}`,
      messageId: String(prep.messageId),
    });
    expect(failure.code).toBe("contact_suppressed");
    expect(spy.calls).toBe(0);
    setEmailProviderOverride(null);
  });

  it("provider boundary crossed first: suppression cannot recall it but stops every follow-up", async () => {
    const key = `lin2${suffix}`;
    const { leadId, snapshotIds } = await toPublished(key);
    const prep = await ok("prepare_outreach", {
      idempotencyKey: `it2-pr-${key}`,
      leadId,
      subject: `A concept for Second Kitchen ${key}`,
      body: "Your private concept page: {{poc_link}}",
      evidenceRefs: snapshotIds,
    });

    // Deterministic interleaving WITHOUT timing sleeps: the provider spy
    // parks the send at a barrier; the suppression commits while the
    // provider call is (logically) in flight; then the call resolves.
    const spy = providerSpy();
    const gate = spy.gate(); // next provider call resolves only when released
    setEmailProviderOverride(spy.provider);

    const sendPromise = call("send_outreach", {
      idempotencyKey: `it2-sd-${key}`,
      messageId: String(prep.messageId),
    });
    await spy.waitForCall(); // provider boundary crossed
    await ok("suppress_contact", {
      idempotencyKey: `it2-sup-${key}`,
      address: `owner@${key}.example.org`,
      reason: "not_interested",
    });
    gate.resolve({ status: "sent", providerMessageId: "spy-sent" });
    const settled = await sendPromise;
    expect(settled.ok).toBe(true);
    expect(spy.calls).toBe(1);

    // The lead transitioned CONTACTED, but NO future follow-up is eligible.
    const leadRow = await getDb().select().from(leads).where(eq(leads.id, leadId));
    expect(leadRow[0]!.status).toBe("CONTACTED");
    const due = await ok("list_due_followups", { limit: 100 });
    expect((due.due as Array<{ leadId: string }>).some((item) => item.leadId === leadId)).toBe(false);
    setEmailProviderOverride(null);
  });

  it("provider timeouts map to delivery_unknown and are never retried", async () => {
    const key = `tmo${suffix}`;
    const { leadId, snapshotIds } = await toPublished(key);
    const prep = await ok("prepare_outreach", {
      idempotencyKey: `it2-pr-${key}`,
      leadId,
      subject: `A concept for Second Kitchen ${key}`,
      body: "Your private concept page: {{poc_link}}",
      evidenceRefs: snapshotIds,
    });
    const spy = providerSpy();
    spy.hangNext(); // next send never settles
    setEmailProviderOverride(spy.provider);
    process.env.OUTREACH_PROVIDER_TIMEOUT_MS = "1200";
    try {
      const sent = await ok("send_outreach", {
        idempotencyKey: `it2-sd-${key}`,
        messageId: String(prep.messageId),
      });
      expect(sent.status).toBe("delivery_unknown");
      // Retrying the same message is refused: a delivery_unknown (reserved)
      // message blocks further sends for the lead and is never re-reserved.
      const again = await failWith("send_outreach", {
        idempotencyKey: `it2-sd-${key}-retry`,
        messageId: String(prep.messageId),
      });
      expect(["message_not_reservable", "lead_send_blocked"]).toContain(again.code);
    } finally {
      delete process.env.OUTREACH_PROVIDER_TIMEOUT_MS;
      setEmailProviderOverride(null);
    }
  });

  // --------------------------------------- Part 3: principal-scoped idempotency

  it("same principal replays; different principals use the same key independently", async () => {
    const key = `idem${suffix}`;
    const runA = await callAs("principal-a", "start_automation_run", {
      idempotencyKey: `shared-key-${key}`,
      kind: "principal_test",
    });
    expect(runA.ok).toBe(true);
    const replayA = await callAs("principal-a", "start_automation_run", {
      idempotencyKey: `shared-key-${key}`,
      kind: "principal_test",
    });
    expect(replayA.ok).toBe(true);
    if (replayA.ok) expect((replayA.result as Record<string, unknown>).replayed).toBe(true);

    // Principal B: same operation and key — independent execution.
    const runB = await callAs("principal-b", "start_automation_run", {
      idempotencyKey: `shared-key-${key}`,
      kind: "principal_test",
    });
    expect(runB.ok).toBe(true);
    if (runB.ok) {
      const result = runB.result as Record<string, unknown>;
      expect(result.replayed).toBe(false);
      expect(result.runId).not.toBe((runA as { result: { runId: string } }).result.runId);
    }

    // Same principal, same key, DIFFERENT request: conflict, never executed.
    const conflict = await callAs("principal-a", "start_automation_run", {
      idempotencyKey: `shared-key-${key}`,
      kind: "different_kind",
    });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.failure.code).toBe("idempotency_key_conflict");

    // One principal can never replay another's result.
    const bReplay = await callAs("principal-b", "start_automation_run", {
      idempotencyKey: `shared-key-${key}`,
      kind: "different_kind",
    });
    expect(bReplay.ok).toBe(false); // different request for B => conflict for B
    if (!bReplay.ok) expect(bReplay.failure.code).toBe("idempotency_key_conflict");
  });

  // --------------------------------------------- Part 4: report/finish split

  it("get_run_report is strictly read-only; finish_automation_run closes idempotently", async () => {
    const run = await ok("start_automation_run", { idempotencyKey: `it2-run-${suffix}`, kind: "report_split" });
    const runId = String(run.runId);

    // finish is not part of the schema anymore.
    const rejected = await failWith("get_run_report", { runId, finish: true });
    expect(rejected.code).toBe("invalid_input");

    const before = await ok("get_run_report", { runId });
    expect(before.status).toBe("running");
    const auditCountBefore = await countAuditRows();
    const after = await ok("get_run_report", { runId });
    expect(after).toEqual(before);
    expect(await countAuditRows()).toBe(auditCountBefore); // no writes from reads

    const finished = await ok("finish_automation_run", {
      idempotencyKey: `it2-fin-${suffix}`,
      runId,
    });
    expect(finished.status).toBe("completed");
    expect(finished.derivedFrom).toBe("steps");
    expect(await countAuditRows()).toBe(auditCountBefore + 1); // finish audits

    const again = await ok("finish_automation_run", {
      idempotencyKey: `it2-fin2-${suffix}`,
      runId,
    });
    expect(again.status).toBe("completed");
    expect(again.derivedFrom).toBe("already_finished");
  });

  // --------------------------------------------- Part 5: branch-safe dedup

  it("branch-safe dedup: shared domain/phone never merge distinct locations", async () => {
    const key = `brn${suffix}`;
    // Branch A and branch B: same website and phone, different source ids,
    // names, and addresses -> BOTH created.
    const a = await ok("ingest_leads", {
      idempotencyKey: `it2-${key}-a`,
      candidates: [
        candidate(`${key}a`, {
          business: { website: `https://chain-${suffix}.example.org`, phone: "+15558887777" },
        }),
      ],
    });
    const b = await ok("ingest_leads", {
      idempotencyKey: `it2-${key}-b`,
      candidates: [
        candidate(`${key}b`, {
          business: { website: `https://chain-${suffix}.example.org`, phone: "+15558887777" },
        }),
      ],
    });
    expect((a.results as Array<{ outcome: string }>)[0]!.outcome).toBe("created");
    expect((b.results as Array<{ outcome: string }>)[0]!.outcome).toBe("created");
    const businessRows = await getDb()
      .select({ id: businesses.id })
      .from(businesses)
      .where(eq(businesses.normalizedDomain, `chain-${suffix}.example.org`));
    expect(businessRows).toHaveLength(2);

    // Uncertain identity: no source id, no address, soft signals matching ->
    // explicit conflict instead of a silent merge.
    const uncertain = await ok("ingest_leads", {
      idempotencyKey: `it2-${key}-c`,
      candidates: [
        candidate(`${key}c`, {
          business: {
            sourceExternalId: null,
            address: null,
            website: `https://chain-${suffix}.example.org`,
            phone: "+15558887777",
          },
        }),
      ],
    });
    const uncertainResult = (uncertain.results as Array<{ outcome: string }>)[0]!;
    expect(uncertainResult.outcome).toBe("conflict");
  });

  it("enrichment: matched leads return ids, attach deduplicated evidence, never downgrade contacts", async () => {
    const key = `enr${suffix}`;
    const first = (await ok("ingest_leads", {
      idempotencyKey: `it2-${key}-1`,
      candidates: [candidate(key)],
    })) as { results: Array<{ leadId: string; businessId: string; snapshotIds: string[] }> };
    const created = first.results[0]!;

    // Re-ingest the same source id with FRESH evidence, the SAME contact,
    // and one resubmission whose checksum IDENTIFIES with the original
    // (same provider, identifier, retrievedAt, and payload) — evidence is
    // content-deduplicated, never duplicated or mutated.
    const originalSnapshot = (
      await getDb().select().from(sourceSnapshots).where(eq(sourceSnapshots.leadId, created.leadId))
    )[0]!;
    const second = (await ok("ingest_leads", {
      idempotencyKey: `it2-${key}-2`,
      candidates: [
        candidate(key, {
          evidence: [
            {
              provider: "google_places",
              sourceIdentifier: `it2-ev-${key}-fresh`,
              retrievedAt: new Date().toISOString(),
              payload: { facts: { reviewCount: 140 } },
              attribution: { label: "Synthetic integration data" },
            },
            {
              provider: originalSnapshot.provider,
              sourceIdentifier: originalSnapshot.sourceIdentifier,
              retrievedAt: originalSnapshot.retrievedAt.toISOString(),
              payload: originalSnapshot.payload,
              attribution: originalSnapshot.attribution as { label: string },
            },
          ],
        }),
      ],
    })) as { results: Array<{ outcome: string; leadId: string; businessId: string; snapshotIds: string[] }> };
    const matched = second.results[0]!;
    expect(matched.outcome).toBe("matched_existing");
    expect(matched.leadId).toBe(created.leadId);
    expect(matched.businessId).toBe(created.businessId);

    const snapshots = await getDb()
      .select({ id: sourceSnapshots.id })
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.leadId, created.leadId));
    expect(snapshots).toHaveLength(2); // original + fresh; duplicate skipped

    // Verified contact stays verified after an unverified re-submission.
    const contactRow = await getDb()
      .select()
      .from(contacts)
      .where(eq(contacts.businessId, created.businessId));
    expect(contactRow[0]!.verificationState).toBe("verified");
  });

  // ------------------------------------------ Part 6: evidence-backed claims

  it("claims are deterministically verified against snapshot payloads", async () => {
    const key = `clm${suffix}`;
    const { leadId, snapshotIds } = await toPublished(key);
    const otherKey = `clm2${suffix}`;
    const other = await toQaPassed(otherKey);

    const supported = await ok("prepare_outreach", {
      idempotencyKey: `it2-pr-${key}-1`,
      leadId,
      subject: `A concept for Second Kitchen ${key}`,
      body: "We read that you are rated 4.7 stars by 132 reviewers — your concept page: {{poc_link}}",
      evidenceRefs: snapshotIds,
      claims: [
        {
          statement: "rated 4.7 stars by 132 reviewers",
          evidenceRef: snapshotIds[0]!,
          supportingExcerpt: "132",
          jsonPointer: "/facts/reviewCount",
        },
      ],
    });
    expect(supported.sequenceNumber).toBe(0);

    // Unrelated excerpt -> rejected; errors never contain payload content.
    // (Each prepare case uses its own lead: only one initial message can
    // exist per lead.)
    const unrelatedKey = `clx${suffix}`;
    const unrelatedLead = await toPublished(unrelatedKey);
    const unrelated = await failWith("prepare_outreach", {
      idempotencyKey: `it2-pr-${unrelatedKey}-2`,
      leadId: unrelatedLead.leadId,
      subject: `A concept for Second Kitchen ${unrelatedKey}`,
      body: "Claim: winner of best bistro award {{poc_link}}",
      evidenceRefs: unrelatedLead.snapshotIds,
      claims: [
        {
          statement: "winner of best bistro award",
          evidenceRef: unrelatedLead.snapshotIds[0]!,
          supportingExcerpt: "best bistro award",
        },
      ],
    });
    expect(unrelated.code).toBe("evidence_claim_unsupported");
    expect(JSON.stringify(unrelated)).not.toContain("Coastal menu");

    // Evidence from ANOTHER lead -> rejected.
    const foreignKey = `clf${suffix}`;
    const foreignLead = await toPublished(foreignKey);
    const foreign = await failWith("prepare_outreach", {
      idempotencyKey: `it2-pr-${foreignKey}-3`,
      leadId: foreignLead.leadId,
      subject: `A concept for Second Kitchen ${foreignKey}`,
      body: "Claim about something {{poc_link}}",
      evidenceRefs: [],
      claims: [
        {
          statement: "Claim about something",
          evidenceRef: other.snapshotIds[0]!,
          supportingExcerpt: "132",
        },
      ],
    });
    // Foreign evidence is rejected — either by the reference precheck or by
    // per-claim verification; both fail closed without leaking payload text.
    expect(["evidence_claim_unsupported", "evidence_reference_invalid"]).toContain(foreign.code);
  });

  it("records with provider-sourced facts require provider evidence (fail closed)", async () => {
    const key = `prov${suffix}`;
    const ingested = (await ok("ingest_leads", {
      idempotencyKey: `it2-in-${key}`,
      candidates: [candidate(key)],
    })) as { results: Array<{ leadId: string; snapshotIds: string[] }> };
    const leadId = ingested.results[0]!.leadId;

    // licensed_asset-sourced facts with NO licensed_asset snapshot for the
    // lead -> deterministic fail-closed rejection (the suite's snapshots are
    // google_places, so this record must be refused).
    const failure = await failWith("upsert_poc_record", {
      idempotencyKey: `it2-up-${key}-1`,
      leadId,
      record: recordSchema.parse(
        record(key, {
          identity: {
            name: { value: `Second Kitchen ${key}`, source: "licensed_asset", verified: true },
            primaryCategory: { value: "Restaurant", source: "licensed_asset", verified: true },
            categories: { value: ["Restaurant"], source: "licensed_asset", verified: true },
            businessStatus: { value: "operational", source: "manual" },
          },
        }),
      ),
      evidenceRefs: ingested.results[0]!.snapshotIds,
      reason: "provider-gate",
    });
    expect(failure.code).toBe("provider_evidence_missing");

    // A record with no provider facts needs no provider snapshots.
    const clean = await ok("upsert_poc_record", {
      idempotencyKey: `it2-up-${key}-2`,
      leadId,
      record: recordSchema.parse(record(`${key}manual`, { slug: `it2-${key}manual` })),
      evidenceRefs: ingested.results[0]!.snapshotIds,
      reason: "manual-gate",
    });
    expect(clean.state).toBe("draft");
  });

  // ------------------------------- Idempotency ledger integrity (2A.2 fix)

  it("conflicts and in-progress responses never overwrite the original ledger entry", async () => {
    const key = `idfix${suffix}`;
    const operation = "start_automation_run";
    const idemKey = `idfix-key-${key}`;
    const requestA = { idempotencyKey: idemKey, kind: "idfix_run" };

    // 1. Same key + request: executes, then replays the ORIGINAL result.
    const first = await call(operation, requestA);
    expect(first.ok).toBe(true);
    const replay = await call(operation, requestA);
    expect(replay.ok).toBe(true);
    if (replay.ok) {
      const result = replay.result as Record<string, unknown>;
      expect(result.replayed).toBe(true);
      expect(result.kind).toBe("idfix_run");
    }

    // 2. Same key + DIFFERENT request: conflict.
    const conflict = await call(operation, { idempotencyKey: idemKey, kind: "different_kind" });
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.failure.code).toBe("idempotency_key_conflict");

    // 3. Replaying the ORIGINAL request after the conflict still returns the
    //    ORIGINAL successful result (the conflict must not have overwritten
    //    the ledger row with a failure).
    const replayAfterConflict = await call(operation, requestA);
    expect(replayAfterConflict.ok).toBe(true);
    if (replayAfterConflict.ok) {
      const result = replayAfterConflict.result as Record<string, unknown>;
      expect(result.replayed).toBe(true);
      expect(result.kind).toBe("idfix_run");
    }
    const ledgerRow = await ledgerRowFor("integration-test", operation, idemKey);
    expect(ledgerRow?.status).toBe("completed");
    const stored = JSON.stringify(ledgerRow?.result);
    expect(stored).toContain("idfix_run");
    expect(stored).not.toContain("idempotency_key_conflict");

    // 4. An in_progress response does not change a pending row: seed a
    //    pending reservation for principal-b directly, then dispatch the
    //    same request and verify the row is untouched.
    const { hashIdempotencyKey, hashRequest } = await import("@/lib/automation/canonical");
    const { automationIdempotency } = await import("@/server/db/schema");
    const { randomUUID } = await import("node:crypto");
    const pendingKey = `idfix-pending-${key}`;
    const pendingRequest = { idempotencyKey: pendingKey, kind: "idfix_pending" };
    await getDb().insert(automationIdempotency).values({
      id: randomUUID(),
      operation,
      principal: "integration-test",
      keyHash: hashIdempotencyKey(operation, pendingKey),
      requestHash: hashRequest(operation, pendingRequest),
      status: "pending",
      result: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    const inProgress = await call(operation, pendingRequest);
    expect(inProgress.ok).toBe(false);
    if (!inProgress.ok) {
      expect(inProgress.failure.code).toBe("idempotency_in_progress");
      expect(inProgress.failure.outcome).toBe("RETRYABLE");
    }
    const pendingRow = await ledgerRowFor("integration-test", operation, pendingKey);
    expect(pendingRow?.status).toBe("pending"); // unchanged by the failed call
    expect(pendingRow?.result).toBeNull();

    // 5. Principal scoping still holds: another principal runs the same key
    //    independently and owns only its own row.
    const other = await callAs("idfix-principal-b", operation, {
      idempotencyKey: idemKey,
      kind: "idfix_run_b",
    });
    expect(other.ok).toBe(true);
    const rowA = await ledgerRowFor("integration-test", operation, idemKey);
    const rowB = await ledgerRowFor("idfix-principal-b", operation, idemKey);
    expect(rowA?.status).toBe("completed");
    expect(JSON.stringify(rowA?.result)).toContain("idfix_run");
    expect(JSON.stringify(rowB?.result)).toContain("idfix_run_b");
    expect(rowB?.status).toBe("completed");
  });

  // -------------------------------------- Part 7: PostgreSQL-backed throttle

  it("provider rate slots reserve strictly spaced, cross-instance, with bounded waits", async () => {
    const fakeClock: InjectedClock = {
      now: () => 1_000_000,
      sleep: async () => undefined, // no real delay
    };
    const name = `test-provider-${suffix}`;
    await getDb().execute(sql`DELETE FROM provider_rate_limits WHERE name = ${name}`);

    const t0 = 1_000_000;
    const slots = await Promise.all(
      Array.from({ length: 4 }, () => reserveProviderSlot(getDb(), name, 1_100, t0)),
    );
    slots.sort((a, b) => a - b);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]! - slots[i - 1]!).toBeGreaterThanOrEqual(1_100);
    }
    expect(slots[0]!).toBe(t0); // first slot is immediate

    // Bounded wait: a slot far in the future declines instead of blocking.
    const far = await reserveProviderSlot(getDb(), name, 1_100, t0);
    expect(await waitForSlot(far + 60_000, fakeClock, 5_000)).toBe(false);
    expect(await waitForSlot(far, fakeClock, 5_000)).toBe(true);
    expect(await waitForSlot(t0 - 1_000, realClock, 1_000)).toBe(true);
  });
});

async function ledgerRowFor(principal: string, operation: string, key: string) {
  const { hashIdempotencyKey } = await import("@/lib/automation/canonical");
  const { automationIdempotency } = await import("@/server/db/schema");
  const { and, eq } = await import("drizzle-orm");
  const rows = await getDb()
    .select()
    .from(automationIdempotency)
    .where(
      and(
        eq(automationIdempotency.principal, principal),
        eq(automationIdempotency.operation, operation),
        eq(automationIdempotency.keyHash, hashIdempotencyKey(operation, key)),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function countAuditRows(): Promise<number> {
  const rows = await getDb().execute(sql`SELECT count(*)::int AS count FROM audit_logs`);
  const first = (rows as unknown as Array<{ count?: number }>)[0];
  return Number(first?.count ?? (rows as unknown as { count: number }).count ?? 0);
}

/** Deterministic provider spy with call barriers and gates (no sleeps). */
function providerSpy() {
  const state = { calls: 0 };
  let callSignal: (() => void) | null = null;
  let pending: { resolve: (outcome: ProviderSendOutcome) => void } | null = null;
  let mode: "gate" | "normal" | "hang" = "normal";

  const provider: EmailProvider = {
    name: "spy",
    send: (message: OutgoingEmail) => {
      void message;
      state.calls += 1;
      callSignal?.();
      if (mode === "hang") return new Promise(() => undefined);
      if (mode === "gate") {
        return new Promise<ProviderSendOutcome>((resolve) => {
          pending = { resolve };
        });
      }
      return Promise.resolve({ status: "sent", providerMessageId: `spy-${state.calls}` });
    },
  };

  return {
    provider,
    get calls() {
      return state.calls;
    },
    gate() {
      mode = "gate";
      return {
        resolve: (outcome: ProviderSendOutcome) => {
          pending?.resolve(outcome);
          pending = null;
        },
      };
    },
    hangNext() {
      mode = "hang";
    },
    waitForCall: () =>
      new Promise<void>((resolve) => {
        if (state.calls > 0) resolve();
        callSignal = resolve;
      }),
  };
}
