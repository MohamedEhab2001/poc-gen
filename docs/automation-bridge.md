# The autonomous automation bridge (Phase 2A)

This document describes the persistent, fail-closed bridge between an
external scheduler (initially a ChatGPT Scheduled Task acting as an MCP
client) and this application's lead-to-POC workflow. Everything here is
implemented unless explicitly marked *not implemented*.

## The external-scheduler architecture

There is no Redis, no BullMQ, no application cron scheduler, no background
job queue, and no daemon polling the database. PostgreSQL is the operational
source of truth, and **the external scheduler decides when to make the next
tool call**. Every tool call performs one bounded, idempotent operation and
returns structured state so the scheduler can branch:

```
ChatGPT Scheduled Task (MCP client)
  -> start_automation_run
  -> ingest_leads            (researched candidates + evidence)
  -> upsert_poc_record       (complete, schema-valid record)
  -> run_poc_qa              (deterministic gates; automatic reject/quarantine)
  -> publish_poc             (atomic publish + secure share link)
  -> prepare_outreach        (validated, footered draft)
  -> send_outreach           (mock provider in this phase)
  -> list_due_followups / record_reply_outcome
  -> get_run_report          (closes the run)

Incoming email event (classified by the agent)
  -> record_reply_outcome    (stop / suppress / defer, deterministically)
```

Why no queue: the workload is a small daily batch whose sequencing decisions
(qualify, branch on QA, stop on replies) belong to the agent, not to a
worker. `automation_runs` / `automation_run_steps` are an audit trail and
resumable state model — nothing polls them. If volume ever demands it, a
Phase 5 worker can be added without changing these service contracts.

## Database entities

Migration `0001_automation_bridge.sql` (applied on top of `0000_share_links`;
see *Migration and setup* below) adds:

| Table | Purpose |
|---|---|
| `businesses` | Stable business identity + normalized dedup keys (source key, domain, phone, name+address), each backed by a unique index. |
| `leads` | One per business: lifecycle status, score + reasons, outcome reason, `next_action_at`, optimistic `version`. |
| `source_snapshots` | Immutable evidence: provider, source ref, retrieval time, canonical-content checksum, JSONB payload, attribution, freshness. A database trigger rejects any UPDATE/DELETE. |
| `poc_records` | Current document per lead: unique slug, JSONB record (validated by the shared Zod schema on every read), schema version, optimistic version, state (`draft`/`qa_passed`/`published`/`expired`/`archived`/`failed`), QA report, publication stamps. |
| `poc_revisions` | Immutable history: the previous record version, the reason, and the automation principal that changed it — written in the same transaction as the update. |
| `automation_runs` / `automation_run_steps` | Run audit trail: kind, status, requested-by, counters, per-step operation/lead/status/error/attempt and redacted summaries. |
| `contacts` | Verified public business contacts: keyed hash for dedup/suppression, AEAD-encrypted raw address, domain-only plain column for rate limits. |
| `outreach_messages` | Prepared/sent messages: sequence (one initial + ≤2 follow-ups enforced by a unique `(lead, sequence)`), body, idempotency-key hash, reservation and delivery state. |
| `reply_events` | Externally classified replies (received via `record_reply_outcome`). |
| `suppressions` / `unsubscribes` | Permanent do-not-contact state and unsubscribe provenance; unique per address hash. |
| `automation_idempotency` | The idempotency ledger (see below). |
| `audit_logs` | Every mutation: actor, action, target, run correlation, redacted metadata. |

UUIDs are generated in application code (`crypto.randomUUID()`); no
PostgreSQL UUID extension is required.

## The lead state machine

Defined once in `src/lib/automation/lifecycle.ts`; services validate every
transition inside the transaction that persists it. React components, MCP
handlers, and route handlers never write statuses.

```
DISCOVERED -> QUALIFIED -> ENRICHED -> CONTACT_VERIFIED -> POC_GENERATED -> QA_PASSED -> PUBLISHED -> OUTREACH_READY -> CONTACTED -> FOLLOW_UP_1 -> FOLLOW_UP_2
     |            |            |               |                 |              |            |             |             |             |
     +-> REJECTED/QUARANTINED/FAILED <------- (available from each pipeline stage) --------+
                                                    |
OUTREACH_READY/CONTACTED/FOLLOW_UP_* -> INTERESTED | NOT_INTERESTED | UNSUBSCRIBED | BOUNCED | SUPPRESSED | FAILED
```

- Terminal states (`INTERESTED`, `NOT_INTERESTED`, `UNSUBSCRIBED`,
  `BOUNCED`, `SUPPRESSED`, `REJECTED`, `QUARANTINED`) never transition back
  into outreach automatically.
