/**
 * Test stub for next/font/local: the real loader needs the Next.js build
 * pipeline; component-level SSR tests only need the shape it returns.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- stub signature mirrors the real API
export default function localFont(_options: unknown): { variable: string; style: { fontFamily: string } } {
  return { variable: "font-stub-variable", style: { fontFamily: "font-stub" } };
}
