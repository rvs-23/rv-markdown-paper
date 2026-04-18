#!/usr/bin/env node
import { Command } from "commander";
import { convertMarkdownToPdf } from "../core/convert.js";

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
  .action(async (input: string, output: string) => {
    try {
      await convertMarkdownToPdf({ inputPath: input, outputPath: output });
      console.log(`Wrote ${output}`);
    } catch (error) {
      console.error(formatError(error));
      process.exit(1);
    }
  });

program.parseAsync();

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  return `Error: ${String(error)}`;
}
