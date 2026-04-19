import type { Root, Paragraph, Image, Strong } from "mdast";
import type { Plugin } from "unified";

// Promote standalone image paragraphs to <figure> + <figcaption>. A paragraph
// qualifies when its only child is a single image node — the same convention
// CommonMark-era tools (pandoc, markdown-it-implicit-figures) have used for
// years. The image's alt text becomes the caption; if the alt is empty, we
// emit a figure without a caption so decorative images still render cleanly.
//
// We reuse the mdast "paragraph" node and override its HTML name to "figure",
// which lets remark-rehype carry the single-image child through untouched.
const remarkFigures: Plugin<[], Root> = () => {
  return (tree) => {
    for (const node of tree.children) {
      if (node.type !== "paragraph") continue;
      const para = node as Paragraph;
      if (para.children.length !== 1) continue;
      const only = para.children[0];
      if (!only || only.type !== "image") continue;
      const image = only as Image;

      para.data = {
        ...(para.data ?? {}),
        hName: "figure",
        hProperties: { className: ["figure"] },
      };

      const alt = (image.alt ?? "").trim();
      if (alt.length === 0) continue;

      // Push a caption as a sibling of the image. We reuse the mdast
      // "strong" node type (which is phrasing content, so TypeScript and
      // mdast agree it belongs in a paragraph's children) and override its
      // hName so remark-rehype emits <figcaption> instead of <strong>.
      // Figcaption isn't phrasing in HTML, but the browser accepts it fine
      // inside a <figure>, and this keeps us inside the mdast type system
      // without resorting to manual hast construction.
      const caption: Strong = {
        type: "strong",
        data: {
          hName: "figcaption",
          hProperties: { className: ["figure__caption"] },
        },
        children: [{ type: "text", value: alt }],
      };
      para.children.push(caption);
    }
  };
};

export default remarkFigures;
