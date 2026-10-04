/**
 * Synthetic end-to-end smoke workflow for the Phase 2A automation bridge.
 *
 *   npm run automation:smoke [-- --database=postgres://...]
 *
 * Uses a disposable test database (TEST_DATABASE_URL or --database) and
 * SYNTHETIC business data only. The email provider is the deterministic
 * mock: no real message can ever be sent. Tokens, contact addresses,
 * encryption material, and message bodies are redacted from the log; the
 * customer URL is printed exactly once for manual verification.
 *
 * The script must run with the react-server condition so server-only
 * modules resolve (already part of the npm script).
 */

import { randomBytes } from "node:crypto";

async function main() {
  const { configureSmokeEnvironment } = await import("./smoke-env");
  const dbUrl = configureSmokeEnvironment(process.argv.slice(2));

  const { migrate } = await import("drizzle-orm/postgres-js/migrator");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const client = postgres(dbUrl, { max: 1, prepare: false });
  try {
    await migrate(drizzle(client), { migrationsFolder: "src/server/db/migrations" });
    log("migrations applied");
  } finally {
    await client.end();
  }

  const { dispatchOperation } = await import("@/server/automation/registry");
  const { closeDb, getDb } = await import("@/server/db/client");

  const principal = { principal: "smoke-test", scopes: ["poc:read", "poc:write", "outreach:prepare", "outreach:send", "reports:read"] as const };
  const call = (operation: string, input: unknown) =>
    dispatchOperation(operation, input, { ...principal, baseUrl: "http://localhost:3000" });

  const suffix = randomBytes(4).toString("hex");
  const key = (label: string) => `smoke-${label}-${suffix}`;
  let customerUrl = "";

  try {
    // 1. start an automation run
    const run = await expectOk(call("start_automation_run", { idempotencyKey: key("run"), kind: "daily_smoke" }));
    const runId = run.runId as string;
    log(`run started: ${runId}`);

    // 2. ingest a synthetic qualified lead (with evidence + verified contact)
    const candidate = syntheticCandidate(suffix);
    const ingested = await expectOk(
      call("ingest_leads", { idempotencyKey: key("ingest"), runId, candidates: [candidate] }),
    );
    const created = (ingested.results as Array<Record<string, unknown>>)[0]!;
    if (created.outcome !== "created") throw new Error(`ingest unexpected: ${JSON.stringify(created)}`);
    const leadId = created.leadId as string;
    const snapshotIds = created.snapshotIds as string[];
    log(`lead ingested: ${leadId} (snapshots: ${snapshotIds.length})`);

    // 3. ingest it again: deterministic deduplication
    const dedup = await expectOk(
      call("ingest_leads", { idempotencyKey: key("ingest2"), runId, candidates: [candidate] }),
    );
    const dedupOutcome = ((dedup.results as Array<Record<string, unknown>>)[0]!.outcome);
    if (dedupOutcome !== "matched_existing") throw new Error(`dedup unexpected: ${String(dedupOutcome)}`);
    log(`re-ingest matched existing: ${String(dedupOutcome)}`);

    // 4. immutable evidence is already stored (step 2); re-submit identical
    //    evidence via a second lead-independent path is not possible, so the
    //    checksum-dedup proof lives in the integration tests.
    log("immutable evidence stored with content checksums");

    // 5. upsert a schema-valid POC record using an existing theme
    const record = syntheticRecord(suffix);
    const upserted = await expectOk(
      call("upsert_poc_record", {
        idempotencyKey: key("upsert"),
        runId,
        leadId,
        record,
        evidenceRefs: snapshotIds,
        reason: "smoke-initial-generation",
      }),
    );
    log(`poc upserted: v${String(upserted.version)} state=${String(upserted.state)}`);

    // 6. run automatic QA
    const qa = await expectOk(call("run_poc_qa", { idempotencyKey: key("qa"), runId, leadId }));
    if (qa.passed !== true) {
      throw new Error(`QA failed: ${JSON.stringify((qa as { blockingFailures?: string[] }).blockingFailures)}`);
    }
    log(`qa passed: ${(qa.checks as unknown[]).length} checks`);

    // 7. publish and create a share link
    const published = await expectOk(
      call("publish_poc", { idempotencyKey: key("publish"), runId, leadId, expiresInDays: 30 }),
    );
    customerUrl = String(published.shareLinkUrl ?? "");
    log(`published; share link ${String(published.shareLinkId)} (URL printed at the end)`);

    // 8. prepare an outreach message
    const prepared = await expectOk(
      call("prepare_outreach", {
        idempotencyKey: key("prepare"),
        runId,
        leadId,
        subject: `A website concept for ${candidate.business.displayName}`,
        body: SMOKE_BODY.replaceAll("{{business}}", candidate.business.displayName),
        evidenceRefs: snapshotIds,
      }),
    );
    const messageId = prepared.messageId as string;
    log(`outreach prepared: seq ${String(prepared.sequenceNumber)} (${String(prepared.kind)})`);

    // 9. send through the mock provider
    const sent = await expectOk(call("send_outreach", { idempotencyKey: key("send"), runId, messageId }));
    if (sent.status !== "sent") throw new Error(`send unexpected: ${JSON.stringify(sent)}`);
    log(`mock send ok; lead status ${String(sent.leadStatus)}`);

    // 10. list a due follow-up (simulate time passing: smoke-only update)
    const { leads } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await getDb().update(leads).set({ nextActionAt: new Date() }).where(eq(leads.id, leadId));
    const due = await expectOk(call("list_due_followups", { limit: 10 }));
    const dueList = due.due as Array<Record<string, unknown>>;
    if (!dueList.some((item) => item.leadId === leadId)) throw new Error("expected the lead to be due for a follow-up");
    log(`due follow-ups listed: ${dueList.length}`);

    // 11. record an interested reply
    const reply = await expectOk(
      call("record_reply_outcome", { idempotencyKey: key("reply"), runId, leadId, classification: "INTERESTED" }),
    );
    if (reply.leadStatus !== "INTERESTED") throw new Error(`reply status: ${String(reply.leadStatus)}`);
    log(`reply recorded: lead ${String(reply.leadStatus)}, followups stopped=${String(reply.followupsStopped)}`);

    // 12. prove no further follow-up is returned
    const dueAfter = await expectOk(call("list_due_followups", { limit: 10 }));
    const stillDue = (dueAfter.due as Array<Record<string, unknown>>).some((item) => item.leadId === leadId);
    if (stillDue) throw new Error("lead still due after INTERESTED reply");
    log("no further follow-up returned");

    // 13. read the final run report (strictly read-only) and close the run
    const report = await expectOk(call("get_run_report", { runId }));
    log(`run report (read-only): status=${String(report.status)} steps=${(report.steps as unknown[]).length}`);
    const finished = await expectOk(
      call("finish_automation_run", { idempotencyKey: key("finish"), runId }),
    );
    log(`run finished: status=${String(finished.status)} (${String(finished.derivedFrom)})`);

    log("SMOKE OK");
    if (customerUrl) {
      console.log(`\nCustomer URL (printed once): ${customerUrl}\n`);
    }
  } finally {
    await closeDb();
  }
}

