import { readFile, mkdir } from "node:fs/promises";
import { basename, dirname, extname, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { parseMarkdownToMdast, mdastToHtml } from "../parser/parseMarkdown.js";
import { extractFrontmatter } from "../parser/frontmatter.js";
import { wrapInDocumentShell } from "../html/documentShell.js";
import { renderHtmlToPdf } from "../pdf/renderPdf.js";
import { loadProjectConfig, resolveOptions } from "../config/resolve.js";
import type { DocumentOptionsLayer } from "../config/options.js";

export type ConvertOptions = {
  inputPath: string;
  outputPath: string;
  cli?: DocumentOptionsLayer;
};

export async function convertMarkdownToPdf(options: ConvertOptions): Promise<void> {
  const inputAbsolute = resolvePath(options.inputPath);
  const outputAbsolute = resolvePath(options.outputPath);
  const inputDir = dirname(inputAbsolute);

  const raw = await readFile(inputAbsolute, "utf8");
  const { content, frontmatter } = extractFrontmatter(raw);
  const project = loadProjectConfig(inputDir);

  const resolved = resolveOptions({
    cli: options.cli ?? {},
    frontmatter,
    project,
  });

  const tree = parseMarkdownToMdast(content);
  const htmlBody = await mdastToHtml(tree, {
    paperTone: resolved.theme.paperTone,
    accent: resolved.theme.accent,
  });

  const title = resolved.title ?? deriveTitle(inputAbsolute);
  const baseUrl = pathToFileURL(inputDir + "/").href;
  const html = wrapInDocumentShell(htmlBody, { title, baseUrl, theme: resolved.theme });

  await mkdir(dirname(outputAbsolute), { recursive: true });
  await renderHtmlToPdf({
    html,
    outputPath: outputAbsolute,
    pageSize: resolved.pageSize,
    margins: resolved.margins,
    showHeader: resolved.showHeader,
    showFooter: resolved.showFooter,
    metadata: { title, author: resolved.author, date: resolved.date },
    theme: resolved.theme,
  });
}

function deriveTitle(filePath: string): string {
  return basename(filePath, extname(filePath));
}
