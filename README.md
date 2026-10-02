# POC Gen

A data-driven ecosystem that generates polished proof-of-concept websites for local businesses (initially restaurants and cafés) from a single structured record. One multi-tenant Next.js app serves many records by slug; thirteen genuinely different theme systems render the same schema.

The primary use case is **private, unindexed POC links** shared with local-business owners during personalized outreach.

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

The app runs entirely on local fixtures. No database, Google Maps key, or object storage is required for development.

```bash
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # eslint
npm run test         # vitest (schema, normalization, fallbacks, CTA engine, repository)
npm run build        # production build
npm start            # serve the production build
```

## Routes

| Route | Purpose |
|---|---|
| `GET /demo/[slug]` | The customer-facing POC. Unindexed (`noindex, nofollow`), record-driven metadata, discreet "Unofficial website concept" notice, no theme switcher. |
| `GET /themes` | Internal theme showroom: ten cards with palette swatches, typography preview, abstract layout miniature, and demo links. |
| `GET /themes/[themeId]` | One canonical sample business in the selected theme, with a complete / partial / minimal fixture switcher for inspecting fallbacks. |
| `GET /preview/[slug]` | Internal preview tool: theme override, desktop / tablet / mobile viewport frames, source-provenance overlay, and the unresolved-placeholder report. Never appears on `/demo/[slug]`. |

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

Fixtures live in [`src/data/businesses/`](src/data/businesses/). Fifteen are included: one complete record per theme, plus partial-data (`fjord-coffee`), minimal-data (`corner-pho`), temporarily closed (`dockside-provisions`), permanently closed (`old-mill-cantina`), and expired (`sunset-ramen`) edge records. All names, reviews, and imagery are synthetic; photography uses seeded `picsum.photos` placeholders (the photo behind any seed is random — swap in licensed or owner-supplied assets before real outreach).

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

### Provenance and attribution

- Required photo and review attribution renders next to the content it credits.
- The internal preview route exposes a source overlay (orange chips on `data-provenance` elements) plus a data-quality panel listing every fallback, derivation, sample, and warning via `listUnresolved()`.
- Public pages stay clean: only legally required attribution and sample-content notices appear there.
- `ai_derived` copy below a 0.7 confidence threshold is treated as fallback and hidden.

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

**Safest next step for the lead-generation pipeline:** keep generation upstream and POST finished, schema-valid records into the store, keyed by `slug`, with `status: "draft"`. Humans review drafts on `/preview/[slug]`, flip to `active`, and share the `/demo/[slug]` link. Nothing about the rendering path needs to change; only a new repository adapter (and, if desired, a token-guarded ingestion route) is required.

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

See [`docs/adding-a-theme.md`](docs/adding-a-theme.md) for adding an eleventh theme.

## Deployment

The rendering path is portable RSC with no server-side API routes required.

- **Vercel (zero-config):** import the repo and deploy. Set the optional env vars in the project settings. Customer POC routes stay unindexed by default.
- **Docker / any Node host:** `npm ci && npm run build && npm start` behind Nginx or Caddy. No edge-runtime features are required.

The production concept is one multi-tenant deployment serving many records by slug — never one deployment per business.

## Testing and QA

- **Unit (Vitest, 38 tests):** schema acceptance/rejection, URL and protocol safety, CTA priority and derivation, every numbered fallback rule, record disposition (expired / closed / draft), repository integrity and per-theme fixture coverage.
- **Visual QA performed:** all ten themes screenshotted and inspected at 390×844 and 1440×900 against broken imagery, horizontal overflow, clipped navigation, contrast, and cross-theme sameness; edge states (expired, permanently closed, temporarily closed, partial, minimal), the preview tool, and the showroom verified in a real browser.
- Known cosmetic note: fixture photography comes from seeded picsum placeholders, so the photo behind a seed is random and may not match its alt text. Replace with licensed or owner-supplied assets in real records — the `attribution` field is already wired for it.
