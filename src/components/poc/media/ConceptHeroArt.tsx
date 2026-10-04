import type { ResolvedImage, ThemeId } from "@/lib/poc/types";

type ArtConfig = {
  background: string;
  surface: string;
  ink: string;
  accent: string;
  label: string;
  motif:
    | "botanical"
    | "checker"
    | "coffee"
    | "deco"
    | "industrial"
    | "lookbook"
    | "mediterranean"
    | "memphis"
    | "minimal"
    | "neon"
    | "poster"
    | "table";
};

const ART: Record<ThemeId, ArtConfig> = {
  "heritage-bistro": {
    background: "#f6f1e7",
    surface: "#e8deca",
    ink: "#3c3026",
    accent: "#7b2830",
    label: "HERITAGE EDITION",
    motif: "botanical",
  },
  "neon-night": {
    background: "#09090d",
    surface: "#171625",
    ink: "#f7f2ff",
    accent: "#ff3aac",
    label: "AFTER DARK",
    motif: "neon",
  },
  "minimal-japanese": {
    background: "#f4f0e8",
    surface: "#e6ded0",
    ink: "#24211d",
    accent: "#b64634",
    label: "QUIETLY CRAFTED",
    motif: "minimal",
  },
  "mediterranean-sun": {
    background: "#fffaf0",
    surface: "#dfeaf0",
    ink: "#113c61",
    accent: "#e56b3f",
    label: "BY THE SUN",
    motif: "mediterranean",
  },
  "coffee-editorial": {
    background: "#efe7db",
    surface: "#d9c7b0",
    ink: "#2b1d16",
    accent: "#b4552d",
    label: "THE COFFEE EDIT",
    motif: "coffee",
  },
  "american-diner": {
    background: "#fff6df",
    surface: "#dce6ea",
    ink: "#17324d",
    accent: "#d63b35",
    label: "OPEN & SERVING",
    motif: "checker",
  },
  "luxury-fine-dining": {
    background: "#111110",
    surface: "#201f1b",
    ink: "#f3efe6",
    accent: "#c9b378",
    label: "PRIVATE EDITION",
    motif: "table",
  },
  "street-food-poster": {
    background: "#ffcc31",
    surface: "#f8efe0",
    ink: "#201a16",
    accent: "#f2552c",
    label: "FRESH ON THE BLOCK",
    motif: "poster",
  },
  "botanical-brunch": {
    background: "#faf7f0",
    surface: "#dfe3d5",
    ink: "#354334",
    accent: "#a4536a",
    label: "GARDEN EDITION",
    motif: "botanical",
  },
  "modern-industrial": {
    background: "#d9d9d5",
    surface: "#c4c6c2",
    ink: "#1e2528",
    accent: "#ef5a2f",
    label: "FIELD NOTE / 01",
    motif: "industrial",
  },
  "deco-supper-club": {
    background: "#0f302b",
    surface: "#183f37",
    ink: "#f4e8ce",
    accent: "#d2ad63",
    label: "TONIGHT'S EDITION",
    motif: "deco",
  },
  "atelier-lookbook": {
    background: "#f7f6f2",
    surface: "#e9e7e1",
    ink: "#151515",
    accent: "#d3182c",
    label: "LOOK 01 / SERVICE",
    motif: "lookbook",
  },
  "memphis-play": {
    background: "#fff4d7",
    surface: "#f3d85a",
    ink: "#192f70",
    accent: "#ef645c",
    label: "GOOD THINGS INSIDE",
    motif: "memphis",
  },
};

function themeFromUrl(url: string): ThemeId {
  const match = url.match(/\/poc-placeholders\/([a-z0-9-]+)-hero\.svg$/);
  const value = match?.[1] as ThemeId | undefined;
  return value && value in ART ? value : "heritage-bistro";
}

function businessNameFromAlt(alt: string): string {
  const marker = "photograph of ";
  const index = alt.toLowerCase().lastIndexOf(marker);
  const name = index >= 0 ? alt.slice(index + marker.length).trim() : "Your business";
  return name.length > 42 ? `${name.slice(0, 39).trim()}…` : name;
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return (parts.length > 1 ? `${parts[0]![0]}${parts.at(-1)![0]}` : name.slice(0, 2)).toUpperCase();
}

