import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ThemeId } from "@/lib/poc/schema";
import { AnimatedWordmark } from "./AnimatedWordmark";
import { HeroSequence } from "./HeroSequence";
import { LineGrow } from "./LineGrow";
import { MotionProvider } from "./MotionProvider";
import { ParallaxMedia } from "./ParallaxMedia";
import { Reveal } from "./Reveal";
import { ScrollProgress } from "./ScrollProgress";
import { StaggerGroup, StaggerItem } from "./StaggerGroup";

function withProvider(
  themeId: ThemeId,
  intensity: "none" | "subtle" | "expressive",
  child: React.ReactElement,
): React.ReactElement {
  return (
    <MotionProvider themeId={themeId} intensity={intensity}>
      {child}
    </MotionProvider>
  );
}

describe("motion primitives under SSR", () => {
  it("renders Reveal content with no hidden state when motion override is none", () => {
    const html = renderToStaticMarkup(
      withProvider("heritage-bistro", "none", <Reveal className="x">Menu copy</Reveal>),
    );
    expect(html).toContain("Menu copy");
    expect(html).not.toContain("opacity:0");
    expect(html).not.toContain("translateY");
  });

  it("renders Reveal content statically outside a theme provider", () => {
    const html = renderToStaticMarkup(<Reveal>Bare content</Reveal>);
    expect(html).toContain("Bare content");
    expect(html).not.toContain("opacity:0");
  });

  it("hides Reveal content initially under an enabled mode so it can animate in", () => {
    const html = renderToStaticMarkup(
      withProvider("heritage-bistro", "subtle", <Reveal>Hidden until hydrate</Reveal>),
    );
    expect(html).toContain("Hidden until hydrate");
    expect(html).toContain("opacity:0");
  });

  it("clamps subtle travel to the profile distance", () => {
    const html = renderToStaticMarkup(
      withProvider("neon-night", "subtle", <Reveal>Travel</Reveal>),
    );
    // energetic distance 34 clamped to 14 in subtle mode
    expect(html).toContain("translateY(14px)");
  });

  it("keeps the full theme travel in expressive mode", () => {
    const html = renderToStaticMarkup(
      withProvider("neon-night", "expressive", <Reveal>Travel</Reveal>),
    );
    expect(html).toContain("translateY(34px)");
  });

  it("HeroSequence renders every step and never drops content", () => {
    const html = renderToStaticMarkup(
      withProvider(
        "luxury-fine-dining",
        "none",
        <HeroSequence steps={[<p key="a">Eyebrow</p>, <h1 key="b">Headline</h1>, null]} />,
      ),
    );
    expect(html).toContain("Eyebrow");
    expect(html).toContain("Headline");
    expect(html).not.toContain("opacity:0");
  });

  it("StaggerGroup keeps list semantics with as=ul and StaggerItem as=li", () => {
    const html = renderToStaticMarkup(
      withProvider(
        "heritage-bistro",
        "none",
        <StaggerGroup as="ul">
          <StaggerItem as="li">Pho</StaggerItem>
          <StaggerItem as="li">Ramen</StaggerItem>
        </StaggerGroup>,
      ),
    );
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
    expect(html).toContain("Pho");
    expect(html).toContain("Ramen");
  });

  it("AnimatedWordmark exposes the complete text accessibly when sequenced", () => {
    const html = renderToStaticMarkup(
      withProvider("atelier-lookbook", "expressive", <AnimatedWordmark text="Maison Lumen" />),
    );
    expect(html).toContain("sr-only");
    expect(html).toContain(">Maison Lumen<");
    expect(html).toContain('aria-hidden="true"');
  });

  it("AnimatedWordmark renders plain text when the profile has no text sequence", () => {
    const html = renderToStaticMarkup(
      withProvider("minimal-japanese", "expressive", <AnimatedWordmark text="Hako Tea" />),
    );
    expect(html).toContain("Hako Tea");
    expect(html).not.toContain("sr-only");
    expect(html).not.toContain("aria-hidden");
  });

  it("LineGrow renders the rule statically when motion is off", () => {
    const html = renderToStaticMarkup(
      withProvider("heritage-bistro", "none", <LineGrow className="h-px w-24" />),
    );
    expect(html).toContain("h-px");
    expect(html).not.toContain("scaleX");
  });

  it("ParallaxMedia renders its media unchanged when the profile has no parallax", () => {
    const html = renderToStaticMarkup(
      withProvider(
        "minimal-japanese",
        "expressive",
        <ParallaxMedia>
          {/* eslint-disable-next-line @next/next/no-img-element -- plain element for SSR assertion */}
          <img src="/x.jpg" alt="Room" />
        </ParallaxMedia>,
      ),
    );
    expect(html).toContain("/x.jpg");
    expect(html).toContain("overflow-hidden");
  });

  it("ScrollProgress renders only for expressive scroll-linked themes", () => {
    const shown = renderToStaticMarkup(
      withProvider("atelier-lookbook", "expressive", <ScrollProgress />),
    );
    const subtle = renderToStaticMarkup(
      withProvider("atelier-lookbook", "subtle", <ScrollProgress />),
    );
    const quiet = renderToStaticMarkup(
      withProvider("minimal-japanese", "expressive", <ScrollProgress />),
    );
    const off = renderToStaticMarkup(
      withProvider("atelier-lookbook", "none", <ScrollProgress />),
    );
    expect(shown).toContain("pointer-events-none");
    expect(subtle).toBe("");
    expect(quiet).toBe("");
    expect(off).toBe("");
  });
});
