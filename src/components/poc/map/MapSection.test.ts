import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MapSection } from "./MapSection";
import { normalizeRecord } from "@/lib/poc/normalize";
import { cornerPhoMinimal } from "@/data/businesses/corner-pho-minimal";

const location = normalizeRecord(cornerPhoMinimal).location;

describe("MapSection", () => {
  it("renders the zero-credential Google Maps embed without an API key", () => {
    const html = renderToStaticMarkup(
      createElement(MapSection, {
        location: location!,
        businessName: "Corner Pho",
        directionsCta: null,
      }),
    );
    expect(html).toContain("<iframe");
    expect(html).toContain("google.com/maps");
    expect(html).toContain('loading="lazy"');
  });

  it("keeps the directions CTA present, external, and adjacent to the address", () => {
    const html = renderToStaticMarkup(
      createElement(MapSection, {
        location: location!,
        businessName: "Corner Pho",
        directionsCta: null,
      }),
    );
    expect(html).toContain("Get directions");
    expect(html).toMatch(/href="https:\/\/(www\.)?google\.com\/maps/);
    expect(html).toContain('target="_blank"');
    expect(html.indexOf("Get directions")).toBeGreaterThan(html.indexOf("<iframe"));
  });

  it("uses the record directions CTA label when provided", () => {
    const html = renderToStaticMarkup(
      createElement(MapSection, {
        location: location!,
        businessName: "Corner Pho",
        directionsCta: {
          label: "Route planen",
          href: "https://www.google.com/maps/dir/?api=1&destination=1,2",
          kind: "directions",
          external: true,
        },
      }),
    );
    expect(html).toContain("Route planen");
  });

  it("renders a text-location card when even the address is unavailable", () => {
    const html = renderToStaticMarkup(
      createElement(MapSection, {
        location: {
          formattedAddress: null,
          shortAddress: null,
          city: null,
          region: null,
          country: null,
          latitude: null,
          longitude: null,
          mapsUrl: null,
          directionsUrl: null,
          embedUrl: null,
          hasPlace: false,
        },
        businessName: "Corner Pho",
        directionsCta: null,
        cardClassName: "card",
      }),
    );
    expect(html).not.toContain("<iframe");
  });
});
