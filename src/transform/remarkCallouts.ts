import { visit } from "unist-util-visit";
import type { Root, Blockquote, Text, Strong } from "mdast";
import type { Plugin } from "unified";

const MARKER_RE = /^\[!(NOTE|WARN|SYSTEM)\]\s*/;

// Rewrite `> [!NOTE]\n> text...` blockquotes into run-in callouts:
//
//   <div class="callout callout--note">
//     <p><span class="callout__tag">NOTE.</span> text...</p>
//   </div>
//
// The tag lives inline inside the first paragraph (print-manual style),
// not as a separate block label above the content.
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

      const tag: Strong = {
        type: "strong",
        data: {
          hName: "span",
          hProperties: { className: ["callout__tag"] },
        },
        children: [{ type: "text", value: `${type.toUpperCase()}.` }],
      };

      const target = node.children[0];
      if (target && target.type === "paragraph") {
        target.children.unshift(tag, { type: "text", value: " " });
      } else {
        // No paragraph left — insert a fresh one so the tag still appears.
        node.children.unshift({
          type: "paragraph",
          children: [tag],
        });
      }
    });
  };
};

export default remarkCallouts;
