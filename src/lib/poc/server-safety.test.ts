import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guards server-rendered POC surfaces against browser-global references.
 * Any component that touches window/document/matchMedia must declare
 * "use client" so it never executes during server rendering.
 */

const ROOTS = ["src/themes", "src/components/poc", "src/lib/poc"];
const BANNED = [/\bwindow\./, /\bdocument\./, /\bmatchMedia\(/];

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...tsxFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

describe("server-safety of POC rendering code", () => {
  it("never references browser globals outside client components", () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const file of tsxFiles(root)) {
        const source = readFileSync(file, "utf8");
        const isClient = source.startsWith('"use client"') || source.startsWith("'use client'");
        if (isClient) continue;
        for (const pattern of BANNED) {
          if (pattern.test(source)) {
            offenders.push(`${file} matches ${pattern}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps the map iframe and attribution out of client animation wrappers", () => {
    const mapSource = readFileSync("src/components/poc/map/MapSection.tsx", "utf8");
    expect(mapSource.startsWith('"use client"')).toBe(false);
    expect(mapSource).toContain("<iframe");
  });
});
