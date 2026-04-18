import { visit } from "unist-util-visit";
import type { Root, Blockquote, Paragraph, Text } from "mdast";
import type { Plugin } from "unified";

const MARKER_RE = /^\[!(NOTE|WARN|SYSTEM)\]\s*/;

const remarkCallouts: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "blockquote", (node: Blockquote) => {
      const firstPara = node.children[0];
      if (!firstPara || firstPara.type !== "paragraph") return;
      const firstChild = firstPara.children[0];
      if (!firstChild || firstChild.type !== "text") return;
      const firstText = firstChild as Text;
      const match = firstText.value.match(MARKER_RE);
      if (!match) return;

      const type = match[1]!.toLowerCase();
      firstText.value = firstText.value.replace(MARKER_RE, "");
      if (firstText.value === "") {
        firstPara.children.shift();
        if (firstPara.children.length === 0) {
          node.children.shift();
        }
      }

      node.data = {
        ...(node.data ?? {}),
        hName: "div",
        hProperties: {
          className: ["callout", `callout--${type}`],
        },
      };

      const labelPara: Paragraph = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: { className: ["callout__label"] },
        },
        children: [{ type: "text", value: type.toUpperCase() }],
      };
      node.children.unshift(labelPara);
    });
  };
};

export default remarkCallouts;
