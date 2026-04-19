import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkSmartypants from "remark-smartypants";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import type { Root as MdastRoot } from "mdast";
import type { ShikiTransformer } from "shiki";
import { shikiTheme } from "../themes/shikiTheme.js";
import remarkCallouts from "../transform/remarkCallouts.js";
import remarkFigures from "../transform/remarkFigures.js";

const languageAttrTransformer: ShikiTransformer = {
  name: "rv-language-attr",
  pre(node) {
    const lang = this.options.lang;
    if (lang) {
      node.properties = node.properties ?? {};
      node.properties["data-language"] = lang;
    }
  },
};

const parser = unified().use(remarkParse).use(remarkGfm);

const renderer = unified()
  .use(remarkSmartypants, { quotes: true, dashes: "oldschool", ellipses: true })
  .use(remarkCallouts)
  .use(remarkFigures)
  .use(remarkRehype)
  .use(rehypeSlug)
  // Wrap heading text in an anchor to its own id — inherits color and has no
  // underline via CSS, so the heading looks identical but becomes clickable
  // in the PDF. The slugs are also what the Week 7 TOC will point at.
  .use(rehypeAutolinkHeadings, { behavior: "wrap" })
  .use(rehypeShiki, {
    theme: shikiTheme,
    fallbackLanguage: "plaintext",
    transformers: [languageAttrTransformer],
  })
  .use(rehypeStringify);

export function parseMarkdownToMdast(markdown: string): MdastRoot {
  return parser.parse(markdown);
}

export async function mdastToHtml(tree: MdastRoot): Promise<string> {
  const hast = await renderer.run(tree);
  return renderer.stringify(hast);
}
