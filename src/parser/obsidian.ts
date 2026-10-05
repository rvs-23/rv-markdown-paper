import type { Blockquote, Image, Paragraph, PhrasingContent, Root, RootContent, Text } from "mdast";

// Obsidian writes a few things its own way. This pass rewrites them into
// nodes the generator already understands, so a note taken straight from
// a vault renders without its syntax showing:
//
//   > [!tip] Title        → the `tip` callout (as `:::tip`)
//   [[Page|Alias]]        → "Alias" (a PDF has nowhere to link a note)
//   ![[figure.png]]       → an image
//   ==highlight==         → a `highlight` node
//   %%comment%%, ^block   → removed, as Obsidian hides them
//
// Only text nodes are read, so code and math are never touched.

/** `==text==`, set with a grey marker so the page keeps one ink. */
export interface Highlight {
  type: "highlight";
  children: PhrasingContent[];
}

declare module "mdast" {
  interface PhrasingContentMap {
    highlight: Highlight;
  }
  interface RootContentMap {
    highlight: Highlight;
  }
}

// Obsidian's callout types, folded onto the four callouts the design has.
// Anything unlisted becomes a note.
const CALLOUT_KIND: Record<string, string> = {
  tip: "tip", hint: "tip", important: "tip", success: "tip", check: "tip", done: "tip",
  warning: "warning", caution: "warning", attention: "warning", question: "warning",
  help: "warning", faq: "warning",
  danger: "danger", error: "danger", bug: "danger", failure: "danger", fail: "danger",
  missing: "danger",
};

const CALLOUT_RE = /^\[!([A-Za-z-]+)\][+-]?[ \t]*/;
const IMAGE_EXT_RE = /\.(png|jpe?g|gif|svg|webp)$/i;
// ![[target|options]] or [[target|alias]]; the target may carry #heading or ^block.
const WIKI_RE = /(!?)\[\[([^[\]|\n]+)(?:\|([^[\]\n]*))?\]\]/g;

type Parent = { children: unknown[] };

/**
 * Rewrites Obsidian-only syntax in a parsed document, in place.
 *
 * Args:
 *   tree: The mdast root.
 */
export function liftObsidianSyntax(tree: Root): void {
  walk(tree as unknown as Parent);
}

function walk(parent: Parent): void {
  const children = parent.children as RootContent[];
  for (let i = 0; i < children.length; i++) {
    const node = children[i]!;
    if (node.type === "blockquote") {
      const callout = toCallout(node);
      if (callout) children[i] = callout as unknown as RootContent;
    }
    const current = children[i]! as unknown as { type: string; children?: unknown[] };
    if (current.type === "code" || current.type === "inlineCode" || !Array.isArray(current.children)) {
      continue;
    }
    if (current.type === "paragraph") stripBlockId(current as unknown as Paragraph);
    walk(current as Parent);
    if (current.children.some((c) => (c as { type: string }).type === "text")) {
      current.children = liftInline(current.children as PhrasingContent[]);
    }
  }
}

// `> [!tip] Title` plus its body becomes the container directive the
// generator renders as a callout. The title, if any, leads the body in bold.
function toCallout(quote: Blockquote): unknown | null {
  const first = quote.children[0];
  if (first?.type !== "paragraph") return null;
  const lead = first.children[0];
  if (lead?.type !== "text") return null;
  const match = CALLOUT_RE.exec(lead.value);
  if (!match) return null;
  lead.value = lead.value.slice(match[0].length);

  // The title runs to the first line break; the rest of the paragraph is body.
  const title: PhrasingContent[] = [];
  const body: PhrasingContent[] = [];
  let inBody = false;
  for (const child of first.children) {
    if (!inBody && child.type === "text" && child.value.includes("\n")) {
      const at = child.value.indexOf("\n");
      if (at > 0) title.push({ type: "text", value: child.value.slice(0, at) });
      const rest = child.value.slice(at + 1);
      if (rest !== "") body.push({ type: "text", value: rest });
      inBody = true;
    } else if (!(child.type === "text" && child.value === "")) {
      (inBody ? body : title).push(child);
    }
  }

  const children: RootContent[] = [];
  if (title.length > 0) {
    children.push({ type: "paragraph", children: [{ type: "strong", children: title }] });
  }
  if (body.length > 0) children.push({ type: "paragraph", children: body });
  children.push(...quote.children.slice(1));
  return {
    type: "containerDirective",
    name: CALLOUT_KIND[match[1]!.toLowerCase()] ?? "note",
    children,
  };
}

