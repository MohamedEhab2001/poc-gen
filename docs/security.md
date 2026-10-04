# Security posture (Phase 1)

This document describes the security controls implemented in Phase 1 of the
hardening plan, the residual risks accepted, and the upgrade path for each.

## Authentication and authorization

- Internal surfaces (`/themes`, `/themes/[themeId]`, `/preview/[slug]`, and
  the reserved `/admin/**`) are protected at **two boundaries**: edge
  middleware redirects unauthenticated sessions to `/login`, and every
  protected server page re-checks authorization via `requireOperator()`
  (defense in depth; middleware alone is never trusted).
- Sessions are stateless HMAC-SHA256-signed cookies (`AUTH_SECRET`, ≥ 32
  chars required in production), httpOnly, SameSite=Lax, Secure in
  production, 7-day expiry, verified with constant-time comparison.
- Login methods, in order of strength:
  1. **Google OAuth** (`AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`) — state-cookie
     CSRF protection, 10-second upstream timeouts, `email_verified` required,
     allowlist enforced.
  2. **Operator password** (`OPERATOR_PASSWORD`) — constant-time comparison,
     per-IP fixed-window rate limiting (8 attempts/minute).
  3. **Dev login** — passwordless, allowed only when no stronger method is
     configured AND `NODE_ENV !== "production"`. There is no environment
     override: passwordless production login is impossible by construction,
     and production additionally requires `AUTH_SECRET` (≥ 32 chars),
     `ADMIN_EMAILS`, and one real login method; anything less fails closed
     with a generic error (specifics are logged server-side only).
- Route protection covers `/themes`, `/themes/[themeId]`, `/preview/**`,
  `/demo/**`, and the reserved `/admin/**`. `/p/[token]` is the only
  unauthenticated route that can render a customer POC.
- `noindex` is treated as a crawler directive, never as access control.

## Share links

- Customer POCs are served from `/p/[token]`; `/demo/[slug]` is an
  operator-only fixture route behind the same authentication as `/themes`.
- Tokens: 256 bits of CSPRNG (`crypto.randomBytes(32)`), base64url.
- Storage: SHA-256 hash only; the plaintext token is returned exactly once,
  by the creation API, to the authenticated operator. Tokens are never
  persisted or logged.
- Resolution is peek-then-consume: the token hash is inspected without
  mutation, the record is loaded and must be renderable, and rendering is
  authorized only by an **atomic consumption** — a single conditional
  UPDATE that re-checks revocation, expiry (inclusive boundary), and the
  view cap while incrementing the count. Concurrent requests can never both
  spend the last allowed view. **Revocation is equally atomic**
  (`revokeById`: UPDATE ... WHERE revoked_at IS NULL), so a revocation
  racing a consumption can never be overwritten by a stale view-count
  write; there is no generic full-record update path.
- Persistence: PostgreSQL (Drizzle, committed SQL migration
  `src/server/db/migrations/0000_share_links.sql`) in production and
  whenever `DATABASE_URL` is set — integration tests run against a real
  database via `TEST_DATABASE_URL` (honored only when `NODE_ENV=test`, so a
  production runtime can never consume it). Local development without a
  database uses a hardened single-process JSON adapter (mutex-serialized
  read-modify-write, ENOENT-only empty state returning fresh objects per
  read, unique temp-file replacement, corruption surfaces as an error and is
  never silently overwritten) — it is never selected in production.
  Production without `DATABASE_URL` fails closed: share-link APIs return a
  controlled 503 and `/p/[token]` returns the generic 404, with no storage
  details exposed.
- All link failures return the same generic 404. No page, API, or metadata
  response reveals whether a record exists.

## Data trust policy

- One central function (`src/lib/poc/policy.ts`) decides whether a sourced
  value may render, and every sourced field passes through it: narrative
  copy, factual data, imagery, reviews, hours (descriptions and periods),
  social links, meal types, dietary options, explicit CTAs and hero actions,
  menus, and the business status used by record disposition. Narrative
  fields accept only business-origin sources unverified; `ai_derived`
  values require confidence ≥ 0.7 (missing confidence defaults to
  untrusted). Blocked values are dropped before the fallback engine, with a
  provenance entry, and never reused to synthesize fallback copy.
- Hard bans regardless of confidence: **AI-generated business imagery**
  (never presented as a real photograph of the business; wrapped images use
  the wrapper as the authoritative provenance layer, with schema-level
  source-match enforcement), **AI-derived reviews** (reviewer identities,
  ratings, and text are never generated), and **AI-derived dietary claims**.
  Wrapped logo/hero images whose wrapper and inner sources disagree fail
  validation outright.
- Factual fields (hours, address, phone, ratings, menus) may render
  unverified provider data, always flagged in the admin provenance view.