- `FAILED` has **no** outgoing edges in the table. Retrying a technical
  failure is the explicit, audited `retry_failed_lead` tool (the only legal
  exit), which restores the stored pre-failure status and can never skip a
  policy gate — every subsequent step re-runs its own gates.
- Writing a new record revision intentionally moves the lead backwards
  (`QA_PASSED`/`PUBLISHED` -> `POC_GENERATED`): a changed record invalidates
  its QA/publication until they run again (fail closed — the share link
  stops resolving).

## Service and tool contracts

All operations live behind one registry
(`src/server/automation/registry.ts`). The MCP endpoint
(`/api/mcp`) and the internal HTTP adapter
(`/api/internal/automation/[operation]`) are thin wrappers over the same
`dispatchOperation` — no business logic is duplicated. Inputs are validated
by strict, bounded Zod schemas (`src/lib/automation/schemas.ts`); unknown
keys (e.g. `force`, `skipChecks`) are rejected outright.

| Tool | Scope | Mutating | Notes |
|---|---|---|---|
| `health` | `poc:read` | no | Capabilities + flags; no secrets. |
| `start_automation_run` | `poc:write` | yes | Creates/resumes a run. |
| `ingest_leads` | `poc:write` | yes | ≤10 candidates/call; per-candidate `created`/`matched_existing`/`conflict`/`rejected`/`invalid`; weak scores rejected; transactional dedup under an advisory lock. |
| `upsert_poc_record` | `poc:write` | yes | recordSchema-validated; evidence refs must belong to the lead; theme must be in the 13-theme registry; writes the revision transactionally. |
| `run_poc_qa` | `poc:write` | yes | Deterministic gates (below); blocking failure ⇒ REJECTED (or QUARANTINED for suspicious model/policy inconsistencies). |
| `publish_poc` | `poc:write` | yes | Requires QA-passed record+lead; atomic `qa_passed->published` transition; creates the secure share link; token returned exactly once; emergency-stop checked immediately before. |
| `prepare_outreach` | `outreach:prepare` | yes | Rejects deceptive subjects, POC misrepresentation, missing/extra `{{poc_link}}`; appends the compliance footer; resolves the placeholder to a fresh per-message share link bound to the lead. |
| `send_outreach` | `outreach:send` | yes | Requires `OUTREACH_SEND_ENABLED`; verified contact only; transactional suppression check; daily/per-domain/per-lead limits (advisory-lock serialized); reservation before the provider call; never auto-retries `delivery_unknown`. |
| `list_due_followups` | `outreach:prepare` | no | Only due + eligible leads (no reply/bounce/suppression/terminal/expired POC/revoked link/delivery-unknown); bounded (default 25, max 100). |
| `record_reply_outcome` | `outreach:prepare` | yes | Deterministic actions per classification (below). |
| `suppress_contact` | `outreach:prepare` | yes | Permanent suppression by address or lead. |
| `get_run_report` | `reports:read` | no (finish:true mutates) | Counters, redacted steps, ambiguous-reply exceptions; `finish:true` closes the run. |
| `get_interested_leads` | `reports:read` | no | Safe summaries + share-link view counts. |
| `retry_failed_lead` | `poc:write` | yes | The explicit, audited FAILED-exit. |

### Automatic gates and fail-closed behavior

There is no review queue and no override parameter. Outcomes:
`PASS` (continue), `RETRYABLE` (typed error + `retryAfterSeconds`),
`SKIPPED` (recorded, batch continues), `REJECTED` (terminal data-quality),
`SUPPRESSED` (terminal contact/compliance), `QUARANTINED` (suspicious data),
`FAILED` (technical, explicit retry only).

- Insufficient evidence or a weak score ⇒ the candidate is rejected at
  ingestion — weak candidates never enter the system.
- Invalid records fail the shared Zod schema; invalid **stored** JSON fails
  closed on read (structured log, never renders).
- Untrusted image origins are replaced by the theme placeholder (render
  policy); provider content rendering without attribution/license fails QA.
- Unverified contacts cannot be prepared for or sent to.
- Permanently closed or expired businesses cannot publish or send.
- A QA failure cannot be overridden; unknown request keys are invalid input.
- `AUTOMATION_EMERGENCY_STOP=true` is checked immediately before the share
  link is created and immediately before the provider call.