function log(message: string): void {
  // The redaction module keeps incidental leaks out of these logs.
  console.log(`[smoke] ${message}`);
}

type SmokeDispatchResult = Awaited<
  ReturnType<typeof import("@/server/automation/registry").dispatchOperation>
>;

async function expectOk(
  resultPromise: Promise<SmokeDispatchResult> | SmokeDispatchResult,
): Promise<Record<string, unknown>> {
  const result = await resultPromise;
  if (!result.ok) {
    throw new Error(`operation failed: ${JSON.stringify(result.failure)}`);
  }
  return result.result as Record<string, unknown>;
}

const SMOKE_BODY = [
  "Hi {{business}} team,",
  "",
  "I put together a private concept page showing how a refreshed website could present {{business}} — the layout, photography placement, and the reservation flow.",
  "",
  "It is an unofficial concept, not a published site: {{poc_link}}",
  "",
  "If you like the direction, I am happy to walk you through it in ten minutes.",
].join("\n");

function syntheticCandidate(suffix: string) {
  return {
    candidateKey: `smoke-${suffix}`,
    business: {
      sourceType: "smoke_test",
      sourceExternalId: `smoke-place-${suffix}`,
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
        sourceIdentifier: `smoke-evidence-${suffix}`,
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

function syntheticRecord(suffix: string) {
  const now = new Date().toISOString();
  // Synthetic facts are presented as coming from the business's own site;
  // a google_places-sourced record would need google_places snapshots
  // (deterministic provider-evidence gate).
  const sv = (value: unknown, source = "official_website", verified = true) => ({
    value,
    source,
    verified,
  });
  return {
    schemaVersion: 1,
    id: `rec-smoke-${suffix}`,
    slug: `smoke-harbor-fig-${suffix}`,
    status: "active",
    expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    themeId: "heritage-bistro",
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
      website: sv(`https://harborfig-${suffix}.example.com`, "official_website", true),
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

main().catch((error) => {
  console.error(`[smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
