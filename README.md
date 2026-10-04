# POC Gen

A data-driven ecosystem that generates polished proof-of-concept websites for local businesses (initially restaurants and cafés) from a single structured record. One multi-tenant Next.js app serves many records by slug; thirteen genuinely different theme systems render the same schema.

The primary use case is **private, unindexed POC links** shared with local-business owners during personalized outreach.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The app runs entirely on local fixtures with bundled fonts. No database, Google Maps key, or object storage is required for development — and the production build needs no internet access.

Internal routes (`/themes`, `/preview/**`, `/demo/**`) require an operator session. In development a passwordless dev login is available for the allowlisted operator email; production requires `AUTH_SECRET`, `ADMIN_EMAILS`, and Google OAuth or an operator password — passwordless production login is impossible, and incomplete configuration fails closed (see `.env.example` and [docs/security.md](docs/security.md)).

```bash
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # eslint
npm run test         # vitest (all suites; integration suites run when TEST_DATABASE_URL is set)
npm run test:integration  # PostgreSQL integration suites explicitly (fails loudly if skipped)
npm run db:migrate   # apply committed Drizzle migrations (requires DATABASE_URL)
npm run automation:smoke -- --database=postgres://...  # synthetic end-to-end flow, mock providers only
npm run build        # production build (offline: fonts are bundled)
npm start            # serve the production build
```

## Routes

| Route | Access | Purpose |
|---|---|---|
| `GET /p/[token]` | Customer, via 256-bit share token | The customer-facing POC. Tokens are hashed at rest, expiring, revocable, and optionally view-capped; every failure mode returns a generic 404. Unindexed, record-driven metadata, discreet "Unofficial website concept" notice, no theme switcher, no provenance leakage. |
| `GET /demo/[slug]` | Operator | Fixture demo route: the same renderer addressed by slug, for internal inspection and the showroom. Real outreach uses `/p` share links. Unindexed; drafts/archived 404; expired and closed records get safe states. Authorization happens before any record lookup. |
| `GET /login` | Public | Operator sign-in (Google OAuth, operator password, or gated dev login). |
| `GET /themes` | Operator | Theme showroom: thirteen cards with palette swatches, typography preview, abstract layout miniature, and demo links. |
| `GET /themes/[themeId]` | Operator | One canonical sample business in the selected theme, with a complete / partial / minimal fixture switcher for inspecting fallbacks. |
| `GET /preview/[slug]` | Operator | Preview tool: theme override, desktop / tablet / mobile viewport frames, source-provenance overlay, the unresolved-placeholder report, and share-link creation/revocation. Never appears on customer routes. |
| `POST/GET /api/internal/share-links`, `DELETE /api/internal/share-links/[id]` | Operator session | Share-link lifecycle API. |
| `POST /api/mcp` | Bearer token (OAuth 2.1 / dev bearer), scoped | Remote MCP server (stateless Streamable HTTP): the automation tool surface driven by the external scheduler. Fail-closed in production until OAuth is configured. |
| `POST /api/internal/automation/[operation]` | Bearer token, scoped | Internal HTTP adapter over the same automation registry (CI/smoke/deployments). Never cookie-authorized. |
| `GET/POST /api/unsubscribe` | Public, HMAC-signed token | One-click unsubscribe (RFC 8058): suppresses the contact immediately. |
| `POST /api/auth/login` / `logout`, `GET /api/auth/google/*` | Public | Authentication endpoints (rate-limited). |

### Record states on `/demo/[slug]`

| Record | Behavior |
|---|---|
| `active` + operational | Full themed POC. |
| `active` + temporarily closed | Themed POC with a consistent closure banner; never sells an "open" experience. |
| `active` + permanently closed | Safe informational closed state. No sales POC is rendered. |
| `expired` | "Concept no longer available" screen. |
| `draft` / `archived` | 404 on the public route (inspectable on `/preview/[slug]`). |
| missing / invalid slug | 404. Records that fail schema validation are skipped at the repository boundary with a logged error. |

## The record schema

The contract is a Zod schema in [`src/lib/poc/schema.ts`](src/lib/poc/schema.ts), the semantic baseline for every field the themes can consume: identity, brand, hero, contact, location, hours, reputation, media, offering (services, menu), amenities, content, calls to action, and POC metadata. Everything third-party or enrichment-derived is wrapped in a `SourcedValue`:

