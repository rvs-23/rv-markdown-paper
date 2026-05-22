import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm, copyFile } from "node:fs/promises";
import { join, dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import type { Cover, DocumentOptions } from "../config/options.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolvePath(HERE, "./template.typ");
const THEME_PATH = resolvePath(HERE, "./theme.tmTheme");
const FONTS_DIR = resolvePath(HERE, "../../assets/fonts");

export type TypstRenderOptions = {
  body: string;
  outputPath: string;
  options: DocumentOptions;
  // Source markdown's directory. Used as Typst's `--root` so the compiler
  // can only read files under the document's own tree. The temp build dir
  // is created inside it so template.typ + theme.tmTheme are reachable.
  sourceDir: string;
};

export async function renderTypstToPdf(opts: TypstRenderOptions): Promise<void> {
  const tempDir = await mkdtemp(join(opts.sourceDir, ".mdpdf-"));
  try {
    const tempTemplate = join(tempDir, "template.typ");
    const tempTheme = join(tempDir, "theme.tmTheme");
    await copyFile(TEMPLATE_PATH, tempTemplate);
    await copyFile(THEME_PATH, tempTheme);

    const preamble = buildPreamble(opts.options);
    const source = `${preamble}\n\n${opts.body}\n`;
    const docPath = join(tempDir, "document.typ");
    await writeFile(docPath, source, "utf8");

    await runTypst(docPath, opts.outputPath, opts.sourceDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function buildPreamble(options: DocumentOptions): string {
  const lines: string[] = [];
  lines.push(
    `#import "template.typ": paper, note, tip, warning, danger, warn, system, ` +
      `marg, eyebrow, dropcap, epigraph, exbox, code-block, ` +
      `task-box, task-item, task-list`,
  );
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
  pushOptionalString(lines, "edition", options.edition);
  pushOptionalString(lines, "volume", options.volume);
  pushOptionalNumber(lines, "page-start", options.pageStart);
  pushOptionalNumber(lines, "page-end", options.pageEnd);
  if (options.cover) lines.push(`  cover: ${renderCover(options.cover)},`);
  lines.push(`  page-size: ${quote(pageSizeToTypst(options.pageSize))},`);
  lines.push(`  margin-top: ${cssLengthToTypst(options.margins.top)},`);
  lines.push(`  margin-right: ${cssLengthToTypst(options.margins.right)},`);
  lines.push(`  margin-bottom: ${cssLengthToTypst(options.margins.bottom)},`);
  lines.push(`  margin-left: ${cssLengthToTypst(options.margins.left)},`);
  lines.push(`  show-header: ${options.showHeader},`);
  lines.push(`  show-footer: ${options.showFooter},`);
  lines.push(`  show-cover: ${options.showCover},`);
  lines.push(`  theme-path: "theme.tmTheme",`);
  lines.push(")");
  return lines.join("\n");
}

function pushOptionalString(lines: string[], key: string, value: string | undefined): void {
  if (value === undefined) return;
  lines.push(`  ${key}: ${quote(value)},`);
}

function pushOptionalScalar(
  lines: string[],
  key: string,
  value: string | number | undefined,
): void {
  if (value === undefined) return;
  if (typeof value === "number") lines.push(`  ${key}: ${value},`);
  else lines.push(`  ${key}: ${quote(value)},`);
}

function pushOptionalNumber(lines: string[], key: string, value: number | undefined): void {
  if (value === undefined) return;
  lines.push(`  ${key}: ${value},`);
}

function renderCover(cover: Cover): string {
  const fields: string[] = [];
  if (cover.kicker !== undefined) fields.push(`kicker: ${quote(cover.kicker)}`);
  if (cover.title !== undefined) fields.push(`title: ${quote(cover.title)}`);
  if (cover.subtitle !== undefined) fields.push(`subtitle: ${quote(cover.subtitle)}`);
  if (cover.meta !== undefined) {
    const pairs = cover.meta
      .map((p) => `(label: ${quote(p.label)}, value: ${quote(p.value)})`)
      .join(", ");
    fields.push(`meta: (${pairs}${cover.meta.length === 1 ? "," : ""})`);
  }
  if (cover.toc !== undefined) {
    const entries = cover.toc
      .map((e) => {
        const parts = [`id: ${quote(e.id)}`, `title: ${quote(e.title)}`];
        if (e.ref) parts.push(`ref: ${quote(e.ref)}`);
        if (e.page) parts.push(`page: ${quote(e.page)}`);
        return `(${parts.join(", ")})`;
      })
      .join(", ");
    fields.push(`toc: (${entries}${cover.toc.length === 1 ? "," : ""})`);
  }
  return `(${fields.join(", ")})`;
}

function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function pageSizeToTypst(size: "Letter" | "A4"): string {
  return size === "Letter" ? "us-letter" : "a4";
}

function cssLengthToTypst(value: string): string {
  const match = value.match(/^(\d*\.?\d+)(in|cm|mm|pt|px)$/);
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

function runTypst(inputPath: string, outputPath: string, root: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "typst",
      [
        "compile",
        "--root", root,
        "--font-path", FONTS_DIR,
        "--ignore-system-fonts",
        inputPath,
        outputPath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
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
  });
}
