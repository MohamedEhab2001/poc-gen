# Implementation backlog — Phases 2B to 5

Phase 1 (Security and Correctness Foundation) and Phase 2A (Autonomous
Automation Bridge) are complete and the repository is green. The product
direction is **autonomous and fail-closed**: an external scheduler (a
ChatGPT Scheduled Task acting as an MCP client) drives the workflow through
the secured tool surface in `docs/automation-bridge.md` — there is no
manual review queue, no Redis, no BullMQ, and no application scheduler, and
none is planned. Each phase ends with the full gate (typecheck, lint, unit
tests, integration tests, production build, audit) before the next begins.

## Phase 2B — Read-only operator visibility

The workflow is already observable through `automation_runs`,
`automation_run_steps`, `audit_logs`, and the report tools; this phase adds
human *viewing* only (never an approval step):
- `/admin` dashboard: leads by stage, run history, funnel counters, and the
  ambiguous-reply exception report — all from the same PostgreSQL tables.
- Lead detail: snapshots, sourced values, provenance, POC versions,
  outreach timeline, suppression state.
- Operator actions stay limited to what already exists as audited tools
  (retry, suppress, revoke links) plus emergency stop.

## Phase 3 — Provider adapters and extended QA

The service contracts from Phase 2A stay fixed; adapters slot in behind the
existing interfaces. Workers remain out of scope unless volume demands them
(the external scheduler orchestrates).
- `PlacesProvider` (official Google Places adapter; content submitted under
  its current storage/attribution rules), `WebsiteEnrichmentProvider`
  (robots-respecting, SSRF-guarded), `AiContentProvider` (structured output
  validated against dedicated schemas), `EmailProvider` production adapter
  (AWS SES v2 preferred; `OUTREACH_SEND_ENABLED` stays default-off).
- Provider interfaces (mock implementations first, used by tests and local
  dev): `PlacesProvider` (official Google Places API adapter), 
  `WebsiteEnrichmentProvider` (robots-respecting, SSRF-guarded inspection of
  the business's own site: private-IP/localhost/metadata blocking, strict
  timeouts, size and redirect limits), `AiContentProvider` (structured output
  validated against a dedicated Zod schema; only verified fields as input;
  `ai_derived` + confidence + prompt/model metadata), `AssetStore`
  (R2/S3-compatible), `NotificationProvider`.
- Palette extraction from verified logos with contrast checks; never invent
  a logo (keep the typographic wordmark fallback).
- Deterministic, explainable theme-selection service (scored alternatives +
  reasons), with human override stored in the record.
- POC assembly pipeline validating every write through the record schema.

## Phase 4 — Analytics and operator assistance

- First-party events (`/api/events` with idempotency): `poc_view`, CTA
  clicks, share-link expiry, manual outcome marks (`lead_replied`, `won`,
  `lost`). Short-lived anonymous session ids; no raw IPs (salted rotating
  hashes if abuse protection needs them); `sendBeacon`-style dispatch that
  never delays navigation; event deduplication.
- Dashboard funnel with explicitly defined metrics (view rate, CTA
  engagement, reply rate, qualified-call rate, win rate).
- Operator notifications (console adapter default; email/Slack behind env
  config) for first view, first CTA click, repeat visits in a configurable
  window, generation failures, near-expiry links — deduplicated.
- Outreach analytics join the existing report tools (the drafting and
  sending machinery, guardrails, suppression, and audit trail already ship
  in Phase 2A; production sending activates per-environment behind the
  provider adapter above).

## Phase 5 — Deployment quality

- Multi-stage Dockerfile (app); `docker-compose.yml` with app + Postgres
  (no Redis — nothing in the architecture needs it); healthchecks; graceful
  shutdown.
- `/api/health/live` and `/api/health/ready`.
- GitHub Actions: PR workflow (lockfile-enforced install, typecheck, lint,
  unit, migration validation, build with no network fonts, audit) and a
  SHA-tagged image build workflow for main, deployment-gated until a host is
  configured.
- Playwright E2E: admin auth, import → enrich (mocks) → generate → review →
  approve → publish, share-link valid/expired/revoked, draft inaccessibility,
  preview theme persistence, CTA tracking, all thirteen themes at 390×844
  and 1440×900, edge states. Axe accessibility checks and targeted visual
  snapshots.
- Nonce-based CSP replacing `'unsafe-inline'` for scripts.
- Deliberate Next.js 16 upgrade (removes the postcss override) following the
  official upgrade guide and codemods, after the E2E suite exists to catch
  regressions.
- Database-backed rate limiting across instances (replacing the in-process
  limiter) if multi-instance deployments appear.
- Operations docs: backup/restore for Postgres and asset metadata, rollback
  guidance, provider terms/attribution notes.

## Deferred decisions that need the operator

- Which OAuth provider(s) to register (Google assumed as default).
- Production host (Dokploy/Coolify-class Docker host assumed).
- Object storage provider (R2 assumed; S3-compatible interface either way).
- AI provider for copy generation (interface-first; no default).
- Notification channel (console until chosen).
