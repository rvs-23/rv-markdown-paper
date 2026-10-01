import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Root } from "mdast";
import type { Cover, DocumentOptions } from "../config/options.js";
import type { Attributes } from "../parser/attributes.js";
import { FONTS_DIR } from "./render.js";

// Typst renders a character no available font covers as nothing, with no
// warning. Since only the fonts in assets/fonts are available, the
// converter checks every character that will render against their
// combined cmap coverage and refuses the document up front instead.

/**
 * Reads the Unicode code points a font maps to a real glyph.
 *
 * Handles TrueType and CFF-flavoured OpenType files (they share the sfnt
 * table directory) and the cmap subtable formats 4 (BMP) and 12 (full
 * range), from every Unicode subtable the font has.
 *
 * Args:
 *   font: The raw bytes of a .ttf or .otf file.
 *   into: Set to add the code points to; a new one is created if omitted.
 *
 * Returns:
 *   The set of covered code points.
 */
export function readCmapCoverage(font: Buffer, into = new Set<number>()): Set<number> {
  const numTables = font.readUInt16BE(4);
  let cmap = -1;
  for (let i = 0; i < numTables; i++) {
    const record = 12 + i * 16;
    if (font.toString("latin1", record, record + 4) === "cmap") {
      cmap = font.readUInt32BE(record + 8);
    }
  }
  if (cmap < 0) return into;

  const numSubtables = font.readUInt16BE(cmap + 2);
  for (let i = 0; i < numSubtables; i++) {
    const record = cmap + 4 + i * 8;
    const platform = font.readUInt16BE(record);
    const encoding = font.readUInt16BE(record + 2);
    const isUnicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!isUnicode) continue;
    const sub = cmap + font.readUInt32BE(record + 4);
    const format = font.readUInt16BE(sub);
    if (format === 4) readFormat4(font, sub, into);
    else if (format === 12) readFormat12(font, sub, into);
  }
  return into;
}

// Segment arrays follow the 14-byte header: endCode, a reserved pad,
// startCode, idDelta, idRangeOffset, then the glyph index array that
// idRangeOffset points into (relative to its own position).
function readFormat4(font: Buffer, sub: number, into: Set<number>): void {
  const segCount = font.readUInt16BE(sub + 6) / 2;
  const ends = sub + 14;
  const starts = ends + segCount * 2 + 2;
  const deltas = starts + segCount * 2;
  const rangeOffsets = deltas + segCount * 2;
  for (let i = 0; i < segCount; i++) {
    const end = font.readUInt16BE(ends + i * 2);
    const start = font.readUInt16BE(starts + i * 2);
    const delta = font.readUInt16BE(deltas + i * 2);
    const rangeOffsetAt = rangeOffsets + i * 2;
    const rangeOffset = font.readUInt16BE(rangeOffsetAt);
    for (let c = start; c <= end && c !== 0xffff; c++) {
      let glyph = c;
      if (rangeOffset !== 0) {
        glyph = font.readUInt16BE(rangeOffsetAt + rangeOffset + (c - start) * 2);
        if (glyph === 0) continue;
      }
      if (((glyph + delta) & 0xffff) !== 0) into.add(c);
    }
  }
}

// Groups of (startChar, endChar, startGlyph), 12 bytes each, after a
// 16-byte header.
function readFormat12(font: Buffer, sub: number, into: Set<number>): void {
  const numGroups = font.readUInt32BE(sub + 12);
  for (let i = 0; i < numGroups; i++) {
    const group = sub + 16 + i * 12;
    const start = font.readUInt32BE(group);
    const end = font.readUInt32BE(group + 4);
    const startGlyph = font.readUInt32BE(group + 8);
    for (let c = start; c <= end; c++) {
      if (startGlyph + (c - start) !== 0) into.add(c);
    }
  }
}

let bundledCoverage: Set<number> | undefined;

/**
 * Returns the code points covered by at least one font in assets/fonts.
 *
 * Computed once per process.
 */
export function bundledFontCoverage(): Set<number> {
  if (!bundledCoverage) {
    const coverage = new Set<number>();
    for (const file of readdirSync(FONTS_DIR)) {
      if (/\.(ttf|otf)$/i.test(file)) readCmapCoverage(readFileSync(join(FONTS_DIR, file)), coverage);
    }
    bundledCoverage = coverage;
  }
  return bundledCoverage;
}

/** A run of text that will render, and where it came from. */
export type RenderedText = { text: string; where: string };

/**
 * Collects the text of a parsed document that will reach the PDF.
 *
 * Walks every node generically, so node types added later are covered:
 * string `value`s, image `alt`, directive `attributes` and parsed
 * attribute props. Skips what doesn't render as text: raw `html`, `math`
 * and `inlineMath` (set in the math font from converted LaTeX), and
 * footnote definitions the generator drops (nested ones always; in page
 * mode, those never referenced).
 *
 * Args:
 *   tree: The mdast root, after any nodes that won't render are removed.
 *   footnoteMode: The document's footnote placement.
 *   lineOffset: Lines before the markdown body (the frontmatter), added
 *     to mdast line numbers so they match the source file.
 *
 * Returns:
 *   Text runs with their source line, e.g. `{ text: "...", where: "line 12" }`.
 */
