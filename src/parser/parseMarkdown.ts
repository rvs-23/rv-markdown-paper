import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import type { Root as MdastRoot } from "mdast";

const parser = unified().use(remarkParse);
const renderer = unified().use(remarkRehype).use(rehypeStringify);

export function parseMarkdownToMdast(markdown: string): MdastRoot {
  return parser.parse(markdown);
}

export async function mdastToHtml(tree: MdastRoot): Promise<string> {
  const hast = await renderer.run(tree);
  return renderer.stringify(hast);
}
