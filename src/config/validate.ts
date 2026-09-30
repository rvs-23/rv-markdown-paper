import type {
  Cover,
  DocumentOptionsLayer,
  Margins,
  MetaPair,
  TocEntry,
} from "./options.js";
import { PAPER_PRESETS } from "./options.js";

// Shared with the CLI flag parsers and render.ts (which reads the groups).
export const CSS_LENGTH_RE = /^(\d*\.?\d+)(in|cm|mm|pt|px)$/;
export const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const KNOWN_KEYS = [
  "title", "subtitle", "section", "author", "date", "readingTime", "chapter",
  "part", "series", "edition", "editionShort", "volume", "page-start",
  "page-end", "pageStart", "pageEnd", "cover", "pageSize", "margins",
  "showHeader", "showFooter", "showCover", "paperBg", "footnotes",
];

// `strictKeys` is for mdpdf.config.json, which holds nothing but options,
// so an unknown key there is an error. Frontmatter is shared with other
// tools (Obsidian's `tags`, `aliases`, …), so there only a key that looks
// like a typo of a real option (`showheader`, `titel`) gets a warning.
export function validateOptions(
  raw: unknown,
  source: string,
  { strictKeys = false }: { strictKeys?: boolean } = {},
): DocumentOptionsLayer {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ConfigError(`${source}: expected an object, got ${describe(raw)}.`);
  }
  const r = raw as Record<string, unknown>;
  const out: DocumentOptionsLayer = {};

  for (const key of Object.keys(r)) {
    if (KNOWN_KEYS.includes(key)) continue;
    const guess = closestKnownKey(key);
    const hint = guess ? ` Did you mean "${guess}"?` : "";
    if (strictKeys) {
      throw new ConfigError(`${source}.${key}: unknown option.${hint}`);
    }
    if (guess) console.warn(`mdpdf: ${source}.${key} is not an option and is ignored.${hint}`);
  }

  if ("title" in r) out.title = expectString(r.title, `${source}.title`);
  if ("subtitle" in r) out.subtitle = expectString(r.subtitle, `${source}.subtitle`);
  if ("section" in r) out.section = expectString(r.section, `${source}.section`);
  if ("author" in r) out.author = expectString(r.author, `${source}.author`);
  if ("date" in r) out.date = expectDate(r.date, `${source}.date`);
  if ("readingTime" in r) out.readingTime = expectString(r.readingTime, `${source}.readingTime`);
  if ("chapter" in r) out.chapter = expectStringOrNumber(r.chapter, `${source}.chapter`);
  if ("part" in r) out.part = expectString(r.part, `${source}.part`);
  if ("series" in r) out.series = expectString(r.series, `${source}.series`);
  if ("edition" in r) out.edition = expectString(r.edition, `${source}.edition`);
  if ("editionShort" in r) {
    out.editionShort = expectString(r.editionShort, `${source}.editionShort`);
  }
  if ("volume" in r) out.volume = expectString(r.volume, `${source}.volume`);
  if ("page-start" in r) out.pageStart = expectNumber(r["page-start"], `${source}.page-start`);
  if ("page-end" in r) out.pageEnd = expectNumber(r["page-end"], `${source}.page-end`);
  if ("pageStart" in r) out.pageStart = expectNumber(r.pageStart, `${source}.pageStart`);
  if ("pageEnd" in r) out.pageEnd = expectNumber(r.pageEnd, `${source}.pageEnd`);
  if ("cover" in r) out.cover = expectCover(r.cover, `${source}.cover`);
  if ("pageSize" in r) out.pageSize = expectPageSize(r.pageSize, `${source}.pageSize`);
  if ("margins" in r) out.margins = expectMargins(r.margins, `${source}.margins`);
  if ("showHeader" in r) out.showHeader = expectBool(r.showHeader, `${source}.showHeader`);
  if ("showFooter" in r) out.showFooter = expectBool(r.showFooter, `${source}.showFooter`);
  if ("showCover" in r) out.showCover = expectBool(r.showCover, `${source}.showCover`);
  if ("paperBg" in r) out.paperBg = expectPaper(r.paperBg, `${source}.paperBg`);
  if ("footnotes" in r) out.footnotes = expectFootnoteMode(r.footnotes, `${source}.footnotes`);

  return out;
}

function expectFootnoteMode(value: unknown, path: string): "page" | "endnotes" {
  if (value !== "page" && value !== "endnotes") {
    throw new ConfigError(
      `${path}: expected "page" or "endnotes", got ${describe(value)}.`,
    );
  }
  return value;
}

/**
 * Resolves a page colour: a preset name (any case) or a strict #RRGGBB.
 *
 * Hex is six digits, no shorthand or alpha, so the palette's darkened
 * tones derive from an 8-bit-per-channel base.
 *
 * Args:
 *   value: What the author wrote, e.g. "parchment" or "#F5EEDD".
 *
 * Returns:
 *   The upper-case hex, or null when `value` is neither.
 */
export function paperHex(value: string): string | null {
  const name = value.toLowerCase();
  if (Object.hasOwn(PAPER_PRESETS, name)) return PAPER_PRESETS[name as keyof typeof PAPER_PRESETS];
  return HEX_COLOR_RE.test(value) ? value.toUpperCase() : null;
}

