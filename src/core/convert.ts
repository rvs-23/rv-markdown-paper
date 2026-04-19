import { readFile, mkdir } from "node:fs/promises";
import { basename, dirname, extname, resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Root as MdastRoot } from "mdast";
import { parseMarkdownToMdast, mdastToHtml } from "../parser/parseMarkdown.js";
import { extractFrontmatter } from "../parser/frontmatter.js";
import { wrapInDocumentShell, wrapCoverInShell } from "../html/documentShell.js";
import { renderHtmlToPdf } from "../pdf/renderPdf.js";
import { loadProjectConfig, resolveOptions } from "../config/resolve.js";
import type { DocumentOptionsLayer } from "../config/options.js";
import { estimateReadingTime } from "./readingTime.js";

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
  const explicitTitle = resolved.title;
  const title = explicitTitle ?? deriveTitle(inputAbsolute);
  // Avoid printing the title twice: if an explicit title was provided and the
  // body opens with an H1 that matches it, drop the H1 so the editorial title
  // block is the only one.
  if (explicitTitle) stripRedundantLeadingH1(tree, explicitTitle);
  const htmlBody = await mdastToHtml(tree);

  const baseUrl = pathToFileURL(inputDir + "/").href;
  // The title block is only emitted when the user supplied a real title —
  // otherwise we'd print the filename and an orphan sigrule. When showCover
  // is on AND there's an explicit title, we render the title block as its own
  // cover PDF (rendered separately so Playwright's header/footer can be off
  // for it) and prepend it to the body PDF; otherwise it sits inline at the
  // top of the body.
  const titleBlockFields = explicitTitle
    ? {
        title: explicitTitle,
        subtitle: resolved.subtitle,
        section: resolved.section,
        author: resolved.author,
        date: resolved.date,
        readingTime: resolved.readingTime ?? estimateReadingTime(tree),
      }
    : undefined;
  const useCover = resolved.showCover && titleBlockFields !== undefined;
  const html = wrapInDocumentShell(htmlBody, {
    title,
    baseUrl,
    titleBlock: !useCover ? titleBlockFields : undefined,
  });
  const coverHtml = useCover
    ? wrapCoverInShell({ baseUrl, cover: titleBlockFields! })
    : undefined;

  await mkdir(dirname(outputAbsolute), { recursive: true });
  await renderHtmlToPdf({
    html,
    coverHtml,
    outputPath: outputAbsolute,
    pageSize: resolved.pageSize,
    margins: resolved.margins,
    showHeader: resolved.showHeader,
    showFooter: resolved.showFooter,
    metadata: {
      title: explicitTitle,
      section: resolved.section,
      author: resolved.author,
      date: resolved.date,
    },
  });
}

function stripRedundantLeadingH1(tree: MdastRoot, title: string): void {
  const first = tree.children[0];
  if (!first || first.type !== "heading" || first.depth !== 1) return;
  if (normalize(mdastToString(first)) !== normalize(title)) return;
  tree.children.shift();
}

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function deriveTitle(filePath: string): string {
  return basename(filePath, extname(filePath));
}
