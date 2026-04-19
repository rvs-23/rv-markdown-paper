import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root as MdastRoot } from "mdast";

const parser = unified().use(remarkParse).use(remarkGfm);

export function parseMarkdownToMdast(markdown: string): MdastRoot {
  return parser.parse(markdown);
}
