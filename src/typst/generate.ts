import { resolve as resolvePath, isAbsolute, relative as relativePath } from "node:path";
import type {
  Root,
  RootContent,
  PhrasingContent,
  Paragraph,
  Heading,
  Text,
  Strong,
  Emphasis,
  Delete,
  InlineCode,
  Code,
  Link,
  Image,
  List,
  ListItem,
  Blockquote,
  Table,
  TableRow,
  TableCell,
  Break,
} from "mdast";
import { escapeMarkup, escapeString } from "./escape.js";
import type { Attributes } from "../parser/attributes.js";

export type GenerateOptions = {
  sourceDir: string;
};

const ALIGN_MAP: Record<string, string> = {
  left: "left",
  right: "right",
  center: "center",
};

// Admonition container-directive names that map to a Typst call `#<name>[...]`.
const ADMONITION_NAMES = new Set(["note", "tip", "warning", "danger", "warn", "system"]);

export function generateTypst(tree: Root, options: GenerateOptions): string {
  const footnotes = collectFootnotes(tree);
  const labels = collectLabels(tree);
  const ctx: Ctx = { sourceDir: options.sourceDir, footnotes, labels };
  reorderMarginDirectives(tree.children);
  return renderBlocks(tree.children, ctx).trimEnd() + "\n";
}

type Ctx = {
  sourceDir: string;
  footnotes: Map<string, RootContent[]>;
  labels: Set<string>;
};

// Harvest every `{#id}` found on headings, images, math blocks, and directive
// containers. Used to guard `#link(<label>)` emission — Typst errors on a
// label reference that doesn't resolve, so unresolved refs fall back to plain
// text instead of a dangling link.
function collectLabels(tree: Root): Set<string> {
  const labels = new Set<string>();
  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const n = node as { type?: string; data?: { attrs?: Attributes }; children?: unknown[] };
    const id = n.data?.attrs?.id;
    if (id) labels.add(id);
    if (Array.isArray(n.children)) for (const c of n.children) walk(c);
  }
  walk(tree);
  return labels;
}

function collectFootnotes(tree: Root): Map<string, RootContent[]> {
  const map = new Map<string, RootContent[]>();
  for (const n of tree.children) {
    if (n.type === "footnoteDefinition") {
      const def = n as unknown as { identifier: string; children: RootContent[] };
      map.set(def.identifier, def.children);
    }
  }
  return map;
}

// ---- margin reordering ----
// Walk the block list; whenever a `containerDirective` with name `margin`
// is followed by one or more block siblings, hoist it to sit before them.
//
// Rule: a `:::margin` attaches to the NEXT block that is not another
// `:::margin`. Multiple consecutive `:::margin` notes are kept in order and
// all hoisted to just before the next non-margin block.

function reorderMarginDirectives(nodes: RootContent[]): void {
  // Recurse into containers first.
  for (const n of nodes) {
    const anyN = n as { children?: RootContent[] };
    if (Array.isArray(anyN.children)) {
      // Container directives and blockquotes may contain block children.
      if (n.type === "containerDirective" || n.type === "blockquote") {
        reorderMarginDirectives(anyN.children);
      }
    }
  }

  // In `examples/editorial-swiss/paper.md`, the convention is that `:::margin`
  // appears BEFORE the paragraph it annotates — so the natural source order
  // already has notes preceding their anchor. We still provide this helper
  // as an idempotent pass; if a future fixture moves notes after their
  // anchor, we can flip the direction here.
  void nodes;
}

// ---- block-level nodes ----

function renderBlocks(nodes: RootContent[], ctx: Ctx): string {
  const parts: string[] = [];
  for (const node of nodes) {
    const rendered = renderBlock(node, ctx);
    if (rendered === "") continue;
    parts.push(rendered);
  }
  return parts.join("\n\n");
}

