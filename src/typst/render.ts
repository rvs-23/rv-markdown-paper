import { spawn } from "node:child_process";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import type { Cover, DocumentOptions } from "../config/options.js";
import { escapeMarkup, typstString } from "./escape.js";
import { CSS_LENGTH_RE } from "../config/validate.js";

// The template ships as a Typst local package (`@local/mdpaper`) under
// typst/, passed with --package-path. Together with reading the document
// from stdin, nothing has to be written next to the user's markdown:
// --root stays the source dir (images resolve and are sandboxed there)
// while the template loads from outside it.
const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = resolvePath(HERE, "../../typst");
const FONTS_DIR = resolvePath(HERE, "../../assets/fonts");
const TEMPLATE_PACKAGE = "@local/mdpaper:0.1.0";

export type TypstRenderOptions = {
  body: string;
  outputPath: string;
  options: DocumentOptions;
  // Source markdown's directory. Used as Typst's `--root` so the compiler
  // can only read files under the document's own tree.
  sourceDir: string;
  // Whether to reserve the right-hand marginalia rail (see usesRail).
  rail: boolean;
};

export async function renderTypstToPdf(opts: TypstRenderOptions): Promise<void> {
  const source = `${buildPreamble(opts.options, opts.rail)}\n\n${opts.body}\n`;
  const inputs: Record<string, string> = {};
  if (opts.options.paperBg) inputs["paper-bg"] = opts.options.paperBg;
  await runTypst(source, opts.outputPath, opts.sourceDir, inputs);
}

function buildPreamble(options: DocumentOptions, rail: boolean): string {
  const lines: string[] = [];
  lines.push(
    `#import "${TEMPLATE_PACKAGE}": paper, note, tip, warning, danger, warn, system, ` +
      `marg, eyebrow, dropcap, epigraph, exbox, code-block, ` +
      `task-box, task-item, task-list, _sig-numeral, _sig-history, ` +
      `page-right, endnote-ref, endnotes, rule`,
  );
  // Palette tokens are needed by generated body content (e.g. the
  // definition-list grid renders its hairline with `c-hairline`); the
  // template module re-exports the ones it imports from palette.typ.
  lines.push(`#import "${TEMPLATE_PACKAGE}": c-hairline`);
  // Right-margin dicts the generated body switches between around the
  // chapter opener; they depend on this document's margin and rail.
  const marginRight = cssLengthToTypst(options.margins.right);
  lines.push(`#let opener-margins = (right: page-right(${marginRight}, false))`);
  lines.push(`#let body-margins = (right: page-right(${marginRight}, ${rail}))`);
  lines.push("");
  lines.push("#show: paper.with(");
  pushOptionalString(lines, "title", options.title);
  pushOptionalString(lines, "subtitle", options.subtitle);
  pushOptionalString(lines, "section", options.section);
  pushOptionalString(lines, "author", options.author);
  pushOptionalString(lines, "date", options.date);
  pushOptionalString(lines, "reading-time", options.readingTime);
  pushOptionalScalar(lines, "chapter", options.chapter);
  pushOptionalString(lines, "part", options.part);
  pushOptionalString(lines, "series", options.series);
  pushOptionalString(lines, "edition", options.edition);
  pushOptionalString(lines, "edition-short", options.editionShort);
  pushOptionalString(lines, "volume", options.volume);
  pushOptionalNumber(lines, "page-start", options.pageStart);
  pushOptionalNumber(lines, "page-end", options.pageEnd);
  if (options.cover) lines.push(`  cover: ${renderCover(options.cover)},`);
  lines.push(`  page-size: ${typstString(pageSizeToTypst(options.pageSize))},`);
  lines.push(`  margin-top: ${cssLengthToTypst(options.margins.top)},`);
  lines.push(`  margin-right: ${cssLengthToTypst(options.margins.right)},`);
  lines.push(`  margin-bottom: ${cssLengthToTypst(options.margins.bottom)},`);
  lines.push(`  margin-left: ${cssLengthToTypst(options.margins.left)},`);
  lines.push(`  show-header: ${options.showHeader},`);
  lines.push(`  show-footer: ${options.showFooter},`);
  lines.push(`  show-cover: ${options.showCover},`);
  lines.push(`  rail: ${rail},`);
  lines.push(`  theme-path: "theme.tmTheme",`);
  // footnote-mode is consumed at generation time (it controls whether
  // the body emits #footnote or #endnote-ref calls) and is NOT passed
  // through to paper(...) — the template helpers are already imported
  // and any difference is fully encoded in the generated body.
  lines.push(")");
  return lines.join("\n");
}

