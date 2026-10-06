import { themeMeta } from "./theme-meta";
import type { ThemeId } from "./schema";
import type { ResolvedBusiness } from "./types";

/**
 * Typed motion language per theme character. Each theme's meta declares a
 * motion character; the resolved profile is that character adjusted by the
 * record's `themeOverrides.motion` intensity. Motion primitives consume the
 * resolved profile so no theme hard-codes animation values.
 */

/** Motion characters from ThemeMeta; "expressive" aliases the energetic body. */
export type MotionCharacter =
  | "quiet"
  | "calm"
  | "friendly"
  | "energetic"
  | "expressive"
  | "slow"
  | "crisp"
  | "ornate"
  | "gliding"
  | "springy";

export type MotionIntensity = ResolvedBusiness["motion"];

export interface MotionProfile {
  character: MotionCharacter;
  /** Seconds for a standard section reveal tween. */
  revealDuration: number;
  /** Vertical px a reveal travels (kept within the 12–40px band when moving). */
  revealDistance: number;
  /** Seconds between staggered grid children. */
  stagger: number;
  /** Cubic-bezier for tween transitions. */
  ease: readonly [number, number, number, number];
  /** Spring physics; null forces the tween ease (no-bounce themes). */
  spring: { stiffness: number; damping: number } | null;
  /** Delay step between hero copy blocks, seconds. */
  heroStep: number;
  /** Settle-from scale for reveal-masked media (1 = no scale). */
  imageScale: number;
  /** Desktop parallax distance px for scroll-linked media (0 disables). */
  parallax: number;
  /** Parallax distance on small screens; 0 disables mobile parallax. */
  parallaxMobile: number;
  /** Card/button hover lift px (0 = no lift). */
  hoverLift: number;
  /** Card hover scale (1 = none). */
  hoverScale: number;
  /** 0–1 intensity multiplier for Anime.js ornament timelines (0 disables). */
  ornament: number;
  /** Whether hero copy enters as a deliberate typographic sequence. */
  textSequence: boolean;
  /** Whether scroll-linked effects (parallax, scroll progress) run. */
  scrollLinked: boolean;
}

const EASE_OUT_EXPO: readonly [number, number, number, number] = [0.16, 1, 0.3, 1];
const EASE_OUT_SOFT: readonly [number, number, number, number] = [0.33, 1, 0.68, 1];
const EASE_GLIDE: readonly [number, number, number, number] = [0.22, 1, 0.36, 1];
const EASE_SNAP: readonly [number, number, number, number] = [0.4, 0, 0.2, 1];