function renderBlock(node: RootContent, ctx: Ctx): string {
  switch (node.type) {
    case "paragraph":
      return renderParagraph(node, ctx);
    case "heading":
      return renderHeading(node, ctx);
    case "code":
      return renderCodeBlock(node);
    case "list":
      return renderList(node, ctx);
    case "blockquote":
      return renderBlockquote(node, ctx);
    case "table":
      return renderTable(node, ctx);
    case "thematicBreak":
      return "";
    case "html":
      return "";
    case "math":
      return renderMathBlock(node as unknown as { value: string; data?: { attrs?: Attributes } });
    case "containerDirective":
      return renderContainerDirective(node as unknown as DirectiveNode, ctx);
    case "leafDirective":
      return renderLeafDirective(node as unknown as DirectiveNode, ctx);
    case "textDirective":
      // Text directives at block level are unusual; treat as paragraph.
      return renderInlines([node as unknown as PhrasingContent], ctx);
    case "defList":
      return renderDefList(node as unknown as DefListNode, ctx);
    case "footnoteDefinition":
      // Definitions are emitted inline at reference sites via `ctx.footnotes`;
      // drop them here so they don't appear as orphan paragraphs.
      return "";
    default:
      return "";
  }
}

function renderParagraph(node: Paragraph, ctx: Ctx): string {
  // Promote a paragraph containing a single image to a #figure with caption.
  if (node.children.length === 1 && node.children[0]!.type === "image") {
    return renderFigure(node.children[0] as Image, ctx);
  }
  return renderInlines(node.children, ctx);
}

function renderHeading(node: Heading, ctx: Ctx): string {
  const attrs = getAttrs(node);
  // Opener heading (`## Heading {#chapter-opener}`) is structural only — the
  // visible page chrome comes from the eyebrow + dropcap blocks below it.
  // Emit just the cross-ref label so the `#` anchor still resolves.
  if (attrs?.id === "chapter-opener" || attrs?.classes?.includes("chapter-opener")) {
    return attrs?.id ? `#metadata("opener") <${attrs.id}>` : "";
  }
  const prefix = "=".repeat(node.depth);
  const body = renderInlines(node.children, ctx);
  const label = attrs?.id ? ` <${attrs.id}>` : "";
  return `${prefix} ${body}${label}`;
}

function renderCodeBlock(node: Code): string {
  const lang = node.lang ?? "";
  const maxFenceInContent = longestBacktickRun(node.value);
  const fenceLen = Math.max(3, maxFenceInContent + 1);
  const fence = "`".repeat(fenceLen);
  const raw = `${fence}${lang}\n${node.value}\n${fence}`;
  const attrs = getAttrs(node);
  const filename = attrs?.props?.filename;
  const langLabel = attrs?.props?.["lang-label"];
  if (!filename && !langLabel) return raw;
  const args: string[] = [];
  if (filename) args.push(`filename: ${typstString(filename)}`);
  if (langLabel) args.push(`lang-label: ${typstString(langLabel)}`);
  return `#code-block(${args.join(", ")})[\n${indent(raw, 2)}\n]`;
}

