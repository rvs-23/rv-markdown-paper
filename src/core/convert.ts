import { readFile, mkdir } from "node:fs/promises";
import { basename, dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseMarkdownToMdast, mdastToHtml } from "../parser/parseMarkdown.js";
import { wrapInDocumentShell } from "../html/documentShell.js";
import { renderHtmlToPdf } from "../pdf/renderPdf.js";

export type ConvertOptions = {
  inputPath: string;
  outputPath: string;
  pageSize?: "Letter" | "A4";
};

export async function convertMarkdownToPdf(options: ConvertOptions): Promise<void> {
  const inputAbsolute = resolve(options.inputPath);
  const outputAbsolute = resolve(options.outputPath);
  const inputDir = dirname(inputAbsolute);

  const markdown = await readFile(inputAbsolute, "utf8");
  const tree = parseMarkdownToMdast(markdown);
  const htmlBody = await mdastToHtml(tree);

  const title = deriveTitle(inputAbsolute);
  const baseUrl = pathToFileURL(inputDir + "/").href;
  const html = wrapInDocumentShell(htmlBody, { title, baseUrl });

  await mkdir(dirname(outputAbsolute), { recursive: true });
  await renderHtmlToPdf({ html, outputPath: outputAbsolute, pageSize: options.pageSize });
}

function deriveTitle(filePath: string): string {
  return basename(filePath, extname(filePath));
}