function pushOptionalString(lines: string[], key: string, value: string | undefined): void {
  if (value === undefined) return;
  lines.push(`  ${key}: ${typstString(value)},`);
}

function pushOptionalScalar(
  lines: string[],
  key: string,
  value: string | number | undefined,
): void {
  if (value === undefined) return;
  if (typeof value === "number") lines.push(`  ${key}: ${value},`);
  else lines.push(`  ${key}: ${typstString(value)},`);
}

function pushOptionalNumber(lines: string[], key: string, value: number | undefined): void {
  if (value === undefined) return;
  lines.push(`  ${key}: ${value},`);
}

function renderCover(cover: Cover): string {
  const fields: string[] = [];
  if (cover.kicker !== undefined) fields.push(`kicker: ${typstString(cover.kicker)}`);
  if (cover.title !== undefined) fields.push(`title: ${typstString(cover.title)}`);
  if (cover.subtitle !== undefined) fields.push(`subtitle: ${typstContentWithBackticks(cover.subtitle)}`);
  if (cover.meta !== undefined) {
    const pairs = cover.meta
      .map((p) => `(label: ${typstString(p.label)}, value: ${typstString(p.value)})`)
      .join(", ");
    fields.push(`meta: (${pairs}${cover.meta.length === 1 ? "," : ""})`);
  }
  if (cover.toc !== undefined) {
    const entries = cover.toc
      .map((e) => {
        const parts = [`id: ${typstString(e.id)}`, `title: ${typstString(e.title)}`];
        if (e.ref) parts.push(`ref: ${typstString(e.ref)}`);
        if (e.page) parts.push(`page: ${typstString(e.page)}`);
        return `(${parts.join(", ")})`;
      })
      .join(", ");
    fields.push(`toc: (${entries}${cover.toc.length === 1 ? "," : ""})`);
  }
  return `(${fields.join(", ")})`;
}

// Narrow markdown-in-cover-field support: only backtick code spans are
// recognised. The cover template renders the result as content (not a
// string), so we emit `[text #raw(block: false, "code") text]` instead
// of `"...with literal backticks..."`. Text outside backticks goes
// through the same markup escaper as body text. Bold/italic/links are
// NOT recognised.
function typstContentWithBackticks(s: string): string {
  // Split on backtick code spans. Even indices are text, odd indices are
  // raw code. The regex requires non-greedy match between matching
  // backticks; a stray single backtick falls through as escaped text.
  const parts = s.split(/`([^`]+)`/);
  const out = parts
    .map((segment, i) =>
      i % 2 === 0
        ? escapeMarkup(segment)
        : `#raw(block: false, ${typstString(segment)})`,
    )
    .join("");
  return `[${out}]`;
}

function pageSizeToTypst(size: "Letter" | "A4"): string {
  return size === "Letter" ? "us-letter" : "a4";
}

function cssLengthToTypst(value: string): string {
  const match = value.match(CSS_LENGTH_RE);
  if (!match) throw new Error(`Invalid length: ${value}`);
  const [, num, unit] = match;
  if (unit === "px") {
    const pt = parseFloat(num!) * 0.75;
    return `${pt}pt`;
  }
  return `${num}${unit}`;
}

// Tail buffer kept for compile errors. 64 KB is well above what any real
// Typst error needs, while bounding memory if a runaway compile floods stderr.
const STDERR_TAIL_BYTES = 64 * 1024;

function runTypst(
  source: string,
  outputPath: string,
  root: string,
  inputs: Record<string, string>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Honour SOURCE_DATE_EPOCH for reproducible builds; default to 0
    // (Unix epoch) so re-rendering the same source produces a
    // byte-identical PDF without the caller having to opt in. Typst's
    // --creation-timestamp pins both the embedded creation date and
    // (via the document ID seed) the PDF /ID entry that otherwise
    // randomises per run.
    const epoch = process.env.SOURCE_DATE_EPOCH ?? "0";
    const inputArgs = Object.entries(inputs).flatMap(([k, v]) => ["--input", `${k}=${v}`]);
    const child = spawn(
      "typst",
      [
        "compile",
        "--root", root,
        "--package-path", PACKAGE_DIR,
        "--font-path", FONTS_DIR,
        "--ignore-system-fonts",
        "--creation-timestamp", epoch,
        ...inputArgs,
        "-",
        outputPath,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stderr = "";
    let truncated = false;
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > STDERR_TAIL_BYTES) {
        stderr = stderr.slice(-STDERR_TAIL_BYTES);
        truncated = true;
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const tail = stderr.trim() || `typst compile exited with code ${code}`;
        const msg = truncated ? `[stderr truncated; tail follows]\n${tail}` : tail;
        reject(new Error(msg));
      }
    });
    child.stdin.end(source);
  });
}
