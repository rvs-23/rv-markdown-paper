import {
  ACCENTS,
  BODY_FONTS,
  DENSITIES,
  HEADING_FONTS,
  PAPER_TONES,
  type Accent,
  type BodyFont,
  type Density,
  type DocumentOptionsLayer,
  type HeadingFont,
  type Margins,
  type PaperTone,
  type ThemeLayer,
} from "./options.js";

const CSS_LENGTH_RE = /^\d*\.?\d+(in|cm|mm|pt|px)$/;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function validateOptions(raw: unknown, source: string): DocumentOptionsLayer {
  if (raw === null || raw === undefined) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ConfigError(`${source}: expected an object, got ${describe(raw)}.`);
  }
  const r = raw as Record<string, unknown>;
  const out: DocumentOptionsLayer = {};

  if ("title" in r) out.title = expectString(r.title, `${source}.title`);
  if ("author" in r) out.author = expectString(r.author, `${source}.author`);
  if ("date" in r) out.date = expectDate(r.date, `${source}.date`);
  if ("pageSize" in r) out.pageSize = expectPageSize(r.pageSize, `${source}.pageSize`);
  if ("margins" in r) out.margins = expectMargins(r.margins, `${source}.margins`);
  if ("showHeader" in r) out.showHeader = expectBool(r.showHeader, `${source}.showHeader`);
  if ("showFooter" in r) out.showFooter = expectBool(r.showFooter, `${source}.showFooter`);
  if ("theme" in r) out.theme = expectTheme(r.theme, `${source}.theme`);

  return out;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    throw new ConfigError(`${path}: expected a string, got ${describe(value)}.`);
  }
  return value;
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

function expectTheme(value: unknown, path: string): ThemeLayer {
  if (value === null || value === undefined) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new ConfigError(`${path}: expected an object, got ${describe(value)}.`);
  }
  const t = value as Record<string, unknown>;
  const out: ThemeLayer = {};
  if ("paperTone" in t) out.paperTone = expectEnum(t.paperTone, PAPER_TONES, `${path}.paperTone`) as PaperTone;
  if ("accent" in t) out.accent = expectEnum(t.accent, ACCENTS, `${path}.accent`) as Accent;
  if ("bodyFont" in t) out.bodyFont = expectEnum(t.bodyFont, BODY_FONTS, `${path}.bodyFont`) as BodyFont;
  if ("headingFont" in t) out.headingFont = expectEnum(t.headingFont, HEADING_FONTS, `${path}.headingFont`) as HeadingFont;
  if ("density" in t) out.density = expectEnum(t.density, DENSITIES, `${path}.density`) as Density;
  return out;
}

function expectEnum(value: unknown, allowed: readonly string[], path: string): string {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value;
  const options = allowed.map((s) => `"${s}"`).join(" or ");
  throw new ConfigError(`${path}: expected ${options}, got ${describe(value)}.`);
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return typeof value;
}