- Sample menus render only with an explicit demonstration notice.

## URL and content hardening

- Every CTA passes protocol checks: `tel:`, `mailto:`, and HTTPS-only for
  external actions; `javascript:` and data URLs are rejected.
- Map iframes accept only `www.google.com` / `maps.google.com` under
  `/maps/embed*`, re-validated inside the map component (defense in depth).
- Image URLs must be local paths or HTTPS hosts on the shared allowlist
  (`src/lib/poc/image-hosts.ts`): the same validated source feeds
  `isAllowedImageUrl()`, the CSP `img-src` directive, and accepts the R2
  public hostname, so an approved CDN can never pass validation and still be
  blocked by the browser. Non-allowlisted hero images fall back to theme
  placeholder artwork.
- Coordinates: zero is a valid value; presence checks use explicit null
  comparisons.
- `expiresAt` is enforced synchronously at request time with an injectable
  clock (`getRecordDisposition(record, now)`).
- Preview tooling preserves the full query state when any control changes;
  regression-tested.
- Metadata generation applies the same disposition rules as rendering:
  non-renderable records get a generic title with no business name.

## Headers

`next.config.ts` sets a restrictive CSP (`default-src 'self'`; images limited
to self and the placeholder host; frames limited to Google Maps embeds;
`object-src 'none'`; `frame-ancestors 'self'`), plus `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options`.

**Residual risk (accepted, with upgrade path):** `script-src`/`style-src`
include `'unsafe-inline'` because Next.js hydration injects inline bootstrap.
A nonce-based CSP requires middleware-driven dynamic headers and is scheduled
in the Phase 5 backlog.

## Dependency posture

- Next.js 15.5.27 (latest patched maintenance release of the 15 line) with a
  postcss override to 8.5.28. `npm audit --omit=dev`: **0 vulnerabilities**.
- Phase 2A additions: `@modelcontextprotocol/sdk` 1.32.0 and `jose` 6.2.12
  (deduped across both) — no production advisories.
- **Phase 2A.1 dependency actions:** the `esbuild` advisory
  (GHSA-67mh-4wv8-2f99) via `drizzle-kit → @esbuild-kit/core-utils` is
  RESOLVED with a targeted override to esbuild 0.25 (drizzle-kit generate,
  migrations, and lint verified working after the override).
- **Remaining security debt (dev-only, no fixed release exists):**
  `braces` (high, GHSA-vfj7-8cjw-p6xm) via
  `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch`.
  The advisory currently flags EVERY published version (`*`), the installed
  copy is the latest 3.0.3, and the only npm-suggested "fix" is a breaking
  eslint-config-next downgrade — so no safe resolution exists today. It is
  lint tooling only (never shipped, never runs in CI on untrusted input);
  impact would be stack exhaustion while linting a maliciously nested glob.
  It clears automatically once eslint-config-next ships the chain update.
- The postcss advisory affected every Next release up to 16.3.0-preview; the
  override installs the patched postcss independently of Next's range. The
  clean long-term fix is the deliberate Next 16 upgrade (backlog).
- Production builds bundle all fonts locally (`next/font/local`, SIL OFL with
  license files committed in `src/fonts/`); no font CDN is contacted at
  build or runtime.

## Client/server boundary

- The login page passes only a boolean `PublicAuthUiConfig` projection into
  the client component: operator emails, secret state, and configuration
  completeness never serialize into the RSC payload (regression-tested).
- `/demo/[slug]` uses static generic metadata with no record lookup at
  metadata time, so record existence, names, and state cannot leak through
  metadata or prefetching — including to an operator removed from
  `ADMIN_EMAILS` whose signed cookie is still valid.

## Secrets

- `.env` files are gitignored; `.env.example` contains placeholders only.
- Server secrets are never exposed through `NEXT_PUBLIC_*`.
- The share-link API never returns stored tokens; the operator sees a token
  once at creation. Plaintext tokens are never persisted or logged
  (verified against the real database in integration tests).


## Phase 2A — Automation bridge threat model and controls

The bridge exposes machine-driven lead ingestion, publishing, and outreach
over an authenticated surface. The new threats and their controls:

**Machine surface abuse.** The remote MCP endpoint (`/api/mcp`, stateless
Streamable HTTP) and the internal HTTP adapter
(`/api/internal/automation/**`) are the only automation entrances. Both
require a bearer credential: production validates OAuth 2.1 style JWTs
(configured issuer + audience + JWKS; wrong/expired/wrong-audience tokens
all fail identically and generically) and stays **fail-closed (503)** until
that configuration is complete. A dev static bearer is compared in constant
time and is *structurally impossible* in production (checked in config
resolution AND the authenticator). Operator cookies are rejected on the
machine surface (CSRF must not be the primary control), and an admin email
in a request body is never identity. Per-tool scopes (`poc:read`,
`poc:write`, `outreach:prepare`, `outreach:send`, `reports:read`) are
enforced before any handler runs; request bodies are bounded (256/512 KB),
rate-limited per principal, correlated, and answered with generic
structured errors — never stack traces or database messages.