```ts
{
  value: T | null,
  source: "google_places" | "business_owner" | "official_website" | "official_social"
        | "licensed_asset" | "ai_derived" | "manual" | "fallback",
  confidence?: number | null,   // 0..1, used to gate ai_derived values
  verified?: boolean,
  retrievedAt?: string | null,
  attribution?: Attribution | null,
}
```

Fixtures live in [`src/data/businesses/`](src/data/businesses/). Eighteen are included: one complete record for each of the thirteen themes, plus five edge records — partial-data (`fjord-coffee`), minimal-data (`corner-pho`), temporarily closed (`dockside-provisions`), permanently closed (`old-mill-cantina`), and expired (`sunset-ramen`). All names, reviews, and imagery are synthetic; photography uses seeded `picsum.photos` placeholders (the photo behind any seed is random — swap in licensed or owner-supplied assets before real outreach).

### Normalization and the fallback engine

Themes never read raw record fields. [`normalize.ts`](src/lib/poc/normalize.ts) produces a `ResolvedBusiness` view model that applies every fallback rule and records provenance for each resolution:

1. Missing logo → typographic wordmark from the business name.
2. Missing brand palette → the theme's default palette; invalid hex values are dropped with a warning, and a 3:1 text/background contrast guard reverts destructive overrides.
3. Missing hero image → the theme's local abstract SVG placeholder (never a fake photo of the business).
4. Missing gallery → section hidden; images are deduplicated, never repeated.
5. Missing menu → hidden, unless `menu.mode === "sample"`, which renders with an explicit demonstration notice.
6. Missing reviews/rating → review sections hidden, layout stays balanced.
7. Missing/invalid phone → Call CTAs removed everywhere.
8. Missing directions/coordinates → map and directions CTAs removed; an address card renders only when an address exists.
9. Missing hours → "Hours not provided" only where a theme decides the slot is useful.
10. Missing order/reserve links → the CTA engine falls to the next best action (call, directions, email).
11. Fewer than three services/amenities → compact strip instead of a grid.
12. Permanently closed → safe state screen (route level).

CTAs are chosen by a priority engine ([`cta.ts`](src/lib/poc/cta.ts)): **order > reserve > call > directions > email**, one primary plus at most two secondary. Every URL is protocol-checked (`tel:`, `mailto:`, `https:` only); `javascript:` and malformed URLs are dropped with an internal warning. No disabled or empty buttons are ever rendered.

### Provenance, data trust, and attribution

- One central function ([`policy.ts`](src/lib/poc/policy.ts)) decides whether a sourced value may render, and **every** sourced value passes through it — narrative copy (hero, tagline, about, announcements, review summaries), factual data (identity, contact, location, hours, ratings, services, amenities, palette), and imagery (logo, hero, gallery; trust fields live on the image or its Sourced wrapper). Narrative fields accept only business-origin sources unverified; `ai_derived` values require confidence ≥ 0.7 (missing confidence defaults to untrusted). Blocked values are dropped before the fallback engine with a provenance entry, and blocked data is never reused to synthesize fallback copy (a blocked AI-derived city cannot appear inside the fallback headline).
- Factual provider data may render unverified, always flagged in provenance. Menus marked verified require a business-origin source or explicit verification; anything else — including any `ai_derived` menu — renders as explicitly labeled sample data.
- The CTA engine consumes policy-resolved facts only, so a blocked phone or address can never keep or derive an action.
- Required photo and review attribution renders next to the content it credits.
- The internal preview route exposes a source overlay (orange chips on `data-provenance` elements) plus a data-quality panel listing every fallback, derivation, sample, and warning via `listUnresolved()`.
- Public pages stay clean: only legally required attribution and sample-content notices appear there.

## The thirteen themes

Each theme has its own layout architecture, section order, type pairing, CTA shape, radius system, and motion band — they stay distinct in grayscale, not just in color. Fonts are self-hosted via `next/font` and code-split per theme: a customer POC page never downloads another theme's assets. Themes eleven through thirteen add a shared Motion-powered animation layer ([`src/components/poc/motion/`](src/components/poc/motion/)): scroll-linked parallax, spring staggers, and drawn-line rules, all collapsing to static under `prefers-reduced-motion`.

