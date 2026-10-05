import { describe, expect, it, vi } from "vitest";
import { recordSchema } from "@/lib/poc/schema";
import type { BusinessPocRecord, PocImage } from "@/lib/poc/schema";
import { normalizeRecord } from "@/lib/poc/normalize";
import { merchantAndVine } from "@/data/businesses/merchant-and-vine";
import { applyGenerationMedia, resolvePocMedia, withRuntimeMedia } from "./resolve-poc-media";
import { buildConceptQuery, selectUnsplashImages } from "./unsplash-provider";
import type { UnsplashPhoto } from "./unsplash-provider";
import { resolveTrustedPlaceId } from "./trusted-place";

const GOOGLE_KEY = "test-google-key-SECRET-123";
const UNSPLASH_KEY = "test-unsplash-key-SECRET-456";
const PLACE_ID = "ChIJN1t_tDeuEmsRUsoyG83frY4";

function baseRecord(overrides: { category?: string; images?: PocImage[]; placeId?: string | null } = {}): BusinessPocRecord {
  return recordSchema.parse({
    schemaVersion: 1,
    id: "rec-media-test",
    slug: "media-test",
    status: "active",
    themeId: "coffee-editorial",
    identity: {
      placeId: overrides.placeId ?? null,
      name: { value: "Juniper Cafe", source: "google_places", verified: true },
      primaryCategory: { value: overrides.category ?? "Coffee shop", source: "google_places", verified: true },
      categories: { value: [overrides.category ?? "Coffee shop"], source: "google_places", verified: true },
      businessStatus: { value: "operational", source: "google_places", verified: true },
    },
    hero: {},
    media: { images: overrides.images ?? [] },
    poc: { disclaimer: "Unofficial concept.", createdAt: "2026-10-01T00:00:00Z" },
  });
}

const businessPhoto = (id: string, url: string, role: "hero" | "gallery", width = 1600, height = 1000): PocImage => ({
  id,
  url,
  alt: `Photo ${id}`,
  role,
  source: "official_website",
  verified: true,
  width,
  height,
});

function unsplashPhoto(id: string, width = 4000, height = 2600): UnsplashPhoto {
  return {
    id,
    width,
    height,
    color: "#a07850",
    urls: { raw: `https://images.unsplash.com/photo-${id}?ixid=abc123&ixlib=rb-4.0.3` },
    links: {
      html: `https://unsplash.com/photos/${id}`,
      download_location: `https://api.unsplash.com/photos/${id}/download?ixid=abc123`,
    },
    user: { name: `Photographer ${id}`, links: { html: `https://unsplash.com/@p${id}` } },
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

/** Routes provider URLs to canned responses; records every call. */
function mockFetch(handlers: {
  google?: () => Response | Promise<Response>;
  unsplash?: () => Response | Promise<Response>;
}) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    void init;
    if (url.startsWith("https://places.googleapis.com/v1/places/") && url.includes("/photos/")) {
      const name = url.split("/v1/")[1]!.split("/media")[0]!;
      return json({ name, photoUri: `https://lh3.googleusercontent.com/places/${name.split("/").pop()}=s1600` });
    }
    if (url.startsWith("https://places.googleapis.com/v1/places/")) {
      return handlers.google ? handlers.google() : json({}, 500);
    }
    if (url.startsWith("https://api.unsplash.com/search/photos")) {
      return handlers.unsplash ? handlers.unsplash() : json({}, 500);
    }
    if (url.startsWith("https://api.unsplash.com/photos/")) return json({ url: "https://example.invalid/tracked" });
    throw new Error(`unexpected url ${url}`);
  });
}

const googlePlace = () =>
  json({
    photos: [
      { name: `places/${PLACE_ID}/photos/portrait01`, widthPx: 1200, heightPx: 1800 },
      {
        name: `places/${PLACE_ID}/photos/landscape02`,
        widthPx: 4032,
        heightPx: 3024,
        authorAttributions: [{ displayName: "Ana R.", uri: "//maps.google.com/maps/contrib/123" }],
      },
      { name: `places/${PLACE_ID}/photos/landscape03`, widthPx: 2000, heightPx: 1300 },
    ],
  });

