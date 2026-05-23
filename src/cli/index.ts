#!/usr/bin/env node
import { Command, InvalidArgumentError, type OptionValues } from "commander";
import { createRequire } from "node:module";
import { convertMarkdownToPdf } from "../core/convert.js";
import type { DocumentOptionsLayer, Margins } from "../config/options.js";

// Read the package version at runtime so it stays in sync with
// package.json — previously hardcoded `0.1.0` and drifted to `0.2.0+`.
// createRequire works both in `tsx`-driven dev (../../package.json from
// src/cli/index.ts) and in the compiled `dist/cli/index.js` build
// (../../package.json from dist/cli/index.js — same depth).
const requireFromHere = createRequire(import.meta.url);
const pkg = requireFromHere("../../package.json") as { version: string };

const program = new Command();

program
  .name("mdpdf")
  .description("Convert Markdown to a beautiful PDF.")
  .version(pkg.version);

program
  .command("convert", { isDefault: true })
  .description("Convert a Markdown file to PDF.")
  .argument("<input>", "Path to the input Markdown file")
  .argument("<output>", "Path where the PDF should be written")
  .option("--title <title>", "Document title (overrides frontmatter)")
  .option("--subtitle <subtitle>", "Subtitle / deck under the title")
  .option("--section <section>", "Kicker above the title, e.g. LESSON 03")
  .option("--author <author>", "Document author (overrides frontmatter)")
  .option("--date <date>", "Document date (overrides frontmatter)")
  .option("--reading-time <time>", "Reading time, e.g. '14 min'")
  .option("--page-size <size>", "Page size: Letter or A4", parsePageSize)
  .option("--margin-top <size>", "Top margin (CSS length)", parseCssLength)
  .option("--margin-right <size>", "Right margin (CSS length)", parseCssLength)
  .option("--margin-bottom <size>", "Bottom margin (CSS length)", parseCssLength)
  .option("--margin-left <size>", "Left margin (CSS length)", parseCssLength)
  .option("--no-header", "Hide the running header")
  .option("--no-footer", "Hide the running footer")
  .option("--no-cover", "Skip the dedicated cover page (title block goes inline)")
  .action(async (input: string, output: string, opts: OptionValues, cmd: Command) => {
    try {
      const cli = cliOptionsToLayer(opts, cmd);
      await convertMarkdownToPdf({ inputPath: input, outputPath: output, cli });
      console.log(`Wrote ${output}`);
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  });

program.parseAsync();

function cliOptionsToLayer(opts: OptionValues, cmd: Command): DocumentOptionsLayer {
  const layer: DocumentOptionsLayer = {};
  if (typeof opts.title === "string") layer.title = opts.title;
  if (typeof opts.subtitle === "string") layer.subtitle = opts.subtitle;
  if (typeof opts.section === "string") layer.section = opts.section;
  if (typeof opts.author === "string") layer.author = opts.author;
  if (typeof opts.date === "string") layer.date = opts.date;
  if (typeof opts.readingTime === "string") layer.readingTime = opts.readingTime;
  if (typeof opts.pageSize === "string") layer.pageSize = opts.pageSize as "Letter" | "A4";

  if (cmd.getOptionValueSource("header") === "cli") {
    layer.showHeader = Boolean(opts.header);
  }
  if (cmd.getOptionValueSource("footer") === "cli") {
    layer.showFooter = Boolean(opts.footer);
  }
  if (cmd.getOptionValueSource("cover") === "cli") {
    layer.showCover = Boolean(opts.cover);
  }

  const margins: Partial<Margins> = {};
  if (typeof opts.marginTop === "string") margins.top = opts.marginTop;
  if (typeof opts.marginRight === "string") margins.right = opts.marginRight;
  if (typeof opts.marginBottom === "string") margins.bottom = opts.marginBottom;
  if (typeof opts.marginLeft === "string") margins.left = opts.marginLeft;
  if (Object.keys(margins).length > 0) layer.margins = margins;

  return layer;
}

function parsePageSize(value: string): "Letter" | "A4" {
  if (value === "Letter" || value === "A4") return value;
  throw new InvalidArgumentError(`expected "Letter" or "A4", got "${value}".`);
}

function parseCssLength(value: string): string {
  if (!/^\d*\.?\d+(in|cm|mm|pt|px)$/.test(value)) {
    throw new InvalidArgumentError(`expected a CSS length like "0.85in" or "20mm", got "${value}".`);
  }
  return value;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}
