#!/usr/bin/env node
import { Command, InvalidArgumentError, type OptionValues } from "commander";
import { convertMarkdownToPdf } from "../core/convert.js";
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
} from "../config/options.js";

const program = new Command();

program
  .name("mdpdf")
  .description("Convert Markdown to a beautiful PDF.")
  .version("0.1.0");

program
  .command("convert", { isDefault: true })
  .description("Convert a Markdown file to PDF.")
  .argument("<input>", "Path to the input Markdown file")
  .argument("<output>", "Path where the PDF should be written")
  .option("--title <title>", "Document title (overrides frontmatter)")
  .option("--author <author>", "Document author (overrides frontmatter)")
  .option("--date <date>", "Document date (overrides frontmatter)")
  .option("--page-size <size>", "Page size: Letter or A4", parsePageSize)
  .option("--margin-top <size>", "Top margin (CSS length)", parseCssLength)
  .option("--margin-right <size>", "Right margin (CSS length)", parseCssLength)
  .option("--margin-bottom <size>", "Bottom margin (CSS length)", parseCssLength)
  .option("--margin-left <size>", "Left margin (CSS length)", parseCssLength)
  .option("--no-header", "Hide the running header")
  .option("--no-footer", "Hide the running footer")
  .option("--paper-tone <tone>", `Paper tone: ${PAPER_TONES.join(" | ")}`, parseEnum(PAPER_TONES, "paper-tone"))
  .option("--accent <accent>", `Accent: ${ACCENTS.join(" | ")}`, parseEnum(ACCENTS, "accent"))
  .option("--body-font <font>", `Body font: ${BODY_FONTS.join(" | ")}`, parseEnum(BODY_FONTS, "body-font"))
  .option("--heading-font <font>", `Heading font: ${HEADING_FONTS.join(" | ")}`, parseEnum(HEADING_FONTS, "heading-font"))
  .option("--density <density>", `Density: ${DENSITIES.join(" | ")}`, parseEnum(DENSITIES, "density"))
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
  if (typeof opts.author === "string") layer.author = opts.author;
  if (typeof opts.date === "string") layer.date = opts.date;
  if (typeof opts.pageSize === "string") layer.pageSize = opts.pageSize as "Letter" | "A4";

  if (cmd.getOptionValueSource("header") === "cli") {
    layer.showHeader = Boolean(opts.header);
  }
  if (cmd.getOptionValueSource("footer") === "cli") {
    layer.showFooter = Boolean(opts.footer);
  }

  const margins: Partial<Margins> = {};
  if (typeof opts.marginTop === "string") margins.top = opts.marginTop;
  if (typeof opts.marginRight === "string") margins.right = opts.marginRight;
  if (typeof opts.marginBottom === "string") margins.bottom = opts.marginBottom;
  if (typeof opts.marginLeft === "string") margins.left = opts.marginLeft;
  if (Object.keys(margins).length > 0) layer.margins = margins;

  const theme: ThemeLayer = {};
  if (typeof opts.paperTone === "string") theme.paperTone = opts.paperTone as PaperTone;
  if (typeof opts.accent === "string") theme.accent = opts.accent as Accent;
  if (typeof opts.bodyFont === "string") theme.bodyFont = opts.bodyFont as BodyFont;
  if (typeof opts.headingFont === "string") theme.headingFont = opts.headingFont as HeadingFont;
  if (typeof opts.density === "string") theme.density = opts.density as Density;
  if (Object.keys(theme).length > 0) layer.theme = theme;

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

function parseEnum<T extends string>(allowed: readonly T[], flag: string): (value: string) => T {
  return (value: string): T => {
    if ((allowed as readonly string[]).includes(value)) return value as T;
    const options = allowed.map((s) => `"${s}"`).join(" or ");
    throw new InvalidArgumentError(`--${flag} expected ${options}, got "${value}".`);
  };
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}