/** Full-strength motion language per character. */
export const motionProfiles: Record<MotionCharacter, MotionProfile> = {
  quiet: {
    character: "quiet",
    revealDuration: 0.7,
    revealDistance: 12,
    stagger: 0.09,
    ease: EASE_OUT_SOFT,
    spring: null,
    heroStep: 0.1,
    imageScale: 1.015,
    parallax: 0,
    parallaxMobile: 0,
    hoverLift: 0,
    hoverScale: 1,
    ornament: 0.45,
    textSequence: false,
    scrollLinked: false,
  },
  calm: {
    character: "calm",
    revealDuration: 0.8,
    revealDistance: 20,
    stagger: 0.08,
    ease: EASE_OUT_EXPO,
    spring: null,
    heroStep: 0.14,
    imageScale: 1.03,
    parallax: 20,
    parallaxMobile: 0,
    hoverLift: 2,
    hoverScale: 1,
    ornament: 0.35,
    textSequence: false,
    scrollLinked: true,
  },
  friendly: {
    character: "friendly",
    revealDuration: 0.6,
    revealDistance: 26,
    stagger: 0.07,
    ease: EASE_GLIDE,
    spring: null,
    heroStep: 0.12,
    imageScale: 1.04,
    parallax: 26,
    parallaxMobile: 10,
    hoverLift: 4,
    hoverScale: 1.01,
    ornament: 0.4,
    textSequence: false,
    scrollLinked: true,
  },
  energetic: {
    character: "energetic",
    revealDuration: 0.45,
    revealDistance: 34,
    stagger: 0.05,
    ease: EASE_OUT_EXPO,
    spring: { stiffness: 300, damping: 26 },
    heroStep: 0.09,
    imageScale: 1.06,
    parallax: 36,
    parallaxMobile: 0,
    hoverLift: 2,
    hoverScale: 1.03,
    ornament: 0.8,
    textSequence: true,
    scrollLinked: true,
  },
  slow: {
    character: "slow",
    revealDuration: 1.1,
    revealDistance: 14,
    stagger: 0.14,
    ease: EASE_OUT_SOFT,
    spring: null,
    heroStep: 0.22,
    imageScale: 1.025,
    parallax: 16,
    parallaxMobile: 0,
    hoverLift: 0,
    hoverScale: 1,
    ornament: 0.6,
    textSequence: true,
    scrollLinked: true,
  },
  crisp: {
    character: "crisp",
    revealDuration: 0.35,
    revealDistance: 16,
    stagger: 0.04,
    ease: EASE_SNAP,
    spring: null,
    heroStep: 0.07,
    imageScale: 1.02,
    parallax: 12,
    parallaxMobile: 0,
    hoverLift: 1,
    hoverScale: 1.005,
    ornament: 0.5,
    textSequence: false,
    scrollLinked: true,
  },
  ornate: {
    character: "ornate",
    revealDuration: 0.9,
    revealDistance: 22,
    stagger: 0.09,
    ease: EASE_OUT_EXPO,
    spring: null,
    heroStep: 0.16,
    imageScale: 1.04,
    parallax: 22,
    parallaxMobile: 0,
    hoverLift: 2,
    hoverScale: 1.01,
    ornament: 1,
    textSequence: true,
    scrollLinked: true,
  },
  gliding: {
    character: "gliding",
    revealDuration: 1.0,
    revealDistance: 30,
    stagger: 0.06,
    ease: EASE_GLIDE,
    spring: null,
    heroStep: 0.18,
    imageScale: 1.03,
    parallax: 56,
    parallaxMobile: 0,
    hoverLift: 0,
    hoverScale: 1,
    ornament: 0.2,
    textSequence: true,
    scrollLinked: true,
  },
  expressive: {
    // Character-level alias: an "expressive" meta character shares the
    // energetic body; no theme currently declares it directly.
    character: "expressive",
    revealDuration: 0.45,
    revealDistance: 34,
    stagger: 0.05,
    ease: EASE_OUT_EXPO,
    spring: { stiffness: 300, damping: 26 },
    heroStep: 0.09,
    imageScale: 1.06,
    parallax: 36,
    parallaxMobile: 0,
    hoverLift: 2,
    hoverScale: 1.03,
    ornament: 0.8,
    textSequence: true,
    scrollLinked: true,
  },
  springy: {
    character: "springy",
    revealDuration: 0.5,
    revealDistance: 28,
    stagger: 0.06,
    ease: EASE_GLIDE,
    spring: { stiffness: 260, damping: 17 },
    heroStep: 0.1,
    imageScale: 1.05,
    parallax: 14,
    parallaxMobile: 0,
    hoverLift: 4,
    hoverScale: 1.03,
    ornament: 0.7,
    textSequence: true,
    scrollLinked: true,
  },
};

export interface ResolvedMotion extends MotionProfile {
  /** Raw record intensity after themeOverrides.motion. */
  mode: MotionIntensity;
}

const STATIC_PROFILE: MotionProfile = {
  character: "quiet",
  revealDuration: 0,
  revealDistance: 0,
  stagger: 0,
  ease: EASE_OUT_SOFT,
  spring: null,
  heroStep: 0,
  imageScale: 1,
  parallax: 0,
  parallaxMobile: 0,
  hoverLift: 0,
  hoverScale: 1,
  ornament: 0,
  textSequence: false,
  scrollLinked: false,
};

/**
 * Resolves the theme's motion character adjusted by the override intensity:
 *   none      – everything static, content renders immediately
 *   subtle    – short restrained reveals, very small interaction movement
 *   expressive– the theme's full motion language
 */
export function resolveMotionProfile(
  themeId: ThemeId,
  mode: MotionIntensity,
): ResolvedMotion {
  const character = themeMeta[themeId].motion;
  const base = motionProfiles[character];

  if (mode === "none") {
    return { ...STATIC_PROFILE, character, mode };
  }

  if (mode === "subtle") {
    return {
      ...base,
      mode,
      revealDuration: Math.min(base.revealDuration, 0.45),
      revealDistance: Math.min(base.revealDistance, 14),
      stagger: Math.min(base.stagger, 0.05),
      spring: null,
      heroStep: Math.min(base.heroStep, 0.08),
      imageScale: 1 + (base.imageScale - 1) * 0.4,
      parallax: Math.round(base.parallax * 0.35),
      parallaxMobile: 0,
      hoverLift: Math.min(base.hoverLift, 2),
      hoverScale: Math.min(base.hoverScale, 1.01),
      ornament: Math.min(base.ornament, 0.25),
      textSequence: false,
    };
  }

  return { ...base, mode };
}

/**
 * True when any entrance motion runs at all. Primitives render plain markup
 * (no initial hidden state, no observers) when this is false so content can
 * never remain hidden.
 */
export function motionRuns(profile: ResolvedMotion): boolean {
  return profile.mode !== "none" && (profile.revealDuration > 0 || profile.stagger > 0);
}