**Replay and double-effect.** Every mutating operation requires an
idempotency key; the ledger (hashed key + canonical request hash) returns
the saved result on identical replay, refuses key reuse with a different
body, expires crashed pending entries, and is enforced across processes by
database unique constraints. Publishes transition `qa_passed -> published`
with a single conditional UPDATE (concurrent publishes create exactly one
link — integration-tested), sends reserve `prepared -> reserved`
conditionally before any provider call, and lead updates are optimistic
(status+version re-checked in the WHERE clause).

**Contact data at rest.** Raw addresses live only as versioned AES-256-GCM
envelopes under dedicated environment keys (never in the database or repo);
lookups use HKDF-derived keyed hashes stable across rotation. Only the
address *domain* is stored in plain text (rate limits). Logs, audit
metadata, run summaries, idempotency results, and tool outputs pass through
structural redaction — tokens, addresses, bodies, and secrets are masked;
the publish token is stripped before idempotency storage and returned
exactly once.

**Suppression integrity.** Suppression/unsubscribe state is unique per
address hash and checked transactionally before any send reservation; daily
and per-domain counters are advisory-lock-serialized so parallel sends
cannot overshoot limits. Unsubscribe links are HMAC-signed contact hashes
(keyed off the contact-encryption material) and cannot be forged.

**Evidence integrity.** `source_snapshots` are immutable at the database
boundary (UPDATE/DELETE trigger) with deterministic canonical checksums;
records carry revision history written transactionally, and every stored
record re-validates through the Zod schema on read — invalid JSON fails
closed with a structured log and never renders.

**No new trust in callers.** The server fetches no caller-supplied URLs
(no SSRF surface), enforces input lengths and batch caps before database
work, keeps all database/crypto/provider code behind server-only
boundaries, and preserves the Phase 1 CSP, image-host allowlist, map
allowlist, and provenance policy. No secrets or real business data are
committed; production sending is disabled by default and the only email
provider in this phase is a deterministic mock that cannot open a socket.


## Phase 2A.1 — hardening additions

- **Atomic publication:** link revocation, link creation (hash-only at
  rest), the `qa_passed → published` and lead transitions, the audit entry,
  and the run step commit in ONE transaction; an injected share-link
  failure provably rolls everything back (integration-tested with a
  database trigger). Republishing a revision revokes prior links
  transactionally; the plaintext URL is returned exactly once and replays
  return the redacted result.
- **Linearized suppression/sending:** every path that decides a contact's
  sendability (send reservation, `suppress_contact`, reply-driven
  suppression, the public unsubscribe endpoint) holds the SAME
  PostgreSQL advisory transaction lock keyed by the contact's keyed hash.
  Suppression committed first ⇒ the provider is never called (including a
  post-reservation recheck immediately before the provider boundary); a
  call already in flight cannot be recalled but every future follow-up is
  stopped. Provider calls are time-bounded; timeouts resolve as
  delivery_unknown (never auto-retried). Verified with deterministic
  barrier-based provider spies, no timing sleeps.
- **Principal-scoped idempotency:** reservations are unique per
  (principal, operation, key hash); completion can never touch another
  principal's row; different principals using the same key are independent
  (migration 0002, integration-tested).
- **Branch-safe business identity:** domain and phone are soft signals
  (plain indexes) that never merge; only the source key or complete
  name+address matches automatically; identity disagreement and
  uncertainty surface as explicit conflicts; matched results always carry
  lead and business ids and enrich the existing lead with checksum-deduped
  evidence without ever downgrading verified contacts.
- **Deterministic evidence linkage:** outreach claims carry a supporting
  excerpt (and optional JSON pointer) that must occur in the referenced
  immutable snapshot payload; the claim statement must occur in the
  message; provider-sourced record facts require a matching provider
  snapshot. Deterministic linkage, not semantic fact-checking.
- **Live email (EmailJS):** server-side `@emailjs/nodejs` provider with
  exhaustive configuration validation (mock fails closed in production;
  incomplete EmailJS config fails closed; private key required in
  production), dry-run default outside production, request timeouts,
  outcome mapping (network/timeout ⇒ delivery_unknown; definite 4xx ⇒
  failed with safe codes), a ≥1,100 ms PostgreSQL-backed cross-instance
  rate reservation, an allowlist HTML sanitizer on the unescaped template
  variable, and zero logging of recipients, parameters, bodies, tokens, or
  keys. Outbound sending is NOT inbound reply automation — replies still
  require the external scheduler (or a future inbound connector).