function Motif({ config }: { config: ArtConfig }) {
  const common = { fill: "none", stroke: config.accent, strokeWidth: 6 };
  switch (config.motif) {
    case "coffee":
      return (
        <g>
          <circle cx="1115" cy="430" r="184" fill={config.surface} />
          <circle cx="1115" cy="430" r="120" fill="none" stroke={config.ink} strokeWidth="18" />
          <path d="M1230 385 C1390 355 1390 510 1240 492" {...common} strokeWidth="22" />
          <path d="M1028 410 C1070 360 1148 360 1194 410 C1150 460 1070 460 1028 410Z" fill={config.accent} opacity=".82" />
          <path d="M1110 365 C1080 402 1080 438 1110 468" fill="none" stroke={config.background} strokeWidth="8" />
          <path d="M920 695 H1420 M965 735 H1350" stroke={config.ink} strokeWidth="4" />
        </g>
      );
    case "botanical":
      return (
        <g {...common}>
          <path d="M1120 730 C1080 610 1110 480 1095 265" />
          <path d="M1100 360 C1000 292 910 325 870 422 C965 430 1045 405 1100 360Z" />
          <path d="M1105 470 C1215 392 1318 430 1350 535 C1248 535 1165 510 1105 470Z" />
          <path d="M1110 580 C1012 525 925 562 900 655 C995 650 1062 625 1110 580Z" />
          <circle cx="1093" cy="240" r="34" />
        </g>
      );
    case "checker":
      return (
        <g>
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 5 }, (_, col) => (
              <rect key={`${row}-${col}`} x={930 + col * 94} y={230 + row * 94} width="94" height="94" fill={(row + col) % 2 ? config.surface : config.ink} />
            )),
          )}
          <circle cx="1165" cy="465" r="132" fill={config.background} stroke={config.accent} strokeWidth="18" />
          <path d="M1055 465 H1275" stroke={config.accent} strokeWidth="16" />
        </g>
      );
    case "minimal":
      return (
        <g>
          <circle cx="1160" cy="415" r="205" fill={config.accent} opacity=".92" />
          <rect x="1090" y="180" width="14" height="500" fill={config.ink} />
          <rect x="1122" y="180" width="4" height="500" fill={config.ink} opacity=".6" />
        </g>
      );
    case "mediterranean":
      return (
        <g>
          <path d="M885 700 V415 A280 280 0 0 1 1445 415 V700Z" fill={config.surface} stroke={config.ink} strokeWidth="10" />
          <circle cx="1165" cy="400" r="96" fill={config.accent} />
          <path d="M920 575 Q1040 515 1160 575 T1400 575 M920 635 Q1040 575 1160 635 T1400 635" fill="none" stroke={config.ink} strokeWidth="12" />
        </g>
      );
    case "neon":
      return (
        <g fill="none">
          <circle cx="1160" cy="445" r="225" stroke="#35e8ff" strokeWidth="14" opacity=".75" />
          <circle cx="1160" cy="445" r="150" stroke={config.accent} strokeWidth="22" />
          <path d="M1035 445 H1285 M1160 320 V570" stroke="#d9ff4f" strokeWidth="12" />
          <path d="M920 720 H1400" stroke={config.accent} strokeWidth="8" />
        </g>
      );
    case "deco":
      return (
        <g fill="none" stroke={config.accent}>
          <path d="M1160 175 L1440 690 H880Z" strokeWidth="8" />
          <circle cx="1160" cy="505" r="148" strokeWidth="7" />
          {Array.from({ length: 9 }, (_, index) => {
            const angle = (index * Math.PI) / 8;
            const x = 1160 + Math.cos(angle) * 235;
            const y = 505 - Math.sin(angle) * 235;
            return <line key={index} x1="1160" y1="505" x2={x} y2={y} strokeWidth="4" />;
          })}
        </g>
      );
    case "industrial":
      return (
        <g>
          <path d="M860 250 H1450 M860 350 H1450 M860 450 H1450 M860 550 H1450 M960 170 V690 M1080 170 V690 M1200 170 V690 M1320 170 V690" stroke={config.ink} strokeWidth="2" opacity=".34" />
          <rect x="965" y="275" width="350" height="280" fill="none" stroke={config.ink} strokeWidth="10" />
          <path d="M965 555 L1315 275 M965 275 L1315 555" stroke={config.accent} strokeWidth="10" />
          <circle cx="1140" cy="415" r="76" fill={config.background} stroke={config.ink} strokeWidth="8" />
        </g>
      );
    case "lookbook":
      return (
        <g>
          <rect x="900" y="150" width="430" height="590" fill={config.surface} />
          <rect x="1325" y="150" width="28" height="590" fill={config.accent} />
          <circle cx="1115" cy="390" r="128" fill="none" stroke={config.ink} strokeWidth="3" />
          <path d="M985 645 H1260 M1030 680 H1215" stroke={config.ink} strokeWidth="4" />
        </g>
      );
    case "memphis":
      return (
        <g>
          <path d="M930 280 C1010 150 1175 210 1160 340 C1145 475 950 455 930 280Z" fill={config.accent} />
          <circle cx="1320" cy="560" r="125" fill={config.surface} stroke={config.ink} strokeWidth="10" />
          <path d="M900 650 Q960 560 1020 650 T1140 650" fill="none" stroke={config.ink} strokeWidth="14" />
          <path d="M1240 210 L1390 350 M1390 210 L1240 350" stroke={config.ink} strokeWidth="16" />
        </g>
      );
    case "poster":
      return (
        <g>
          <path d="M885 205 L1410 165 L1450 690 L925 735Z" fill={config.surface} stroke={config.ink} strokeWidth="12" />
          <path d="M930 300 H1380 M955 395 H1340 M940 490 H1375" stroke={config.ink} strokeWidth="28" />
          <circle cx="1290" cy="610" r="92" fill={config.accent} stroke={config.ink} strokeWidth="10" />
        </g>
      );
    case "table":
    default:
      return (
        <g fill="none" stroke={config.accent}>
          <rect x="900" y="165" width="520" height="560" strokeWidth="3" />
          <circle cx="1160" cy="425" r="170" strokeWidth="5" />
          <circle cx="1160" cy="425" r="110" strokeWidth="2" />
          <path d="M1000 425 H1320 M1160 265 V585" strokeWidth="2" />
          <path d="M1010 650 H1310" stroke={config.ink} strokeWidth="5" />
        </g>
      );
  }
}

