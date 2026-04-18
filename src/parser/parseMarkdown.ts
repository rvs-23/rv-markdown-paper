import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import type { Root as MdastRoot } from "mdast";
import type { ShikiTransformer } from "shiki";
import { buildShikiTheme } from "../themes/shikiTheme.js";
import remarkCallouts from "../transform/remarkCallouts.js";
import type { Accent, PaperTone } from "../config/options.js";

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

export function parseMarkdownToMdast(markdown: string): MdastRoot {
  return parser.parse(markdown);
}

export async function mdastToHtml(
  tree: MdastRoot,
  options: { paperTone: PaperTone; accent: Accent },
): Promise<string> {
  const renderer = unified()
    .use(remarkCallouts)
    .use(remarkRehype)
    .use(rehypeShiki, {
      theme: buildShikiTheme(options.paperTone, options.accent),
      fallbackLanguage: "plaintext",
      transformers: [languageAttrTransformer],
    })
    .use(rehypeStringify);

  const hast = await renderer.run(tree);
  return renderer.stringify(hast);
}
