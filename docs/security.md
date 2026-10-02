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
