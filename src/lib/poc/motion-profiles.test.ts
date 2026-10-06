import { describe, expect, it } from "vitest";
import { themeIds } from "./schema";
import { themeMeta } from "./theme-meta";
import { motionProfiles, motionRuns, resolveMotionProfile } from "./motion-profiles";

describe("motion profiles", () => {
  it("defines a profile for every motion character any theme can declare", () => {
    for (const meta of Object.values(themeMeta)) {
      expect(motionProfiles[meta.motion], `character ${meta.motion}`).toBeDefined();
    }
  });

  it("resolves every registered theme to its declared motion character", () => {
    for (const id of themeIds) {
      const resolved = resolveMotionProfile(id, "expressive");
      expect(resolved.character, id).toBe(themeMeta[id].motion);
      expect(resolved.mode).toBe("expressive");
    }
  });

  it("gives different themes genuinely different motion languages", () => {
    const energetic = resolveMotionProfile("neon-night", "expressive");
    const quiet = resolveMotionProfile("minimal-japanese", "expressive");
    const slow = resolveMotionProfile("luxury-fine-dining", "expressive");
    const crisp = resolveMotionProfile("modern-industrial", "expressive");
    const springy = resolveMotionProfile("memphis-play", "expressive");

    expect(energetic.revealDistance).toBeGreaterThan(quiet.revealDistance);
    expect(energetic.revealDuration).toBeLessThan(slow.revealDuration);
    expect(slow.revealDuration).toBeGreaterThan(crisp.revealDuration);
    expect(energetic.spring).not.toBeNull();
    expect(springy.spring).not.toBeNull();
    expect(springy.spring!.damping).toBeLessThan(energetic.spring!.damping);
    expect(quiet.spring).toBeNull();
    expect(slow.spring).toBeNull();
    expect(crisp.spring).toBeNull();
    expect(quiet.scrollLinked).toBe(false);
    expect(crisp.scrollLinked).toBe(true);
  });

  it("themeOverrides.motion none disables all motion", () => {
    for (const id of themeIds) {
      const profile = resolveMotionProfile(id, "none");
      expect(motionRuns(profile), id).toBe(false);
      expect(profile.revealDistance).toBe(0);
      expect(profile.revealDuration).toBe(0);
      expect(profile.stagger).toBe(0);
      expect(profile.parallax).toBe(0);
      expect(profile.parallaxMobile).toBe(0);
      expect(profile.ornament).toBe(0);
      expect(profile.textSequence).toBe(false);
      expect(profile.scrollLinked).toBe(false);
      expect(profile.spring).toBeNull();
      expect(profile.imageScale).toBe(1);
    }
  });

  it("themeOverrides.motion subtle clamps every theme to restrained motion", () => {
    for (const id of themeIds) {
      const profile = resolveMotionProfile(id, "subtle");
      expect(motionRuns(profile), id).toBe(true);
      expect(profile.revealDuration).toBeLessThanOrEqual(0.45);
      expect(profile.revealDistance).toBeLessThanOrEqual(14);
      expect(profile.stagger).toBeLessThanOrEqual(0.05);
      expect(profile.heroStep).toBeLessThanOrEqual(0.08);
      expect(profile.spring, id).toBeNull();
      expect(profile.textSequence).toBe(false);
      expect(profile.parallaxMobile).toBe(0);
      expect(profile.hoverLift).toBeLessThanOrEqual(2);
      expect(profile.hoverScale).toBeLessThanOrEqual(1.01);
      expect(profile.ornament).toBeLessThanOrEqual(0.25);
      expect(profile.imageScale).toBeLessThanOrEqual(1.03);
    }
  });

  it("subtle never exceeds the theme's own expressive values", () => {
    for (const id of themeIds) {
      const subtle = resolveMotionProfile(id, "subtle");
      const expressive = resolveMotionProfile(id, "expressive");
      expect(subtle.revealDuration).toBeLessThanOrEqual(expressive.revealDuration);
      expect(subtle.revealDistance).toBeLessThanOrEqual(expressive.revealDistance);
      expect(subtle.parallax).toBeLessThanOrEqual(expressive.parallax);
      expect(subtle.ornament).toBeLessThanOrEqual(expressive.ornament);
    }
  });

  it("expressive keeps the full theme-specific language", () => {
    const neon = resolveMotionProfile("neon-night", "expressive");
    expect(neon.revealDuration).toBe(motionProfiles.energetic.revealDuration);
    expect(neon.textSequence).toBe(true);
    expect(neon.scrollLinked).toBe(true);
  });
});