const unsplashResults = () =>
  json({ results: [unsplashPhoto("a1"), unsplashPhoto("b2"), unsplashPhoto("c3"), unsplashPhoto("d4"), unsplashPhoto("e5")] });

const env = { GOOGLE_PLACES_API_KEY: GOOGLE_KEY, UNSPLASH_ACCESS_KEY: UNSPLASH_KEY };

describe("resolvePocMedia provider priority", () => {
  it("1. existing verified media wins over every provider (no network)", async () => {
    const fetchImpl = mockFetch({ google: googlePlace, unsplash: unsplashResults });
    const record = baseRecord({
      images: [
        businessPhoto("h", "https://picsum.photos/seed/h/1600/1000", "hero"),
        businessPhoto("g1", "https://picsum.photos/seed/g1/1200/900", "gallery"),
        businessPhoto("g2", "https://picsum.photos/seed/g2/1200/900", "gallery"),
        businessPhoto("g3", "https://picsum.photos/seed/g3/1200/900", "gallery"),
      ],
    });
    const result = await resolvePocMedia({ record, placeId: PLACE_ID, deps: { env, fetch: fetchImpl } });
    expect(result.heroSource).toBe("verified_business");
    expect(result.hero?.url).toContain("seed/h/");
    expect(result.gallery.map((image) => image.source)).toEqual(["verified_business", "verified_business", "verified_business"]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("1b. promotes the best landscape business photo to hero instead of stock", async () => {
    const fetchImpl = mockFetch({ unsplash: unsplashResults });
    const record = baseRecord({
      images: [
        businessPhoto("tall", "https://picsum.photos/seed/tall/900/1400", "gallery", 900, 1400),
        businessPhoto("wide", "https://picsum.photos/seed/wide/2000/1200", "gallery", 2000, 1200),
      ],
    });
    const result = await resolvePocMedia({ record, placeId: null, deps: { env, fetch: fetchImpl } });
    expect(result.hero?.url).toContain("seed/wide/");
    expect(result.promotedHeroUrl).toContain("seed/wide/");
    expect(result.gallery).toHaveLength(1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("2/3/4. Google wins over Unsplash, uncached, server-side, attribution preserved", async () => {
    const fetchImpl = mockFetch({ google: googlePlace, unsplash: unsplashResults });
    const result = await resolvePocMedia({ record: baseRecord(), placeId: PLACE_ID, deps: { env, fetch: fetchImpl } });

    expect(result.heroSource).toBe("google_places");
    expect(result.hero?.isBusinessSpecific).toBe(true);
    // Best landscape photo becomes the hero, not Google's first (portrait) photo.
    expect(result.hero?.url).toContain("landscape02");
    expect(result.hero?.attribution).toEqual({
      label: "Photo via Google Maps",
      authorName: "Ana R.",
      authorUrl: "https://maps.google.com/maps/contrib/123",
    });
    expect(result.gallery.every((image) => image.source === "google_places")).toBe(true);

    const googleCalls = fetchImpl.mock.calls.filter(([url]) => String(url).includes("places.googleapis.com"));
    expect(googleCalls.length).toBeGreaterThan(0);
    for (const [url, init] of googleCalls) {
      expect(init?.cache).toBe("no-store");
      expect(String(url)).not.toContain(GOOGLE_KEY);
      expect((init?.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe(GOOGLE_KEY);
    }
    expect(googleCalls[0]![1]?.headers).toMatchObject({ "X-Goog-FieldMask": "photos" });
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes("unsplash"))).toBe(false);
  });

  it("5. a missing place id skips Google entirely", async () => {
    const fetchImpl = mockFetch({ google: googlePlace, unsplash: unsplashResults });
    const result = await resolvePocMedia({ record: baseRecord(), placeId: null, deps: { env, fetch: fetchImpl } });
    expect(result.notes).toContain("google_places:no_trusted_place_id");
    expect(fetchImpl.mock.calls.some(([url]) => String(url).includes("places.googleapis.com"))).toBe(false);
    expect(result.heroSource).toBe("unsplash");
  });

  it("6/8. Unsplash is used when Google has no usable photo, marked as concept imagery", async () => {
    const fetchImpl = mockFetch({ google: () => json({ photos: [] }), unsplash: unsplashResults });
    const result = await resolvePocMedia({ record: baseRecord(), placeId: PLACE_ID, deps: { env, fetch: fetchImpl } });
    expect(result.notes).toContain("google_places:no_photos");
    expect(result.heroSource).toBe("unsplash");
    for (const image of [result.hero!, ...result.gallery]) {
      expect(image.source).toBe("unsplash");
      expect(image.isBusinessSpecific).toBe(false);
      expect(image.attribution?.label).toMatch(/^Concept imagery · Photo by Photographer \w+ on Unsplash$/);
      expect(image.attribution?.authorUrl).toContain("utm_source=poc_gen");
      expect(image.attribution?.url).toContain("utm_medium=referral");
      expect(image.alt).toContain("not a photo of Juniper Cafe");
      // Hotlinked from photo.urls.raw: the ixid tracking parameter survives.
      expect(image.url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-\w+\?ixid=abc123/);
    }
    const search = fetchImpl.mock.calls.find(([url]) => String(url).includes("/search/photos"))!;
    expect(String(search[0])).toContain("orientation=landscape");
    expect(String(search[0])).toContain("content_filter=high");
    expect(String(search[0])).not.toContain(UNSPLASH_KEY);
    expect((search[1]?.headers as Record<string, string>).Authorization).toBe(`Client-ID ${UNSPLASH_KEY}`);
    // download_location is triggered for each selected image.
    const tracked = fetchImpl.mock.calls.filter(([url]) => String(url).includes("/download"));
    expect(tracked).toHaveLength(1 + result.gallery.length);
  });

  it("7. Unsplash queries are category-aware", () => {
    const query = (category: string) => buildConceptQuery({ primaryCategory: category, categories: [category] }).query;
    expect(query("Coffee shop")).toBe("cozy independent coffee shop interior");
    expect(query("Restaurant")).toBe("modern neighborhood restaurant food");
    expect(query("Dentist")).toBe("professional dental clinic interior");
    expect(query("Gym")).toBe("boutique fitness studio");
    expect(query("Bakery")).toBe("local bakery pastries");
    expect(query("Bubble tea")).toBe("colorful bubble tea boba drinks cafe");
    expect(
      buildConceptQuery({ primaryCategory: "Bubble tea", categories: ["Bubble tea", "Ramen", "Restaurant"] }).query,
    ).toBe("colorful bubble tea boba drinks cafe");
    expect(query("Barber shop")).toBe("barbershop interior");
    expect(query("Accountant")).toBe("professional office workspace");
    expect(query("Taqueria")).toBe("mexican street tacos");
  });

  it("selection is deterministic per record and dedupes repeated photos", () => {
    const photos = [unsplashPhoto("a1"), unsplashPhoto("a1"), unsplashPhoto("b2"), unsplashPhoto("c3"), unsplashPhoto("d4")];
    const options = { seed: "rec-1", heroCount: 1, galleryCount: 3, subject: "a cafe", businessName: "X" };
    const first = selectUnsplashImages(photos, options);
    const again = selectUnsplashImages(photos, options);
    expect(again).toEqual(first);
    const urls = [first.hero!.url, ...first.gallery.map((image) => image.url)];
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("9. provider timeouts fall back safely to concept art", async () => {
    const hang = (_: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      });
    const fetchImpl = vi.fn(hang);
    const result = await resolvePocMedia({
      record: baseRecord(),
      placeId: PLACE_ID,
      deps: { env, fetch: fetchImpl as unknown as typeof fetch, timeoutMs: 20 },
    });
    expect(result.notes).toEqual(expect.arrayContaining(["google_places:timeout", "unsplash:timeout"]));
    expect(result.heroSource).toBe("concept_art");
    expect(result.hero).toBeNull();
  });

  it("quota errors fall through to the next tier", async () => {
    const fetchImpl = mockFetch({ google: () => json({}, 429), unsplash: () => json({}, 403) });
    const result = await resolvePocMedia({ record: baseRecord(), placeId: PLACE_ID, deps: { env, fetch: fetchImpl } });
    expect(result.notes).toEqual(expect.arrayContaining(["google_places:quota", "unsplash:http_403"]));
    expect(result.heroSource).toBe("concept_art");
  });

  it("10. missing keys never call the network and render ConceptHeroArt", async () => {
    const fetchImpl = mockFetch({});
    const record = baseRecord();
    const result = await resolvePocMedia({ record, placeId: PLACE_ID, deps: { env: {}, fetch: fetchImpl } });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.notes).toEqual(expect.arrayContaining(["google_places:no_key", "unsplash:no_key"]));
    const stored = applyGenerationMedia(record, result, null, new Date("2026-10-05T00:00:00Z"));
    expect(normalizeRecord(stored).hero.image?.mediaSource).toBe("concept_art");
  });
});

describe("generation and render application", () => {
  it("stores Unsplash concept images but never Google photos, and renders them as concept imagery", async () => {
    const record = baseRecord({ placeId: PLACE_ID });
    const fetchImpl = mockFetch({ unsplash: unsplashResults });
    const generated = await resolvePocMedia({ record, placeId: null, deps: { env, fetch: fetchImpl } });
    const stored = recordSchema.parse(applyGenerationMedia(record, generated, PLACE_ID, new Date("2026-10-05T00:00:00Z")));

    expect(stored.media.resolution).toEqual({ trustedPlaceId: PLACE_ID, conceptQuery: "cozy independent coffee shop interior" });
    expect(stored.media.images.every((image) => image.source === "unsplash" && image.verified === false)).toBe(true);
    const serialized = JSON.stringify(stored);
    expect(serialized).not.toContain("download_location");
    expect(serialized).not.toContain("api.unsplash.com");

    const model = normalizeRecord(stored);
    expect(model.hero.image?.mediaSource).toBe("unsplash");
    expect(model.hero.image?.isBusinessSpecific).toBe(false);
    expect(model.hero.image?.fallback?.mediaSource).toBe("concept_art");

    // Render time: Google wins over the stored concept imagery, transiently.
    const runtime = await withRuntimeMedia(stored, { env, fetch: mockFetch({ google: googlePlace }) });
    expect(stored.media.images.some((image) => image.source === "google_places")).toBe(false);
    const rendered = normalizeRecord(runtime);
    expect(rendered.hero.image?.mediaSource).toBe("google_places");
    expect(rendered.gallery?.images.every((image) => image.mediaSource === "google_places")).toBe(true);
  });

  it("render-time Google failure keeps the stored record untouched", async () => {
    const record = applyGenerationMedia(baseRecord(), { hero: null, gallery: [], heroSource: "concept_art", promotedHeroUrl: null, conceptQuery: null, notes: [] }, PLACE_ID, new Date());
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const runtime = await withRuntimeMedia(record, { env, fetch: mockFetch({ google: () => json({}, 503) }) });
    expect(runtime).toBe(record);
    expect(warn.mock.calls.flat().join(" ")).not.toContain(GOOGLE_KEY);
    warn.mockRestore();
  });

  it("caller-supplied resolution metadata is replaced by the server", () => {
    const record = baseRecord();
    const spoofed = { ...record, media: { ...record.media, resolution: { trustedPlaceId: "ChIJspoofedPlaceId00" } } };
    const stored = applyGenerationMedia(spoofed, { hero: null, gallery: [], heroSource: "concept_art", promotedHeroUrl: null, conceptQuery: null, notes: [] }, null, new Date());
    expect(stored.media.resolution?.trustedPlaceId).toBeNull();
  });

  it("11. duplicate images are removed at render", () => {
    const dup = businessPhoto("g1", "https://picsum.photos/seed/dup/1200/900", "gallery");
    const model = normalizeRecord(baseRecord({ images: [dup, { ...dup, id: "g2" }, businessPhoto("g3", "https://picsum.photos/seed/other/1200/900", "gallery")] }));
    expect(model.gallery?.images.map((image) => image.url)).toEqual([
      "https://picsum.photos/seed/dup/1200/900",
      "https://picsum.photos/seed/other/1200/900",
    ]);
  });

  it("concept stock never mixes into a gallery of real photos", () => {
    const concept: PocImage = {
      id: "c1",
      url: "https://images.unsplash.com/photo-x?ixid=1",
      alt: "Concept",
      role: "gallery",
      source: "unsplash",
      attribution: { label: "Concept imagery · Photo by A on Unsplash", authorName: "A" },
    };
    const model = normalizeRecord(baseRecord({ images: [concept, businessPhoto("g1", "https://picsum.photos/seed/real/1200/900", "gallery")] }));
    expect(model.gallery?.images.map((image) => image.mediaSource)).toEqual(["verified_business"]);
  });

  it("12. old records still parse and render unchanged media", () => {
    const parsed = recordSchema.parse(merchantAndVine);
    const model = normalizeRecord(parsed);
    expect(parsed.media.resolution).toBeUndefined();
    expect(model.hero.image?.mediaSource).toBe("verified_business");
    expect(model.hero.image?.url).toBe(
      (merchantAndVine.hero.image?.value?.url ?? merchantAndVine.media.images.find((i) => i.role === "hero")?.url) as string,
    );
  });

  it("14. API keys never appear in resolution or stored record output", async () => {
    const fetchImpl = mockFetch({ google: googlePlace, unsplash: unsplashResults });
    const record = baseRecord();
    const resolution = await resolvePocMedia({ record, placeId: PLACE_ID, deps: { env, fetch: fetchImpl } });
    const stored = applyGenerationMedia(record, resolution, PLACE_ID, new Date());
    const runtime = await withRuntimeMedia(stored, { env, fetch: fetchImpl });
    for (const output of [resolution, stored, runtime, normalizeRecord(runtime)]) {
      const text = JSON.stringify(output);
      expect(text).not.toContain(GOOGLE_KEY);
      expect(text).not.toContain(UNSPLASH_KEY);
      expect(text).not.toContain("key=");
    }
    // Google photo names (expiring resources) are never stored.
    expect(JSON.stringify(stored)).not.toContain("/photos/landscape");
  });
});

describe("trusted place id", () => {
  const business = { sourceType: "google_places", sourceExternalId: PLACE_ID };
  it("accepts the record's id only when the lead's Google evidence carries it", () => {
    expect(resolveTrustedPlaceId({ recordPlaceId: PLACE_ID, business, snapshots: [] })).toBe(PLACE_ID);
    expect(resolveTrustedPlaceId({ recordPlaceId: "ChIJsomeOtherPlace01", business, snapshots: [] })).toBeNull();
    expect(
      resolveTrustedPlaceId({
        recordPlaceId: null,
        business: { sourceType: "manual", sourceExternalId: null },
        snapshots: [{ provider: "google_places", sourceIdentifier: `places/${PLACE_ID}` }],
      }),
    ).toBe(PLACE_ID);
  });
  it("never trusts ids without Google evidence or ambiguous evidence", () => {
    expect(resolveTrustedPlaceId({ recordPlaceId: PLACE_ID, business: { sourceType: "osm", sourceExternalId: PLACE_ID }, snapshots: [] })).toBeNull();
    expect(
      resolveTrustedPlaceId({
        recordPlaceId: null,
        business: { sourceType: "manual", sourceExternalId: null },
        snapshots: [
          { provider: "google_places", sourceIdentifier: "ChIJplaceNumberOne1" },
          { provider: "google_places", sourceIdentifier: "ChIJplaceNumberTwo2" },
        ],
      }),
    ).toBeNull();
  });
});