export function collectRenderedText(
  tree: Root,
  footnoteMode: "page" | "endnotes",
  lineOffset = 0,
): RenderedText[] {
  const referenced = new Set<string>();
  const findRefs = (node: Node): void => {
    if (node.type === "footnoteReference") referenced.add(String(node.identifier));
    if (Array.isArray(node.children)) node.children.forEach(findRefs);
  };
  findRefs(tree as unknown as Node);

  const out: RenderedText[] = [];
  // Nodes that later passes create (span and highlight pieces) carry no
  // position, so a node without one reports its nearest parent's line.
  const walk = (node: Node, isTopLevel: boolean, parentLine?: number): void => {
    if (node.type === "html" || node.type === "math" || node.type === "inlineMath") return;
    if (
      node.type === "footnoteDefinition" &&
      (!isTopLevel || (footnoteMode === "page" && !referenced.has(String(node.identifier))))
    ) {
      return;
    }
    const line = node.position?.start.line ?? parentLine;
    const where = line === undefined ? "unknown line" : `line ${line + lineOffset}`;
    const attrs = node.data?.attrs as Attributes | undefined;
    const strings = [
      node.value,
      node.alt,
      ...Object.values(node.attributes ?? {}),
      ...Object.values(attrs?.props ?? {}),
    ];
    for (const s of strings) if (typeof s === "string" && s !== "") out.push({ text: s, where });
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child, node.type === "root", line);
    }
  };
  walk(tree as unknown as Node, false);
  return out;
}

type Node = {
  type: string;
  value?: unknown;
  alt?: unknown;
  identifier?: unknown;
  attributes?: Record<string, unknown> | null;
  data?: Record<string, unknown>;
  position?: { start: { line: number } };
  children?: Node[];
};

/**
 * Collects the document option strings the template renders.
 *
 * Args:
 *   options: The resolved options passed to the template.
 *
 * Returns:
 *   One entry per non-empty string, located as `frontmatter (<field>)`.
 */
export function collectOptionText(options: DocumentOptions): RenderedText[] {
  const fields: Array<[string, unknown]> = [
    ["title", options.title],
    ["subtitle", options.subtitle],
    ["section", options.section],
    ["author", options.author],
    ["date", options.date],
    ["readingTime", options.readingTime],
    ["part", options.part],
    ["series", options.series],
    ["edition", options.edition],
    ["editionShort", options.editionShort],
    ["volume", options.volume],
    ["chapter", options.chapter],
    ["watermark", options.watermark],
  ];
  const cover: Cover = options.cover ?? {};
  fields.push(["cover.kicker", cover.kicker], ["cover.title", cover.title], ["cover.subtitle", cover.subtitle]);
  for (const pair of cover.meta ?? []) fields.push(["cover.meta", pair.label], ["cover.meta", pair.value]);
  for (const entry of cover.toc ?? []) {
    fields.push(["cover.toc", entry.id], ["cover.toc", entry.title], ["cover.toc", entry.page]);
  }
  return fields
    .filter((f): f is [string, string] => typeof f[1] === "string" && f[1] !== "")
    .map(([field, text]) => ({ text, where: `frontmatter (${field})` }));
}

// Characters that never need a glyph of their own: whitespace, controls,
// and default-ignorables (soft hyphen, ZWJ/ZWNJ, variation selectors,
// emoji tag characters, bidi marks), which shaping leaves invisible.
const IGNORED_RE = /[\s\p{Cc}\p{Default_Ignorable_Code_Point}]/u;
const MAX_LISTED = 20;

/**
 * Throws if any text contains a character no bundled font can render.
 *
 * Text is NFC-normalised first; a character that is still uncovered
 * passes when every part of its canonical decomposition is covered,
 * since shaping decomposes it the same way.
 *
 * Args:
 *   texts: The text that will render, from collectRenderedText and
 *     collectOptionText.
 *   coverage: Covered code points; defaults to the bundled fonts.
 *
 * Raises:
 *   Error: Listing each distinct uncovered character, its code point and
 *     the first place it appears.
 */
export function assertFontCoverage(
  texts: RenderedText[],
  coverage: Set<number> = bundledFontCoverage(),
): void {
  const covered = (ch: string) => coverage.has(ch.codePointAt(0)!);
  const missing = new Map<string, string>();
  for (const { text, where } of texts) {
    for (const ch of text.normalize("NFC")) {
      if (missing.has(ch) || IGNORED_RE.test(ch) || covered(ch)) continue;
      if ([...ch.normalize("NFD")].every(covered)) continue;
      missing.set(ch, where);
    }
  }
  if (missing.size === 0) return;

  const entries = [...missing];
  const lines = entries.slice(0, MAX_LISTED).map(([ch, where]) => {
    const code = ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0");
    return `  ${ch}  U+${code}  ${where}`;
  });
  if (entries.length > MAX_LISTED) lines.push(`  ...and ${entries.length - MAX_LISTED} more`);
  throw new Error(
    `No bundled font covers ${entries.length === 1 ? "this character" : "these characters"}, ` +
      `so Typst would silently leave ${entries.length === 1 ? "it" : "them"} out of the PDF:\n` +
      `${lines.join("\n")}\n` +
      `The bundled fonts cover Latin, plus Greek, Cyrillic and Hebrew via the ` +
      `Libertinus Serif fallback, Devanagari, Bengali, Kannada, Telugu and monochrome emoji.`,
  );
}