/**
 * Honest, theme-specific concept artwork used when no licensed business photo
 * exists. It is deliberately typographic/illustrative rather than a fake
 * photograph, and includes the business name so the POC never looks like a
 * generic loading skeleton.
 */
export function ConceptHeroArt({
  image,
  className,
  fill,
}: {
  image: ResolvedImage;
  className?: string;
  fill: boolean;
}) {
  const themeId = themeFromUrl(image.url);
  const config = ART[themeId];
  const name = businessNameFromAlt(image.alt);
  const mark = initials(name);
  const nameFontSize = name.length > 30 ? 26 : name.length > 20 ? 32 : 40;

  return (
    <div
      role="img"
      aria-label={`Illustrative website concept artwork for ${name}`}
      data-provenance="concept artwork"
      data-hero-strategy="theme-concept-art"
      className={`${fill ? "absolute inset-0" : "relative aspect-[16/9]"} overflow-hidden ${className ?? ""}`}
      style={{ background: config.background }}
    >
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden="true">
        <rect width="1600" height="900" fill={config.background} />
        <rect x="55" y="55" width="1490" height="790" rx="4" fill="none" stroke={config.ink} strokeWidth="3" opacity=".4" />
        <rect x="95" y="95" width="625" height="710" fill={config.ink} />
        <rect x="95" y="95" width="18" height="710" fill={config.accent} />
        <text x="155" y="175" fill={config.background} fontSize="28" fontFamily="ui-monospace, monospace" letterSpacing="8">
          {config.label}
        </text>
        <text x="145" y="530" fill={config.background} fontSize="245" fontWeight="700" fontFamily="Georgia, serif" letterSpacing="-18">
          {mark}
        </text>
        <line x1="155" y1="650" x2="645" y2="650" stroke={config.accent} strokeWidth="8" />
        <text x="155" y="710" fill={config.background} fontSize={nameFontSize} fontFamily="ui-sans-serif, sans-serif" letterSpacing="2">
          {name}
        </text>
        <text x="155" y="758" fill={config.background} opacity=".72" fontSize="22" fontFamily="ui-monospace, monospace" letterSpacing="6">
          UNOFFICIAL WEBSITE CONCEPT
        </text>
        <Motif config={config} />
        <text x="895" y="790" fill={config.ink} opacity=".66" fontSize="16" fontFamily="ui-monospace, monospace" letterSpacing="3">
          ART DIRECTION / {themeId.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
