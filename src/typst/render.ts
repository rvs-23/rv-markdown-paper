import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import type { DocumentOptions } from "../config/options.js";

// The template and theme files that ship with the package. Resolved relative
// to this file so the paths are valid whether the runner executes from source
// (tsx) or from dist/.
const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = resolvePath(HERE, "./template.typ");
const THEME_PATH = resolvePath(HERE, "./theme.tmTheme");
const FONTS_DIR = resolvePath(HERE, "../../assets/fonts");

export type TypstRenderOptions = {
  // Typst source emitted by the generator (body markup only — the preamble
  // is built here from the resolved document options).
  body: string;
  outputPath: string;
  options: DocumentOptions;
};

export async function renderTypstToPdf(opts: TypstRenderOptions): Promise<void> {
  const tempDir = await mkdtemp(join(tmpdir(), "mdpdf-"));
  try {
    // Copy the template + theme next to the generated document so Typst's
    // path resolution (relative to the source .typ) finds them without
    // needing `--root`.
    const tempTemplate = join(tempDir, "template.typ");
    const tempTheme = join(tempDir, "theme.tmTheme");
    await copyFile(TEMPLATE_PATH, tempTemplate);
    await copyFile(THEME_PATH, tempTheme);

    const preamble = buildPreamble(opts.options);
    const source = `${preamble}\n\n${opts.body}\n`;
    const docPath = join(tempDir, "document.typ");
    await writeFile(docPath, source, "utf8");

    await runTypst(docPath, opts.outputPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function buildPreamble(options: DocumentOptions): string {
  const lines: string[] = [];
  lines.push(`#import "template.typ": paper, note, warn, system, task-box`);
  lines.push("");
  lines.push("#show: paper.with(");
  pushOptional(lines, "title", options.title);
  pushOptional(lines, "subtitle", options.subtitle);
  pushOptional(lines, "section", options.section);
  pushOptional(lines, "author", options.author);
  pushOptional(lines, "date", options.date);
  pushOptional(lines, "reading-time", options.readingTime);
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

function pushOptional(lines: string[], key: string, value: string | undefined): void {
  if (value === undefined) return;
  lines.push(`  ${key}: ${quote(value)},`);
}

function quote(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function pageSizeToTypst(size: "Letter" | "A4"): string {
  return size === "Letter" ? "us-letter" : "a4";
}

// mdpdf accepts CSS lengths ("1in", "22mm", "72pt"). Typst accepts the same
// unit tokens without quotes: 1in, 22mm, 72pt — so we can pass them through
// as identifiers after validating they match the expected shape.
function cssLengthToTypst(value: string): string {
  const match = value.match(/^(\d*\.?\d+)(in|cm|mm|pt|px)$/);
  if (!match) throw new Error(`Invalid length: ${value}`);
  const [, num, unit] = match;
  // Typst doesn't understand `px`; convert to pt (1px = 0.75pt at 96 DPI).
  if (unit === "px") {
    const pt = parseFloat(num!) * 0.75;
    return `${pt}pt`;
  }
  return `${num}${unit}`;
}

function runTypst(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "typst",
      [
        "compile",
        // `--root /` lets the generated .typ (which lives in a temp dir)
        // reference absolute image paths the user wrote in their Markdown —
        // otherwise Typst rejects paths outside the input file's directory.
        "--root", "/",
        "--font-path", FONTS_DIR,
        "--ignore-system-fonts",
        inputPath,
        outputPath,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        const msg = stderr.trim() || `typst compile exited with code ${code}`;
        reject(new Error(msg));
      }
    });
  });
}