export const PAPER_CHOICES = `${Object.keys(PAPER_PRESETS).join(", ")}, or a #RRGGBB hex color`;

function expectPaper(value: unknown, path: string): string {
  const hex = typeof value === "string" ? paperHex(value) : null;
  if (hex === null) {
    throw new ConfigError(`${path}: expected ${PAPER_CHOICES}, got ${describe(value)}.`);
  }
  return hex;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new ConfigError(`${path}: expected a string, got ${describe(value)}.`);
  }
  return value;
}

function expectStringOrNumber(value: unknown, path: string): string | number {
  if (typeof value === "string" || typeof value === "number") return value;
  throw new ConfigError(`${path}: expected a string or number, got ${describe(value)}.`);
}

function expectNumber(value: unknown, path: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  throw new ConfigError(`${path}: expected a number, got ${describe(value)}.`);
}

function expectBool(value: unknown, path: string): boolean {
  if (typeof value === "boolean") return value;
  throw new ConfigError(`${path}: expected true or false, got ${describe(value)}.`);
}

function expectDate(value: unknown, path: string): string {
  if (typeof value === "string" && value.trim().length > 0) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  throw new ConfigError(`${path}: expected a date string or Date, got ${describe(value)}.`);
}

function expectPageSize(value: unknown, path: string): "Letter" | "A4" {
  if (value === "Letter" || value === "A4") return value;
  throw new ConfigError(`${path}: expected "Letter" or "A4", got ${describe(value)}.`);
}

function expectMargins(value: unknown, path: string): Partial<Margins> {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ConfigError(`${path}: expected an object with top/right/bottom/left keys, got ${describe(value)}.`);
  }
  const m = value as Record<string, unknown>;
  const out: Partial<Margins> = {};
  for (const key of ["top", "right", "bottom", "left"] as const) {
    if (key in m) {
      const v = m[key];
      if (typeof v !== "string" || !CSS_LENGTH_RE.test(v)) {
        throw new ConfigError(`${path}.${key}: expected a CSS length like "0.85in" or "20mm", got ${describe(v)}.`);
      }
      out[key] = v;
    }
  }
  return out;
}

function expectCover(value: unknown, path: string): Cover {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ConfigError(`${path}: expected an object, got ${describe(value)}.`);
  }
  const c = value as Record<string, unknown>;
  const out: Cover = {};
  if ("kicker" in c) out.kicker = expectString(c.kicker, `${path}.kicker`);
  if ("title" in c) out.title = expectString(c.title, `${path}.title`);
  if ("subtitle" in c) out.subtitle = expectString(c.subtitle, `${path}.subtitle`);
  if ("meta" in c) out.meta = expectMeta(c.meta, `${path}.meta`);
  if ("toc" in c) out.toc = expectToc(c.toc, `${path}.toc`);
  return out;
}

function expectMeta(value: unknown, path: string): MetaPair[] {
  // Accept either an ordered object `{Topic: "...", Language: "..."}` or an
  // array of `{label, value}` pairs. Objects preserve insertion order in YAML
  // parsers (js-yaml does), so we can trust the iteration order.
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value.map((entry, idx) => {
      if (typeof entry !== "object" || entry === null) {
        throw new ConfigError(`${path}[${idx}]: expected an object, got ${describe(entry)}.`);
      }
      const e = entry as Record<string, unknown>;
      return {
        label: expectString(e.label, `${path}[${idx}].label`),
        value: expectString(e.value, `${path}[${idx}].value`),
      };
    });
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).map(([k, v]) => ({
      label: k,
      value: expectString(v, `${path}.${k}`),
    }));
  }
  throw new ConfigError(`${path}: expected an object or array, got ${describe(value)}.`);
}

function expectToc(value: unknown, path: string): TocEntry[] {
  if (!Array.isArray(value)) {
    throw new ConfigError(`${path}: expected an array, got ${describe(value)}.`);
  }
  return value.map((entry, idx) => {
    if (typeof entry !== "object" || entry === null) {
      throw new ConfigError(`${path}[${idx}]: expected an object, got ${describe(entry)}.`);
    }
    const e = entry as Record<string, unknown>;
    const out: TocEntry = {
      id: expectString(e.id, `${path}[${idx}].id`),
      title: expectString(e.title, `${path}[${idx}].title`),
    };
    if ("ref" in e) out.ref = expectString(e.ref, `${path}[${idx}].ref`);
    if ("page" in e && e.page !== undefined) {
      // Accept string or number; coerce numbers to string for display.
      if (typeof e.page === "number") {
        out.page = String(e.page);
      } else {
        out.page = expectString(e.page, `${path}[${idx}].page`);
      }
    }
    return out;
  });
}

// The known key within edit distance 2 (case-insensitive), if any.
function closestKnownKey(key: string): string | undefined {
  const k = key.toLowerCase();
  let best: string | undefined;
  let bestDist = 3;
  for (const known of KNOWN_KEYS) {
    const d = editDistance(k, known.toLowerCase());
    if (d < bestDist) {
      best = known;
      bestDist = d;
    }
  }
  return best;
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const sub = prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur.push(Math.min(sub, prev[j]! + 1, cur[j - 1]! + 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return typeof value;
}
