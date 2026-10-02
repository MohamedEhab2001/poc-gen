# Adding a new theme

A theme is a self-contained composition: fonts, tokens, and one React server component. Shared primitives (map, media, attribution, hours, mobile action bar, concept notice) already exist — reach for them before building new chrome.

## 1. Register the id

In `src/lib/poc/schema.ts`, append the id to `themeIds`:

```ts
export const themeIds = [
  // ...existing thirteen...
  "harbor-brasserie",
] as const;
```

## 2. Describe it in the registry

In `src/lib/poc/theme-meta.ts`, add a `ThemeMeta` entry: name, description, character, default palette (hex values for background, surface, text, muted, primary, secondary, accent, border), supported categories, the font pairing names, a `thumbFamily` (add a miniature branch in `src/app/themes/page.tsx` if you want a bespoke showroom thumbnail), and a motion band.

The palette matters beyond color: every theme sets the same CSS custom properties (`--bg`, `--surface`, `--text`, `--muted`, `--primary`, `--secondary`, `--accent`, `--border`, `--radius`, `--on-primary`, `--font-display`, `--font-body`), which is how the shared mobile action bar adopts the theme's language for free.

## 3. Create the theme folder

```
src/themes/harbor-brasserie/
  fonts.ts    # next/font/google imports with --font-t-display / --font-t-body variables
  theme.tsx   # default export: (props: ThemeProps) => JSX
```

`theme.tsx` skeleton:

```tsx
import type { ThemeProps } from "@/lib/poc/types";
import { MobileActionBar } from "@/components/poc/MobileActionBar";
import { ConceptNotice } from "@/components/poc/ConceptNotice";
import { display, body } from "./fonts";

export default function HarborBrasserieTheme({ record }: ThemeProps) {
  const p = record.palette;
  const style = {
    "--bg": p.background, "--surface": p.surface, "--text": p.text,
    "--muted": p.muted, "--primary": p.primary, "--secondary": p.secondary,
    "--accent": p.accent, "--border": p.border, "--on-primary": "#ffffff",
    "--radius": "8px",
    "--font-display": "var(--font-t-display)",
    "--font-body": "var(--font-t-body)",
  } as React.CSSProperties;

  return (
    <div id="main" style={style} className={`${display.variable} ${body.variable} theme-root`}>
      {/* your composition */}
      <MobileActionBar record={record} />
    </div>
  );
}
```

## 4. Wire the loader

In `src/lib/poc/theme-registry.ts`, add the entry with a lazy loader (this is what keeps themes code-split):

```ts
"harbor-brasserie": {
  ...themeMeta["harbor-brasserie"],
  load: () => import("@/themes/harbor-brasserie/theme"),
},
```

## 5. Add a complete fixture

Create `src/data/businesses/<slug>.ts` with `themeId: "harbor-brasserie"` and a full record, register it in `repository.ts`, and the showroom, theme detail page, and repository test pick it up automatically.

## 6. Design requirements checklist

Before considering the theme done, verify against the project's design bar:

- **Structurally distinct:** different layout architecture, section order, navigation treatment, hero paradigm, CTA shape, radius system, and motion band than the other ten. It must stay recognizable in grayscale.
- **Data-honest:** renders every section when the data exists; hides cleanly when it does not (see the fallback rules in the README). Services and amenities must render even when the about story is missing.
- **Accessible:** semantic landmarks, one `h1`, visible focus (the shared `.theme-root :focus-visible` rule inherits your accent), keyboard-operable controls, alt text from the record, reduced-motion respected (use the shared `fx-*` classes, which collapse automatically under `prefers-reduced-motion`).
- **Responsive:** verify at 390×844 and 1440×900; no horizontal overflow; the mobile action bar must not cover content (the shared spacer handles it).
- **QA:** screenshot both sizes, inspect, and fix before shipping. Do not rely on compilation alone.
