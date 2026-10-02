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
     configured AND the process is not in production (or `ALLOW_DEV_LOGIN=true`
     is set explicitly). Production with no method configured fails closed.
- `noindex` is treated as a crawler directive, never as access control.

## Share links

- Customer POCs are served from `/p/[token]` (the `/demo/[slug]` fixture
  route remains for local development).
- Tokens: 256 bits of CSPRNG (`crypto.randomBytes(32)`), base64url.
- Storage: SHA-256 hash only; the plaintext token is returned exactly once,
  by the creation API, to the authenticated operator.
- Enforced at request time (never by a background job): revocation, expiry
  (inclusive boundary), optional view caps, and the record disposition
  (drafts, archived, expired, and permanently closed records fail closed).
- All failures return the same generic 404. No page, API, or metadata
  response reveals whether a record exists.
- Phase 1 persistence is a single-writer JSON file (`.data/share-links.json`,
  gitignored). Phase 2 moves it behind the same interface into PostgreSQL.

## Data trust policy

- One central function (`src/lib/poc/policy.ts`) decides whether a sourced
  value may render. Narrative fields (hero copy, tagline, about,
  announcements, review summaries) accept only business-origin sources
  unverified; provider data must be verified; `ai_derived` values require
  confidence ≥ 0.7 (missing confidence defaults to untrusted). Blocked
  values are dropped before the fallback engine, with a provenance entry.
- Factual fields (hours, address, phone, ratings, menus) may render
  unverified provider data, always flagged in the admin provenance view.
- Sample menus render only with an explicit demonstration notice.

## URL and content hardening

- Every CTA passes protocol checks: `tel:`, `mailto:`, and HTTPS-only for
  external actions; `javascript:` and data URLs are rejected.
- Map iframes accept only `www.google.com` / `maps.google.com` under
  `/maps/embed*`, re-validated inside the map component (defense in depth).
- Image URLs must be local paths or HTTPS hosts on the allowlist
  (`POC_IMAGE_HOST_ALLOWLIST` extends it for a future storage domain).
  Non-allowlisted hero images fall back to theme placeholder artwork.
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

## Secrets

- `.env` files are gitignored; `.env.example` contains placeholders only.
- Server secrets are never exposed through `NEXT_PUBLIC_*`.
- The share-link API never returns stored tokens; the operator sees a token
  once at creation.