QA checks (all blocking unless noted): `SCHEMA_VALID`, `RECORD_DISPOSITION`,
`RENDER_MODEL_OK`, `IMAGE_ORIGINS`, `MAP_ORIGIN`, `PLACEHOLDER_TOKENS`,
`CTA_PROTOCOLS`, `ATTRIBUTION_METADATA`, `BUSINESS_OPEN`, `NOT_EXPIRED`,
`RENDER_POLICY` (re-runs the central policy; blocked values must all be
hidden by normalization). Screenshot and AI-vision checks are *not
implemented* in this phase; they will join the same `{code, severity,
status, details}` array without breaking callers.

### Reply classification actions

| Classification | Action |
|---|---|
| `INTERESTED` / `QUESTION` | Lead -> `INTERESTED`, follow-ups stop, appears in `get_interested_leads`. |
| `NOT_INTERESTED` | Lead -> `NOT_INTERESTED` + permanent suppression. |
| `UNSUBSCRIBE` | Lead -> `UNSUBSCRIBED` + permanent suppression + unsubscribe record. |
| `BOUNCE` | Lead -> `BOUNCED` + address suppression. |
| `OUT_OF_OFFICE` | `next_action_at` deferred once by 3 days; never loops. |
| `AMBIGUOUS` | Follow-ups stop; surfaced in run-report exceptions; no speculative reply is ever sent. |

Compliance records (suppression/unsubscribe) are written regardless of the
lead's lifecycle state; the lead transition itself happens only when the
lifecycle table allows it.

## Authentication and scope setup

The remote MCP endpoint (`POST /api/mcp`, Streamable HTTP, stateless) and
the internal HTTP adapter require a bearer token with a specific scope per
operation. Scopes: `poc:read`, `poc:write`, `outreach:prepare`,
`outreach:send`, `reports:read`.

**Production (OAuth 2.1 resource server):** configure
`MCP_EXPECTED_ISSUER`, `MCP_EXPECTED_AUDIENCE`, `MCP_JWKS_URL`, and
`MCP_REQUIRED_SCOPES`. Access tokens are validated with the issuer's JWKS
(operator-configured URL — caller-supplied URLs are never fetched), with
issuer/audience/expiry/subject checks; wrong-issuer, wrong-audience,
expired, malformed, and insufficient-scope credentials are all rejected
generically (401/403, no detail leakage). Until an authorization server is
registered, production stays fail-closed: the endpoint answers 503 rather
than weakening authentication. `/.well-known/oauth-protected-resource`
advertises the configured issuer to clients.

**Development:** `ALLOW_DEV_MCP_BEARER=true` + `DEV_MCP_BEARER_TOKEN`
enables a static bearer (constant-time compared, all scopes). This is
structurally impossible in production — enforced in both configuration
resolution and the authenticator itself.

**Internal HTTP adapter:** the same verification; operator cookies are
deliberately not accepted (cookie-driven machine automation would make CSRF
the primary control) and an admin email in a request body is never proof of
identity.

Request hygiene on both surfaces: bounded bodies (256 KB MCP / 512 KB HTTP),
per-principal rate limits, correlation ids, generic structured errors, no
stack traces or driver messages, and credentials never in query strings.

### Connecting a remote MCP client

1. Deploy with `DATABASE_URL` set; run `npm run db:migrate`.
2. Register an OAuth client / token issuer whose JWTs carry your chosen
   scopes; set the four `MCP_*` variables above plus `MCP_PUBLIC_BASE_URL`.
3. Add the connector in the client (ChatGPT: Settings → Connectors → add
   MCP server) pointing at `https://<host>/api/mcp`. Discovery via
   `/.well-known/oauth-protected-resource` is supported.
4. Verify with the `health` tool, then run the smoke flow against a
   disposable database (below) before pointing anything at production data.

## Configuration

See `.env.example` — every variable is documented inline. Production
configuration is validated at first use and fails closed: incomplete
production configs log redacted details server-side and answer with generic
errors. Key groups: database, repository mode, automation switches and
limits, outreach identity/limits/provider, contact encryption keys, and the
MCP OAuth set.

### Dry-run versus live send

`OUTREACH_SEND_ENABLED` is **false by default**. In dry-run, everything up
to and including `prepare_outreach` works; `send_outreach` fails closed with
`sending_disabled`. With sending enabled and the only implemented provider
(`mock`), the full flow runs with zero network activity — the mock provider
never opens a socket, so tests, builds, previews, and smoke runs can never
send real email. A production SES v2 adapter is the preferred next step and
slots into the existing `EmailProvider` interface; enabling any other
provider name today fails configuration validation.

### Emergency stop

`AUTOMATION_EMERGENCY_STOP=true` halts publication and sending instantly.
In-flight effects: a publish attempt fails before the link is created; a
send whose reservation already committed is marked `failed` with
`emergency_stop` before the provider call. Reads keep working.

