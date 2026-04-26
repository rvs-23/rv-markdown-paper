import { readFile, mkdir } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";
import { toString as mdastToString } from "mdast-util-to-string";
import type { Root as MdastRoot } from "mdast";
import { parseMarkdownToMdast } from "../parser/parseMarkdown.js";
import { extractFrontmatter } from "../parser/frontmatter.js";
import { loadProjectConfig, resolveOptions } from "../config/resolve.js";
import type { DocumentOptions, DocumentOptionsLayer } from "../config/options.js";
import { estimateReadingTime } from "./readingTime.js";
import { generateTypst } from "../typst/generate.js";
import { renderTypstToPdf } from "../typst/render.js";

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
  if (resolved.title) stripRedundantLeadingH1(tree, resolved.title);

  // The template only renders the editorial title block when `title` is set,
  // so an untitled file stays clean — no orphan sigrule, no filename posing
  // as a title.
  const templateOptions: DocumentOptions = {
    ...resolved,
    readingTime:
      resolved.readingTime ?? (resolved.title ? estimateReadingTime(tree) : undefined),
  };

  const body = generateTypst(tree, { sourceDir: inputDir });

  await mkdir(dirname(outputAbsolute), { recursive: true });
  await renderTypstToPdf({
    body,
    outputPath: outputAbsolute,
    options: templateOptions,
    sourceDir: inputDir,
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