function longestBacktickRun(s: string): number {
  let longest = 0;
  let current = 0;
  for (const ch of s) {
    if (ch === "`") {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}

function renderList(node: List, ctx: Ctx): string {
  const items = node.children.map((item, idx) =>
    renderListItem(item, ctx, node.ordered ?? false, idx),
  );
  return items.join("\n");
}

function renderListItem(
  item: ListItem,
  ctx: Ctx,
  ordered: boolean,
  _idx: number,
): string {
  const marker = ordered ? "+" : "-";
  const body = item.children
    .map((child, i) => {
      if (child.type === "paragraph" && i === 0) {
        const inline = renderInlines(child.children, ctx);
        if (item.checked === true) return `#task-box(true) ${inline}`;
        if (item.checked === false) return `#task-box(false) ${inline}`;
        return inline;
      }
      return indent(renderBlock(child as RootContent, ctx), 2);
    })
    .filter((s) => s !== "")
    .join("\n");
  return `${marker} ${body}`;
}

function renderBlockquote(node: Blockquote, ctx: Ctx): string {
  return `#quote(block: true)[\n${indent(renderBlocks(node.children, ctx), 2)}\n]`;
}

function renderTable(node: Table, ctx: Ctx): string {
  const rows = node.children;
  if (rows.length === 0) return "";
  const columns = Math.max(...rows.map((r) => r.children.length));
  const alignArg = tableAlignArg(node.align, columns);

  const header = rows[0]!;
  const headerCells = renderTableRowCells(header, ctx);
  const bodyRows = rows
    .slice(1)
    .map((row) => renderTableRowCells(row, ctx))
    .flat();

  const parts = [
    `columns: ${columns}`,
    ...(alignArg ? [`align: (${alignArg})`] : []),
    `table.header(${headerCells.join(", ")})`,
    ...bodyRows,
  ];
  return `#table(\n  ${parts.join(",\n  ")},\n)`;
}

function tableAlignArg(
  aligns: Array<"left" | "right" | "center" | null> | null | undefined,
  columns: number,
): string | null {
  if (!aligns || aligns.length === 0) return null;
  const resolved = Array.from({ length: columns }, (_, i) => {
    const a = aligns[i];
    if (a && ALIGN_MAP[a]) return ALIGN_MAP[a];
    return "left";
  });
  return resolved.join(", ");
}

function renderTableRowCells(row: TableRow, ctx: Ctx): string[] {
  return row.children.map((cell) => renderTableCell(cell, ctx));
}

function renderTableCell(cell: TableCell, ctx: Ctx): string {
  return `[${renderInlines(cell.children, ctx)}]`;
}

function renderFigure(image: Image, ctx: Ctx): string {
  const abs = resolveImagePath(image.url, ctx);
  const caption = (image.alt ?? "").trim();
  const imgCall = `image("${escapeString(abs)}", width: 80%)`;
  const attrs = getAttrs(image);
  const label = attrs?.id ? ` <${attrs.id}>` : "";
  if (caption === "") {
    return `#figure(${imgCall})${label}`;
  }
  return `#figure(\n  ${imgCall},\n  caption: [${escapeMarkup(caption)}],\n)${label}`;
}

// ---- directive nodes (remark-directive) ----

type DirectiveNode = {
  type: "containerDirective" | "leafDirective" | "textDirective";
  name: string;
  children?: PhrasingContent[] | RootContent[];
  data?: { attrs?: Attributes } & Record<string, unknown>;
};

function renderContainerDirective(node: DirectiveNode, ctx: Ctx): string {
  const name = node.name;
  const attrs = getAttrs(node);
  const children = (node.children ?? []) as RootContent[];
  const body = renderBlocks(children, ctx);

  if (name === "margin") {
    const label = attrs?.props?.label;
    const labelArg = label ? `label: ${typstString(label)}, ` : "";
    return `#marg(${labelArg})[\n${indent(body, 2)}\n]`;
  }

  if (ADMONITION_NAMES.has(name)) {
    return `#${name}[\n${indent(body, 2)}\n]`;
  }

  if (name === "eyebrow") {
    return `#eyebrow[${renderInlineishBlock(children, ctx)}]`;
  }

  if (name === "dropcap") {
    // Split the first grapheme of the first text-bearing paragraph so the
    // template can set it in display-sized italic serif. The rest of the
    // paragraph (and any following blocks) flow as normal body.
    const { letter, rest } = splitDropcap(children);
    if (!letter) return `#dropcap("")[\n${indent(body, 2)}\n]`;
    const restRendered = renderBlocks(rest, ctx);
    return `#dropcap(${typstString(letter)})[\n${indent(restRendered, 2)}\n]`;
  }

  if (name === "epigraph") {
    return `#epigraph[\n${indent(body, 2)}\n]`;
  }

  if (name === "exbox") {
    const args: string[] = [];
    if (attrs?.props?.number) args.push(`number: ${typstString(attrs.props.number)}`);
    if (attrs?.props?.tag) args.push(`tag: ${typstString(attrs.props.tag)}`);
    const argStr = args.length > 0 ? `${args.join(", ")}, ` : "";
    return `#exbox(${argStr})[\n${indent(body, 2)}\n]`;
  }

  // Unknown container: fall through as a plain block. Future generators can
  // specialise more of these.
  return body;
}

function renderLeafDirective(node: DirectiveNode, ctx: Ctx): string {
  // Leaf directives (`::name[body]` on a single line) are rare in the
  // reference fixture; emit body only.
  const children = (node.children ?? []) as PhrasingContent[];
  return renderInlines(children, ctx);
}

function renderInlineishBlock(children: RootContent[], ctx: Ctx): string {
  // Many fenced-div classes (`eyebrow`, `exbox` tag) contain a single
  // paragraph. Render inline so the template's styling block is tight.
  if (children.length === 1 && children[0]!.type === "paragraph") {
    return renderInlines((children[0] as Paragraph).children, ctx);
  }
  return renderBlocks(children, ctx);
}

// ---- math ----

function renderMathBlock(node: { value: string; data?: { attrs?: Attributes } }): string {
  const attrs = node.data?.attrs;
  const label = attrs?.id ? ` <${attrs.id}>` : "";
  return `$ ${latexToTypst(node.value)} $${label}`;
}

function renderInlineMath(node: { value: string; data?: { attrs?: Attributes } }): string {
  const attrs = node.data?.attrs;
  // An inlineMath node that carries an `id` attribute is really a display
  // equation that remark-math parsed as inline (because the `{#eq:x}` suffix
  // prevented the block form from recognising it). Promote to display math.
  if (attrs?.id) {
    return `$ ${latexToTypst(node.value)} $ <${attrs.id}>`;
  }
  return `$${latexToTypst(node.value)}$`;
}

// Minimal LaTeX → Typst math translation. Phase 2: cover the symbols the
// reference fixture uses. Bigger-ticket constructs (\frac, \mathbf, \text,
// subscripts/superscripts with braces) arrive in a later phase.
const LATEX_SYMBOLS: Record<string, string> = {
  cdot: "dot.op",
  times: "times",
  infty: "infinity",
  alpha: "alpha",
  beta: "beta",
  gamma: "gamma",
  delta: "delta",
  epsilon: "epsilon",
  theta: "theta",
  lambda: "lambda",
  mu: "mu",
  pi: "pi",
  sigma: "sigma",
  tau: "tau",
  phi: "phi",
  omega: "omega",
  Delta: "Delta",
  Sigma: "Sigma",
  Omega: "Omega",
  sum: "sum",
  prod: "product",
  int: "integral",
  leq: "<=",
  geq: ">=",
  neq: "!=",
  approx: "approx",
  to: "->",
  rightarrow: "->",
  leftarrow: "<-",
};

function latexToTypst(s: string): string {
  let out = s;
  // Replace named commands first so `\lambda` becomes `lambda`, `\cdot`
  // becomes `dot.op`, etc. The unknown-command fallback strips the backslash,
  // which Typst will then read as a bare identifier (most LaTeX symbol names
  // happen to be valid Typst names — not all, but enough for Phase 2).
  out = out.replace(/\\([A-Za-z]+)/g, (_, name: string) => {
    return LATEX_SYMBOLS[name] ?? name;
  });
  return out.trim();
}

// ---- definition list (remark-definition-list) ----
// The plugin emits a `defList` node with `defListTerm` and `defListDescription`
// children alternating. We emit a Typst `#terms` block, which is the most
// faithful semantic mapping.

type DefListNode = {
  type: "defList";
  children: Array<{
    type: "defListTerm" | "defListDescription";
    children: RootContent[];
  }>;
};

function renderDefList(node: DefListNode, ctx: Ctx): string {
  // Term and definition both render at body weight (matches mockup's
  // `dt { font-weight: 500 }`). The hairline rule above each row carries the
  // visual distinction — the term itself is set in body sans, weight 500.
  const cells: string[] = [];
  for (const child of node.children) {
    const rendered = renderDefListChild(child, ctx);
    cells.push(`  [${rendered}]`);
  }
  return `#grid(\n  columns: (auto, 1fr),\n  column-gutter: 1.2em,\n  row-gutter: 0.55em,\n  stroke: (top: 0.3pt + rgb("#C5C2BC")),\n  inset: (top: 4pt),\n${cells.join(",\n")},\n)`;
}

function renderDefListChild(
  child: { type: "defListTerm" | "defListDescription"; children: RootContent[] },
  ctx: Ctx,
): string {
  const children = child.children;
  // Phrasing children → render inline. Block children → render as blocks.
  const allInline = children.every((c) => isPhrasingNode(c));
  if (allInline) {
    return renderInlines(children as unknown as PhrasingContent[], ctx);
  }
  return renderBlocks(children, ctx);
}

function isPhrasingNode(n: RootContent): boolean {
  return (
    n.type === "text" ||
    n.type === "emphasis" ||
    n.type === "strong" ||
    n.type === "delete" ||
    n.type === "link" ||
    n.type === "image" ||
    n.type === "inlineCode" ||
    n.type === "break" ||
    n.type === "html"
  );
}

// ---- inline nodes ----

function renderInlines(nodes: PhrasingContent[], ctx: Ctx): string {
  return nodes.map((n) => renderInline(n, ctx)).join("");
}

function renderInline(node: PhrasingContent, ctx: Ctx): string {
  switch (node.type) {
    case "text":
      return renderTextWithRefs((node as Text).value, ctx);
    case "strong":
      return `*${renderInlines((node as Strong).children, ctx)}*`;
    case "emphasis":
      return `_${renderInlines((node as Emphasis).children, ctx)}_`;
    case "delete":
      return `#strike[${renderInlines((node as Delete).children, ctx)}]`;
    case "inlineCode":
      return renderInlineCode((node as InlineCode).value);
    case "link":
      return renderLink(node as Link, ctx);
    case "image":
      return renderInlineImage(node as Image, ctx);
    case "break":
      void (node as Break);
      return " \\\n";
    case "html":
      return "";
    case "inlineMath":
      return renderInlineMath(node as unknown as { value: string });
    case "textDirective": {
      const dir = node as unknown as DirectiveNode;
      return renderInlines((dir.children ?? []) as PhrasingContent[], ctx);
    }
    case "footnoteReference": {
      const ref = (node as unknown as { identifier: string }).identifier;
      const def = ctx.footnotes.get(ref);
      if (!def) return "";
      const body = renderBlocks(def, ctx);
      return `#footnote[${body}]`;
    }
    default:
      return "";
  }
}

// Scan a text node for Pandoc-crossref references (`@fig:x`, `[@eq:y]`).
// Known labels become Typst `@label` refs (rendered via the figure/equation
// supplement — "Fig. 1", "Eq. 2"); unknown ones fall through as plain text.
const REF_RE = /(\[@([A-Za-z][\w-]*:[\w-]+)\])|(@([A-Za-z][\w-]*:[\w-]+))/g;

function renderTextWithRefs(value: string, ctx: Ctx): string {
  let out = "";
  let last = 0;
  for (const match of value.matchAll(REF_RE)) {
    const idx = match.index!;
    if (idx > last) out += escapeMarkup(value.slice(last, idx));
    const label = (match[2] ?? match[4])!;
    if (ctx.labels.has(label)) {
      out += `@${label}`;
    } else {
      out += escapeMarkup(match[0]);
    }
    last = idx + match[0].length;
  }
  if (last < value.length) out += escapeMarkup(value.slice(last));
  return out;
}

function renderInlineCode(value: string): string {
  const fenceLen = Math.max(1, longestBacktickRun(value) + 1);
  const fence = "`".repeat(fenceLen);
  const padStart = value.startsWith("`") ? " " : "";
  const padEnd = value.endsWith("`") ? " " : "";
  return `${fence}${padStart}${value}${padEnd}${fence}`;
}

function renderLink(node: Link, ctx: Ctx): string {
  const url = escapeString(node.url);
  const body = renderInlines(node.children, ctx);
  if (node.url.startsWith("#")) {
    const id = node.url.slice(1);
    // Unresolved intra-doc references fall back to plain text — Typst errors
    // on an `@label` or `link(<label>)` for a label the document doesn't
    // define.
    if (!ctx.labels.has(id)) return body || id;
    if (body === "") return `@${id}`;
    return `#link(<${id}>)[${body}]`;
  }
  return `#link("${url}")[${body}]`;
}

function renderInlineImage(image: Image, ctx: Ctx): string {
  const abs = resolveImagePath(image.url, ctx);
  return `#image("${escapeString(abs)}")`;
}

// ---- helpers ----

// Image paths are constrained to the source markdown's directory tree.
// Remote URLs, absolute paths, and any relative path that escapes the source
// dir via `..` are rejected at generation time so a hostile markdown file
// cannot exfiltrate `/etc/passwd` or fetch from the network. The returned
// string is a Typst project-root-relative path (with leading `/`) so the
// compiler resolves it against `--root <sourceDir>` rather than the host
// filesystem root.
function resolveImagePath(url: string, ctx: Ctx): string {
  if (/^(https?|ftp|file|data):/i.test(url)) {
    throw new Error(
      `Remote or non-filesystem image URL is not supported: ${url}\n` +
        `Download the asset and reference it by relative path next to the markdown source.`,
    );
  }
  if (isAbsolute(url)) {
    throw new Error(
      `Absolute image path is not allowed: ${url}\n` +
        `Use a relative path under the markdown source directory.`,
    );
  }
  const abs = resolvePath(ctx.sourceDir, url);
  const rel = relativePath(ctx.sourceDir, abs);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(
      `Image path escapes the source directory: ${url}\n` +
        `Resolved to ${abs}, which is outside ${ctx.sourceDir}.`,
    );
  }
  return "/" + rel.split(/[\\/]/).join("/");
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line === "" ? line : pad + line))
    .join("\n");
}