## Idempotency and recovery rules

Every mutating operation requires an `idempotencyKey` (8–128 chars,
`[A-Za-z0-9._:-]`). The ledger stores a hash of the key plus a canonical
hash of the request:

- Same key + same request after completion ⇒ the saved result is returned
  (`replayed: true`). For `publish_poc` the saved result is token-redacted —
  the plaintext URL exists only in the first response.
- Same key + same request while still executing ⇒ `RETRYABLE` with a
  retry-after hint (a crashed execution's pending entry expires after 24 h
  and is reclaimed atomically).
- Same key + different request ⇒ `idempotency_key_conflict`; never executed.
- Replaying a FAILED result returns the saved failure; use a new key to
  actually retry.

Recovery: because each step is bounded and idempotent, the scheduler's
recovery procedure is simply "re-call the last operation with the same key";
state converges. `automation_run_steps` records where a run stopped.

## Contact encryption and key rotation

Raw addresses are stored only as versioned AES-256-GCM envelopes
(`aead:v1:<keyId>:<iv>:<ciphertext>:<tag>`, AAD-bound). Dedup and
suppression use an HKDF-derived HMAC-SHA256 hash so the database cannot be
mined for addresses; the hash key derives from the lexicographically-first
key id, so hashes survive rotation. Rotation: generate a new key, append it
to `CONTACT_DATA_ENCRYPTION_KEYS`, flip `CONTACT_DATA_ACTIVE_KEY_ID`; new
envelopes use the new key, old keys keep decrypting until rewritten.
Unsubscribe links are HMAC-signed contact hashes — stateless, keyed off the
same material, and impossible to forge without it. Keys are never stored in
the database or committed; `GET/POST /api/unsubscribe` implements the
one-click (RFC 8058) flow.

## Backup and restore considerations

Everything operational lives in the one PostgreSQL database: back it up
with `pg_dump` (including the `drizzle` bookkeeping schema so migrations
resume correctly). Two things a database backup does **not** contain:
`CONTACT_DATA_ENCRYPTION_KEYS` (lose the keys and stored envelopes are
undecryptable — back them up separately, e.g. in your secrets manager) and
plaintext share tokens (only their hashes exist; URLs already delivered to
the scheduler/lead remain usable until expiry/revocation). Restoring to a
fresh host: set the env, run `npm run db:migrate`, restore the dump.

## How the future ChatGPT tasks will call the tools

**Daily task:** `start_automation_run` → research externally →
`ingest_leads` (≤10 candidates with evidence + scores) → for each created
lead: build the record from the evidence → `upsert_poc_record` →
`run_poc_qa` → on pass `publish_poc` (keep the returned URL) →
`prepare_outreach` (subject/body with `{{poc_link}}`, evidence refs) →
optionally `send_outreach` when live sending is enabled →
`list_due_followups` → prepare/send due follow-ups → `get_run_report` with
`finish:true`.

**Reply-triggered task:** classify the reply externally →
`record_reply_outcome` → if `AMBIGUOUS`, include it in the operator's
exception report; if `INTERESTED`/`QUESTION`, surface via
`get_interested_leads`. No further action is ever taken automatically on a
replied lead.

## Troubleshooting

- **Auth paused (503 from /api/mcp in production):** the OAuth set is
  incomplete — set all four `MCP_*` values; until then the endpoint is
  deliberately fail-closed.
- **Duplicate requests / `idempotency_key_conflict`:** the same key was
  reused with a different body. Use a fresh key per logical request;
  replays of identical requests are free.
- **`delivery_unknown` messages:** a provider outcome could not be
  confirmed. They are never retried automatically; the lead's further sends
  are blocked until an operator resolves the message.
- **Suppressed contacts:** check `suppressions`/`unsubscribes` by the
  address-hash prefix returned from `suppress_contact`. A suppressed
  contact can never be sent to, including under concurrency.
- **Failed QA:** read `blockingFailures` from the `run_poc_qa` result (also
  persisted on `poc_records.qa_report`). Fix the record and upsert a new
  revision; there is no override.
- **FAILED leads:** `retry_failed_lead` restores the pre-failure status;
  the original failure reason is in `leads.outcome_reason` and the audit
  log.

*Not implemented in this phase:* web discovery, Google Places enrichment
adapters, website crawling, production AI copy generation, screenshot /
visual-AI QA, reply webhooks (replies arrive via the scheduler calling
`record_reply_outcome`), and a production email provider. Google Places
content you submit must follow its current storage and attribution rules —
submit only permitted fields or references, never prohibited payloads, and
no HTML scraping of Google Search or Google Maps is implemented or
permitted.
