# Implementation backlog — Phases 2 to 5

Phase 1 (Security and Correctness Foundation) is complete and the repository
is green. This is the precise, ordered backlog for the remaining phases of
the lead-to-POC ecosystem. Each phase ends with the full gate (typecheck,
lint, unit tests, integration tests, production build, audit) before the
next begins.

## Phase 2 — Persistence and admin workflow

**Database**
- Add Drizzle ORM + `drizzle-kit`; PostgreSQL as source of truth
  (`DATABASE_URL`). Committed SQL migrations in `src/server/db/migrations`.
- Tables (per the master plan §5): `leads` (with the 16-status lifecycle and
  a central, tested state-transition table), `source_snapshots` (immutable,
  checksummed), `poc_records` (`record_json` JSONB validated by the Zod
  schema on every read/write, optimistic version column, unique indexed
  slug), `poc_revisions` (immutable history), `assets` (provenance + license
  state), `generation_jobs` + `job_steps`, `share_links` (Postgres adapter
  behind the existing `ShareLinkStore` interface; migrate the JSON store),
  `analytics_events`, `outreach_drafts`, `audit_logs`.
- Seed command for synthetic fixtures only (`npm run db:seed`).
- Share-link persistence already runs on PostgreSQL (`share_links` table,
  atomic consume/revoke, TEST_DATABASE_URL test path) — extend the same
  migration set with the Phase 2 tables below.

**Repositories and services**
- Postgres implementations for every repository; keep the fixture repository
  as the zero-config local fallback (selected by absence of `DATABASE_URL`).
- No Drizzle access from React components: server services with explicit
  inputs/outputs only.

**Admin product**
- `/admin` dashboard (leads by stage, jobs, review queue, funnel).
- Leads list (search/filter/sort/pagination, CSV+JSON bulk import, duplicate
  detection by place ID / domain / phone / normalized name+address).
- Lead detail (snapshots, sourced values, provenance, assets, jobs, POC
  versions, analytics timeline, notes).
- POC review workspace (theme selector with recommendations, viewport
  previews reusing the existing preview tooling, provenance overlay, edit
  form validated by the same Zod schema, revision history,
  approve/publish/unpublish/expire/regenerate, share-link management).
- Job operations view (statuses, structured errors, retry for authorized
  operators).
- Audit logging on every workflow action.

## Phase 3 — Enrichment and generation

- Redis + BullMQ workers (`worker/` process, separate from the web app).
  Idempotent jobs for: import normalization, places enrichment, website
  inspection, asset ingestion, palette extraction, AI copy generation, theme
  selection, POC assembly, schema validation, thumbnail generation,
  expiration maintenance, operator notification. Exponential backoff with
  jitter, structured error categories, per-provider concurrency limits,
  dead-letter view.
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
- Outreach drafting (draft-only, human approval required): evidence-based
  personalization with verified/inferred distinction, share-link
  placeholder, and the ethical guardrails from the master plan (§13). The
  sending adapter stays disabled and out of scope until explicitly
  authorized.

## Phase 5 — Deployment quality

- Multi-stage Dockerfile (app) + worker entrypoint; `docker-compose.yml`
  with app, worker, Postgres, Redis; healthchecks; graceful shutdown.
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
- Redis-backed rate limiting across workers (replacing the in-process
  limiter).
- Operations docs: backup/restore for Postgres and asset metadata, rollback
  guidance, provider terms/attribution notes.

## Deferred decisions that need the operator

- Which OAuth provider(s) to register (Google assumed as default).
- Production host (Dokploy/Coolify-class Docker host assumed).
- Object storage provider (R2 assumed; S3-compatible interface either way).
- AI provider for copy generation (interface-first; no default).
- Notification channel (console until chosen).
