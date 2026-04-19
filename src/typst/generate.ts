import { resolve as resolvePath, dirname, isAbsolute } from "node:path";
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

export type GenerateOptions = {
  // Directory of the source .md file — image paths are resolved against it
  // so the generator can emit absolute paths into the .typ (necessary because
  // the .typ lives in a temp dir, not next to the images).
  sourceDir: string;
};

const CALLOUT_MARKER_RE = /^\[!(NOTE|WARN|SYSTEM)\]\s*/;
const ALIGN_MAP: Record<string, string> = {
  left: "left",
  right: "right",
  center: "center",
};

export function generateTypst(tree: Root, options: GenerateOptions): string {
  const ctx: Ctx = { sourceDir: options.sourceDir };
  return renderBlocks(tree.children, ctx).trimEnd() + "\n";
}

type Ctx = { sourceDir: string };

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
      // Skip — the `***` horizontal rule is visually noisy, and Typst's
      // default `line()` output doesn't add much. Per project direction.
      return "";
    case "html":
      // Raw HTML has no sensible Typst translation in this pipeline.
      return "";
    default:
      return "";
  }
}

function renderParagraph(node: Paragraph, ctx: Ctx): string {
  // Promote a paragraph containing a single image to a #figure with a caption.
  if (node.children.length === 1 && node.children[0]!.type === "image") {
    return renderFigure(node.children[0] as Image, ctx);
  }
  return renderInlines(node.children, ctx);
}

function renderHeading(node: Heading, ctx: Ctx): string {
  const prefix = "=".repeat(node.depth);
  return `${prefix} ${renderInlines(node.children, ctx)}`;
}

function renderCodeBlock(node: Code): string {
  const lang = node.lang ? node.lang : "";
  // Typst's raw block can collide with triple-backticks inside the body —
  // switch to a longer fence if the content contains "```".
  const maxFenceInContent = longestBacktickRun(node.value);
  const fenceLen = Math.max(3, maxFenceInContent + 1);
  const fence = "`".repeat(fenceLen);
  return `${fence}${lang}\n${node.value}\n${fence}`;
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
        // First paragraph sits on the marker line.
        const inline = renderInlines(child.children, ctx);
        if (item.checked === true) return `#task-box(true) ${inline}`;
        if (item.checked === false) return `#task-box(false) ${inline}`;
        return inline;
      }
      // Continuations (nested lists, extra paragraphs) are indented so Typst
      // keeps them inside the same item.
      return indent(renderBlock(child as RootContent, ctx), 2);
    })
    .filter((s) => s !== "")
    .join("\n");
  return `${marker} ${body}`;
}

function renderBlockquote(node: Blockquote, ctx: Ctx): string {
  const callout = detectCallout(node);
  if (callout) {
    return `#${callout.kind}[${renderBlocksInContentBlock(callout.body, ctx)}]`;
  }
  return `#quote(block: true)[${renderBlocksInContentBlock(node.children, ctx)}]`;
}

type CalloutKind = "note" | "warn" | "system";

function detectCallout(
  node: Blockquote,
): { kind: CalloutKind; body: RootContent[] } | null {
  const first = node.children[0];
  if (!first || first.type !== "paragraph") return null;
  const firstChild = first.children[0];
  if (!firstChild || firstChild.type !== "text") return null;
  const match = firstChild.value.match(CALLOUT_MARKER_RE);
  if (!match) return null;
  const kind = match[1]!.toLowerCase() as CalloutKind;

  // Clone and strip the marker from the first text child.
  const trimmed: Text = {
    type: "text",
    value: firstChild.value.replace(CALLOUT_MARKER_RE, ""),
  };
  const firstParaChildren = [trimmed, ...first.children.slice(1)].filter(
    (c) => !(c.type === "text" && c.value === ""),
  );
  const newFirstPara: Paragraph =
    firstParaChildren.length > 0
      ? { type: "paragraph", children: firstParaChildren as PhrasingContent[] }
      : { type: "paragraph", children: [{ type: "text", value: "" }] };

  const body: RootContent[] = [newFirstPara, ...(node.children.slice(1) as RootContent[])];
  return { kind, body };
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
  if (caption === "") {
    return `#figure(${imgCall})`;
  }
  return `#figure(\n  ${imgCall},\n  caption: [${escapeMarkup(caption)}],\n)`;
}

// ---- inline nodes ----

function renderInlines(nodes: PhrasingContent[], ctx: Ctx): string {
  return nodes.map((n) => renderInline(n, ctx)).join("");
}

function renderInline(node: PhrasingContent, ctx: Ctx): string {
  switch (node.type) {
    case "text":
      return escapeMarkup((node as Text).value);
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
    default:
      return "";
  }
}

function renderInlineCode(value: string): string {
  const fenceLen = Math.max(1, longestBacktickRun(value) + 1);
  const fence = "`".repeat(fenceLen);
  // Typst requires a leading/trailing space inside the fence when the content
  // itself begins or ends with a backtick, otherwise the delimiters fuse.
  const padStart = value.startsWith("`") ? " " : "";
  const padEnd = value.endsWith("`") ? " " : "";
  return `${fence}${padStart}${value}${padEnd}${fence}`;
}

function renderLink(node: Link, ctx: Ctx): string {
  const url = escapeString(node.url);
  const body = renderInlines(node.children, ctx);
  return `#link("${url}")[${body}]`;
}

function renderInlineImage(image: Image, ctx: Ctx): string {
  const abs = resolveImagePath(image.url, ctx);
  return `#image("${escapeString(abs)}")`;
}

// ---- helpers ----

function resolveImagePath(url: string, ctx: Ctx): string {
  if (/^[a-z]+:\/\//i.test(url)) return url;
  if (isAbsolute(url)) return url;
  return resolvePath(ctx.sourceDir, url);
}

function renderBlocksInContentBlock(blocks: RootContent[], ctx: Ctx): string {
  // Inside a `[...]` content block (e.g., the body of `#note[...]`), blocks
  // separated by a blank line become separate paragraphs just like top level.
  return renderBlocks(blocks, ctx);
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => (line === "" ? line : pad + line))
    .join("\n");
}

void dirname;
