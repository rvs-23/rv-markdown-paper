import { unified, type Processor } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkDefinitionList from "remark-definition-list";
import type { Definition, Image, Link, Nodes, Root as MdastRoot } from "mdast";
import { extractAttributes } from "./attributes.js";
import { liftBracketedSpans } from "./spans.js";
import { liftObsidianSyntax, stripComments } from "./obsidian.js";

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDirective)
  .use(withoutInlineDirectives)
  .use(remarkMath)
  .use(remarkDefinitionList);

// remark-directive also parses an inline form, `:name[label]{attrs}`. Nothing
// here uses it, and it eats ordinary text: `5:45` parses as a directive
// named "45", so the time printed as `5`. Only the `:::` and `::` block
// forms stay.
const COLON = 58;
type Constructs = Record<number, unknown>;

function withoutInlineDirectives(this: Processor): void {
  const extensions = (this.data("micromarkExtensions") ?? []) as { flow?: Constructs; text?: Constructs }[];
  for (const extension of extensions) {
    if (extension.flow?.[COLON] && extension.text?.[COLON]) delete extension.text[COLON];
  }
}

export function parseMarkdownToMdast(markdown: string): MdastRoot {
  const normalized = normalizeDirectiveOpeners(stripComments(markdown));
  const tree = parser.parse(normalized) as MdastRoot;
  // Spans first, so a heading ending in `[x]{.muted}` keeps its span rather
  // than handing `{.muted}` to the heading. Positions index the normalized
  // source.
  liftBracketedSpans(tree, normalized);
  // After spans, which need the parser's source positions on text nodes.
  liftObsidianSyntax(tree);
  resolveReferences(tree);
  extractAttributes(tree);
  return tree;
}

// Reference-style links and images (`[text][ref]`, `[ref]`, `![alt][ref]`
// with a `[ref]: url` definition elsewhere) become the inline link or
// image they stand for, so everything downstream — figures, image path
// checks, in-document links — handles them with no special case. remark
// only creates a reference when its definition exists; the definitions
// themselves render nothing and are dropped.
function resolveReferences(tree: MdastRoot): void {
  const definitions = new Map<string, Definition>();
  const collect = (node: Nodes): void => {
    if (node.type === "definition") definitions.set(node.identifier, node);
    if ("children" in node) node.children.forEach(collect);
  };
  collect(tree);

  const rewrite = (node: Nodes): void => {
    if (!("children" in node)) return;
    const children = node.children as Nodes[];
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]!;
      if (child.type === "definition") {
        children.splice(i, 1);
        continue;
      }
      if (child.type === "linkReference" || child.type === "imageReference") {
        const def = definitions.get(child.identifier);
        if (!def) continue;
        const { url, title } = def;
        children[i] =
          child.type === "linkReference"
            ? ({ type: "link", url, title, children: child.children, position: child.position } as Link)
            : ({ type: "image", url, title, alt: child.alt, position: child.position } as Image);
      }
      rewrite(children[i]!);
    }
  };
  rewrite(tree);
}

// Pandoc fenced divs accept two surface forms the directive plugin rejects:
//   `::: eyebrow`            — space between fence and name
//   `::: {.classname k="v"}` — class-only shorthand, no explicit name
// Normalize both into remark-directive's form (`:::name{key="v"}`).
function normalizeDirectiveOpeners(markdown: string): string {
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const fenceMatch = line.match(/^(:{3,})[ \t]*(.*)$/);
    if (!fenceMatch) continue;
    const [, fence, rest] = fenceMatch;
    const trimmed = rest!.trim();
    if (trimmed === "") continue; // closing fence — leave it
    // Class-shorthand: `{.name ...}` becomes `name{...}`.
    const shorthand = trimmed.match(/^\{\s*\.([A-Za-z][\w-]*)\s*(.*)\}$/);
    if (shorthand) {
      const [, name, rest2] = shorthand;
      const attrs = rest2!.trim();
      lines[i] = attrs === "" ? `${fence}${name}` : `${fence}${name}{${attrs}}`;
      continue;
    }
    // Plain name (possibly followed by attribute block): flush the space.
    lines[i] = `${fence}${trimmed}`;
  }
  return lines.join("\n");
}