| Theme | Character | Type pairing | Signature moves |
|---|---|---|---|
| `heritage-bistro` | Classic neighborhood restaurant | Cormorant Garamond / Source Sans 3 | Seal masthead, framed split hero + hours card, Roman-numeral printed menu, newspaper pull quotes, paper grain |
| `neon-night` | Late-night dessert bar | Bebas Neue / Manrope | Dark canvas, side rail nav, angled hero crop, glowing status chip, modular menu panels, review marquee, mobile dock |
| `minimal-japanese` | Quiet premium tea room | Shippori Mincho / Zen Kaku Gothic New | Hairline grid, overlap-card hero, vertical accent, two-column typographic menu, information ledger |
| `mediterranean-sun` | Coastal family taverna | Young Serif / Nunito Sans | Arched hero, ceramic service tokens, blue menu band, masonry gallery, postcard map |
| `coffee-editorial` | Specialty roastery as a magazine | Newsreader / Archivo | Masthead + folio numbers, cover hero, story-first, editorial columns, marginalia reviews, film grain |
| `american-diner` | Cheerful retro diner | Alfa Slab One / Karla | Navy/cherry bands, checker strips, signboard hero, tabbed menu board, speech-card reviews, hard-shadow CTAs |
| `luxury-fine-dining` | Chef-led tasting room | Marcellus / Jost | Cinematic full-bleed hero, discreet nav, reservation-first CTA, spacious courses, slow fades |
| `street-food-poster` | Food truck as event poster | Archivo Black / Work Sans | Irregular color blocks, cutout framed imagery, sticker labels, price-forward menu, prominent schedule |
| `botanical-brunch` | Garden brunch café | Lora / Figtree | Layered arch-masked hero, botanical linework, dietary tags, pinboard reviews |
| `modern-industrial` | Urban coffee lab | Space Grotesk / IBM Plex Mono | Structural grid, technical annotations, spec-sheet menu, coordinate-panel map, safety orange |
| `deco-supper-club` | Gilded-age supper club | Poiret One / Outfit | Symmetric marquee masthead, turning fan crests, drawn gold rules, stepped deco frames, oxblood accents |
| `atelier-lookbook` | High-fashion gallery lookbook | Bodoni Moda / Familjen Grotesk | Stark white with one fashion red, parallax image chapters, hairline index rows, giant single quote |
| `memphis-play` | Playful dessert shop | Unbounded / DM Sans | Floating Memphis shapes, squiggle dividers, marker-highlighted headline, blob image masks, price bubbles, spring staggers |

## Maps

The shared map primitive ([`src/components/poc/map/MapSection.tsx`](src/components/poc/map/MapSection.tsx)) supports:

1. An explicit trusted `embedUrl` from the record.
2. A Google Maps embed when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set (client-safe public variable only; no server secrets reach the bundle).
3. A styled location-card fallback with address and a directions link — the default in local development.

Every mode ships a text alternative; iframes are lazy-loaded and titled; maps never trap mobile scroll.

## Repository and the future pipeline

Records are read exclusively through the `BusinessPocRepository` interface in [`repository.ts`](src/lib/poc/repository.ts). The default adapter loads the fixture set through the Zod boundary. A documented PostgreSQL adapter point lives in the same file — records stay JSON documents in the database and the schema remains the single validation boundary, so externally sourced details (ratings, hours) can be refreshed at render time.

**Implemented (Phase 2A — Autonomous Automation Bridge):** PostgreSQL as the operational source of truth — businesses, leads (19-status lifecycle with a central tested transition table), immutable checksummed evidence snapshots, `poc_records` with transactional revision history, automation runs/steps, contacts (AEAD-encrypted, keyed-hash dedup), outreach messages with suppression/unsubscribe state, an idempotency ledger, and audit logs (Drizzle + committed migrations; `npm run db:migrate`). A transport-independent service layer behind a scoped, authenticated remote MCP endpoint (`/api/mcp`) plus an internal HTTP adapter; deterministic automatic QA gates (schema, disposition, render policy, image/map origins, visual content depth, explicit hero-media strategy, placeholder tokens, CTA protocols, provider attribution, expiry/closure) with automatic reject/quarantine — no review queue and no override parameters; named theme concept artwork when licensed media is unavailable; atomic publish with secure share links (token returned exactly once); outreach preparation with compliance footers, deceptive-subject rejection, rate/volume limits, and a deterministic mock email provider (live sending disabled by default); reply-outcome actions; and a synthetic end-to-end smoke command (`npm run automation:smoke`). See [docs/automation-bridge.md](docs/automation-bridge.md).