// A trailing ` ^block-id` marks a paragraph for linking; Obsidian hides it.
function stripBlockId(paragraph: Paragraph): void {
  const last = paragraph.children.at(-1);
  if (last?.type === "text") last.value = last.value.replace(/\s+\^[A-Za-z0-9-]+\s*$/, "");
}

function liftInline(nodes: PhrasingContent[]): PhrasingContent[] {
  const withLinks = nodes.flatMap((node) => (node.type === "text" ? liftWikiLinks(node) : [node]));
  return liftHighlights(withLinks);
}

// Comments vanish; embeds of image files become images; every other
// wikilink becomes its display text.
function liftWikiLinks(node: Text): PhrasingContent[] {
  const value = node.value.replace(/%%[\s\S]*?%%/g, "");
  const out: PhrasingContent[] = [];
  let last = 0;
  for (const match of value.matchAll(WIKI_RE)) {
    const [whole, bang, rawTarget, alias] = match;
    const target = rawTarget!.trim();
    out.push({ type: "text", value: value.slice(last, match.index) });
    if (bang && IMAGE_EXT_RE.test(target)) {
      // The part after `|` is a display size in Obsidian (`300` or
      // `300x200`, in pixels), not a caption.
      const image: Image = { type: "image", url: target, alt: "" };
      const size = /^\s*(\d+)(?:x(\d+))?\s*$/.exec(alias ?? "");
      (image as { data?: Record<string, unknown> }).data = {
        obsidianEmbed: true,
        ...(size && { size: { width: size[1], height: size[2] } }),
      };
      out.push(image);
    } else {
      out.push({ type: "text", value: alias?.trim() || displayName(target) });
    }
    last = match.index + whole.length;
  }
  out.push({ type: "text", value: value.slice(last) });
  return out.filter((n) => !(n.type === "text" && n.value === ""));
}

// "Folder/Note#Heading" reads as "Note › Heading"; "#Heading" as "Heading".
function displayName(target: string): string {
  const [page = "", ...rest] = target.split(/[#^]/);
  const name = page.split("/").at(-1)!.trim();
  const section = target.includes("#") ? rest[0]?.trim() : undefined;
  return [name, section].filter(Boolean).join(" › ");
}

// Pair `==` markers across sibling nodes, since a highlight can wrap other
// markup. Following Obsidian, an opening marker must be followed by a
// non-space and a closing one preceded by a non-space, so `a == b` in
// prose is left alone. An unclosed marker stays literal.
function liftHighlights(nodes: PhrasingContent[]): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  let open: PhrasingContent[] | null = null;
  const push = (node: PhrasingContent) => (open ?? out).push(node);

  for (const node of nodes) {
    if (node.type !== "text") {
      push(node);
      continue;
    }
    let text = node.value;
    while (text !== "") {
      const at = open ? text.search(/(?<=\S)==|^==/) : text.search(/==(?=\S)|==$/);
      if (at < 0) break;
      if (at > 0) push({ type: "text", value: text.slice(0, at) });
      text = text.slice(at + 2);
      if (open) {
        out.push({ type: "highlight", children: open });
        open = null;
      } else {
        open = [];
      }
    }
    if (text !== "") push({ type: "text", value: text });
  }
  if (open) out.push({ type: "text", value: "==" }, ...open);
  return mergeText(out);
}

// Splitting leaves runs of adjacent text nodes; join them back so the
// generator sees the same text it would have without this pass.
function mergeText(nodes: PhrasingContent[]): PhrasingContent[] {
  const out: PhrasingContent[] = [];
  for (const node of nodes) {
    const prev = out.at(-1);
    if (node.type === "text" && prev?.type === "text") prev.value += node.value;
    else out.push(node);
  }
  return out;
}
