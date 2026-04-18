import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import type { Root as MdastRoot } from "mdast";
import { grayscaleShikiTheme } from "../themes/grayscaleShikiTheme.js";

const parser = unified().use(remarkParse).use(remarkGfm);

const renderer = unified()
  .use(remarkRehype)
  .use(rehypeShiki, { theme: grayscaleShikiTheme, fallbackLanguage: "plaintext" })
  .use(rehypeStringify);

export function parseMarkdownToMdast(markdown: string): MdastRoot {
  return parser.parse(markdown);
}

export async function mdastToHtml(tree: MdastRoot): Promise<string> {
  const hast = await renderer.run(tree);
  return renderer.stringify(hast);
}
