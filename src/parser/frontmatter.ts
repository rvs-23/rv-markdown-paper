import matter from "gray-matter";
import { validateOptions } from "../config/validate.js";
import type { DocumentOptionsLayer } from "../config/options.js";

export type ParsedMarkdown = {
  content: string;
  frontmatter: DocumentOptionsLayer;
};

export function extractFrontmatter(markdown: string): ParsedMarkdown {
  let parsed;
  try {
    parsed = matter(markdown);
  } catch (err) {
    throw new Error(`Invalid frontmatter YAML: ${(err as Error).message}`);
  }
  const frontmatter = validateOptions(parsed.data, "frontmatter");
  return { content: parsed.content, frontmatter };
}