function getAttrs(node: unknown): Attributes | undefined {
  const n = node as { data?: { attrs?: Attributes } };
  return n.data?.attrs;
}

function typstString(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// Extract the first visible grapheme from the first paragraph of `children`
// and return it alongside a mutated children array with that leading
// character removed from the paragraph's first text node. Used by the
// dropcap directive to lift the initial letter out of the body flow.
function splitDropcap(
  children: RootContent[],
): { letter: string; rest: RootContent[] } {
  if (children.length === 0) return { letter: "", rest: children };
  const first = children[0]!;
  if (first.type !== "paragraph") return { letter: "", rest: children };
  const para = first as Paragraph;
  if (para.children.length === 0) return { letter: "", rest: children };
  const firstInline = para.children[0]!;
  if (firstInline.type !== "text") return { letter: "", rest: children };
  const t = firstInline as Text;
  const leading = t.value.match(/^\s*(\S)(.*)$/s);
  if (!leading) return { letter: "", rest: children };
  const letter = leading[1]!;
  const tail = leading[2]!;
  const newText: Text = { type: "text", value: tail };
  const newParaChildren: PhrasingContent[] = [newText, ...para.children.slice(1)];
  const newPara: Paragraph = { type: "paragraph", children: newParaChildren };
  return { letter, rest: [newPara, ...children.slice(1)] };
}