**Phase 2A.1 hardening:** genuinely atomic publication (link + transitions in one transaction; rollback proven by an injected-failure integration test), linearized suppression/sending through a shared contact-level lock, principal-scoped idempotency, branch-safe business deduplication (soft signals never merge; matched leads always return ids and enrich with checksum-deduped evidence), deterministic evidence-claim verification, a strictly read-only `get_run_report` plus a separate mutating `finish_automation_run`, and a production **EmailJS** provider (`@emailjs/nodejs`: exhaustive fail-closed configuration, dry-run default, request timeouts, a PostgreSQL-backed ≥1.1 s cross-instance throttle, allowlist HTML sanitization; see [docs/emailjs-template-setup.md](docs/emailjs-template-setup.md)). The mock provider remains for development/tests and fails closed in production.

**Still planned (not built):** discovery/enrichment provider adapters (Google Places, website inspection, AI content), screenshot/visual-AI QA, an inbound-reply connector (replies are classified by the external scheduler and submitted via `record_reply_outcome` — outbound email alone is not inbound automation), and the read-only operator dashboard — sequenced in [docs/backlog.md](docs/backlog.md).

The intended pipeline contract when it lands: records arrive as schema-valid JSON keyed by `slug` with `status: "draft"`; humans review drafts on `/preview/[slug]`, flip to `active`, and share a `/p/[token]` link.

## Environment variables

All optional for local development (see [`.env.example`](.env.example)):

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin used in metadata URLs. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Enables keyed map embeds when records lack an `embedUrl`. |
| `POC_INGESTION_TOKEN` | Reserved for the future ingestion adapter. |
| `DATABASE_URL` | Reserved for the PostgreSQL repository adapter. |
| `R2_*` | Reserved for a future generated-asset store. |

Never commit real credentials.

## Adding a business record

1. Copy an existing fixture in `src/data/businesses/` (start from `merchant-and-vine.ts` for a complete record, or `corner-pho-minimal.ts` for the minimum).
2. Fill the record; use the `sv()` / `img()` / `mi()` helpers from `helpers.ts`. Mark honest `source` values — they drive the provenance system.
3. Register the export in the `fixtures` array in [`src/lib/poc/repository.ts`](src/lib/poc/repository.ts).
4. `npm run test` — the repository test asserts every fixture passes the schema boundary.

See [`docs/adding-a-theme.md`](docs/adding-a-theme.md) for adding a new theme.

## Deployment

The rendering path is portable RSC with no server-side API routes required.

- **Docker / any Node host:** `npm ci && npm run build && npm start` behind Nginx or Caddy. No edge-runtime features are required.
- **Required in production:** `DATABASE_URL` (PostgreSQL) for share links — apply migrations with `npm run db:migrate` — plus `AUTH_SECRET`, `ADMIN_EMAILS`, and Google OAuth or `OPERATOR_PASSWORD`. Without `DATABASE_URL`, share-link operations fail closed with a controlled 503; the JSON adapter is local-development storage only and is never selected in production.
- **Testing against PostgreSQL locally:** point `TEST_DATABASE_URL` at a scratch database (used only when `NODE_ENV=test`); the migration script and integration tests resolve the same URL. Without it, the six PostgreSQL integration tests are skipped locally — GitHub Actions CI always runs them against a real service container and fails if they skip.

The production concept is one multi-tenant deployment serving many records by slug — never one deployment per business.

## Testing and QA

- **Unit (Vitest, 126 tests):** schema acceptance/rejection (including provenance requirements and wrapped-image source-match refinement), URL and protocol safety, CTA priority and derivation over policy-resolved actions, every numbered fallback rule, record disposition (expired / closed / draft / request-time `expiresAt` / policy-resolved business status), the central render policy matrix applied to every sourced field, share-token generation/hashing/expiry/atomic revocation/view caps, map-embed and image-host allowlists (runtime/CSP agreement), zero-coordinate handling, preview query-state preservation, JSON-store isolation and corruption behavior, the public auth UI projection, and repository integrity with per-theme fixture coverage.
- **Visual QA performed:** all thirteen themes screenshotted and inspected at 390×844 and 1440×900 against broken imagery, horizontal overflow, clipped navigation, contrast, and cross-theme sameness; edge states (expired, permanently closed, temporarily closed, partial, minimal), the preview tool, and the showroom verified in a real browser.
- Known cosmetic note: fixture photography comes from seeded picsum placeholders, so the photo behind a seed is random and may not match its alt text. Replace with licensed or owner-supplied assets in real records — the `attribution` field is already wired for it.
