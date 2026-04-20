import type {
  Root as MdastRoot,
  RootContent,
  Paragraph,
  Heading,
  PhrasingContent,
  Text,
  Code,
} from "mdast";

// Pandoc-style attribute syntax: `{#id .class1 .class2 key=val key2="v a l"}`.
// This post-processor walks the mdast and lifts trailing `{...}` attribute
// bundles off headings, images, math, and lifts code-block info-string
// attributes off `code.lang` / `code.meta`.
//
// Extracted attributes land on `node.data.attrs` as a structured object:
//   { id?: string; classes?: string[]; props?: Record<string, string> }

export type Attributes = {
  id?: string;
  classes?: string[];
  props?: Record<string, string>;
};

type WithAttrs = { data?: Record<string, unknown> | undefined };

export function extractAttributes(tree: MdastRoot): void {
  liftTrailingAttrSiblings(tree.children);
  for (const node of tree.children) {
    visitBlock(node);
  }
}

// Block-level `$$...$$` emits a `math` node with its `{#eq:x}` suffix as a
// separate paragraph. Walk siblings: when a paragraph is *only* `{#id}` and
// its predecessor is a math / code / image-only paragraph, lift the attrs
// onto the predecessor and drop the attr paragraph.
function liftTrailingAttrSiblings(nodes: RootContent[]): void {
  for (let i = nodes.length - 1; i > 0; i--) {
    const n = nodes[i]!;
    if (n.type !== "paragraph") continue;
    const p = n as Paragraph;
    if (p.children.length !== 1) continue;
    const only = p.children[0]!;
    if (only.type !== "text") continue;
    const match = (only as Text).value.match(/^\s*\{([^{}]*)\}\s*$/);
    if (!match) continue;
    const attrs = parseAttrString(match[1]!);
    if (!attrs) continue;
    const prev = nodes[i - 1]!;
    if (prev.type === "math" || prev.type === "code" || prev.type === "paragraph") {
      attachAttrs(prev as unknown as WithAttrs, attrs);
      nodes.splice(i, 1);
    }
  }
}

function visitBlock(node: RootContent): void {
  switch (node.type) {
    case "heading":
      liftHeadingAttrs(node);
      break;
    case "paragraph":
      liftImageOrMathAttrs(node);
      break;
    case "code":
      liftCodeAttrs(node);
      break;
    case "containerDirective":
    case "leafDirective":
    case "textDirective": {
      // remark-directive already parses attributes into node.attributes.
      // Normalize into our `attrs` shape for uniform downstream access.
      const anyNode = node as unknown as {
        attributes?: Record<string, string | null>;
      } & WithAttrs;
      const attrs = normalizeDirectiveAttrs(anyNode.attributes);
      if (attrs) attachAttrs(anyNode, attrs);
      // Recurse into children — a container directive can nest anything.
      if ("children" in node && Array.isArray(node.children)) {
        for (const child of node.children as RootContent[]) visitBlock(child);
      }
      break;
    }
    case "blockquote":
      for (const child of node.children) visitBlock(child);
      break;
    case "list":
      for (const item of node.children) {
        for (const child of item.children) visitBlock(child);
      }
      break;
    default:
      break;
  }
}

// ---------- heading ----------
//
// `## H {#id .class}` parses as a heading whose final text child ends with
// `{#id .class}`. Strip that suffix and attach attrs to heading.data.

function liftHeadingAttrs(node: Heading): void {
  const last = node.children[node.children.length - 1];
  if (!last || last.type !== "text") return;
  const t = last as Text;
  const match = t.value.match(/\s*\{([^{}]*)\}\s*$/);
  if (!match) return;
  const attrs = parseAttrString(match[1]!);
  if (!attrs) return;
  t.value = t.value.slice(0, match.index!).trimEnd();
  if (t.value === "") node.children.pop();
  attachAttrs(node as unknown as WithAttrs, attrs);
}

// ---------- paragraph-hosted image / math ----------
//
// `![cap](img){#fig:x}` parses as an image node followed by a text node with
// value `{#fig:x}` inside the same paragraph. Likewise `$$...$${#eq:y}` puts
// a `math` block followed by an inline `{#eq:y}` text.
//
// We also normalize the caption-only paragraph `![...]()...{#fig:x}` into a
// figure-capable shape: the generator promotes such paragraphs to `#figure`.

function liftImageOrMathAttrs(node: Paragraph): void {
  const children = node.children;
  for (let i = children.length - 1; i >= 0; i--) {
    const c = children[i]!;
    if (c.type !== "text") continue;
    const match = (c as Text).value.match(/^\s*\{([^{}]*)\}\s*$/);
    if (!match) break;
    const prev = children[i - 1];
    if (!prev) break;
    // Paragraph children are phrasing content, so only `image` and
    // `inlineMath` can appear here. Block math (`$$...$$`) is its own
    // top-level block — its attr suffix is handled by lifting the
    // following paragraph with just `{#id}` (see extractAttributes loop).
    if (prev.type !== "image" && prev.type !== "inlineMath") break;
    const attrs = parseAttrString(match[1]!);
    if (!attrs) break;
    attachAttrs(prev as unknown as WithAttrs, attrs);
    children.splice(i, 1);
  }
}

// ---------- code fences ----------
//
// ``` {.python filename="fetch_all.py" #id}
// remark-parse stores `{.python` in `lang` and the remainder in `meta`. Join
// them, strip the braces, parse like a full attribute string, then normalize:
// `.python` → first class becomes the language.

function liftCodeAttrs(node: Code): void {
  const lang = node.lang ?? "";
  const meta = node.meta ?? "";
  const combined = meta ? `${lang} ${meta}` : lang;
  const trimmed = combined.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return;
  const inside = trimmed.slice(1, -1);
  const attrs = parseAttrString(inside);
  if (!attrs) return;
  // Promote the first class to node.lang so Typst's raw-block highlighter
  // keeps working. Leave the rest in attrs for the template to consume.
  const firstClass = attrs.classes?.[0];
  node.lang = firstClass ?? null;
  node.meta = null;
  attachAttrs(node as unknown as WithAttrs, attrs);
}

// ---------- attribute string parser ----------
//
// Grammar (space-separated tokens):
//   #id           → attrs.id
//   .class        → attrs.classes.push(name)
//   key=value     → attrs.props[key] = value  (unquoted: one word)
//   key="v a l"   → attrs.props[key] = "v a l"  (double-quoted)

export function parseAttrString(s: string): Attributes | null {
  const attrs: Attributes = {};
  let i = 0;
  while (i < s.length) {
    while (i < s.length && /\s/.test(s[i]!)) i++;
    if (i >= s.length) break;
    const ch = s[i]!;
    if (ch === "#") {
      i++;
      const { token, end } = readToken(s, i);
      if (token === "") return null;
      attrs.id = token;
      i = end;
    } else if (ch === ".") {
      i++;
      const { token, end } = readToken(s, i);
      if (token === "") return null;
      (attrs.classes ??= []).push(token);
      i = end;
    } else if (/[A-Za-z_]/.test(ch)) {
      const { token: key, end: afterKey } = readKey(s, i);
      if (key === "") return null;
      i = afterKey;
      if (s[i] !== "=") return null;
      i++;
      const { value, end: afterValue } = readValue(s, i);
      if (value === null) return null;
      (attrs.props ??= {})[key] = value;
      i = afterValue;
    } else {
      return null;
    }
  }
  if (!attrs.id && !attrs.classes && !attrs.props) return null;
  return attrs;
}

function readToken(s: string, start: number): { token: string; end: number } {
  let i = start;
  while (i < s.length && !/[\s}]/.test(s[i]!)) i++;
  return { token: s.slice(start, i), end: i };
}

function readKey(s: string, start: number): { token: string; end: number } {
  let i = start;
  while (i < s.length && /[\w-]/.test(s[i]!)) i++;
  return { token: s.slice(start, i), end: i };
}

function readValue(s: string, start: number): { value: string | null; end: number } {
  if (s[start] === '"') {
    let i = start + 1;
    let out = "";
    while (i < s.length && s[i] !== '"') {
      if (s[i] === "\\" && i + 1 < s.length) {
        out += s[i + 1];
        i += 2;
      } else {
        out += s[i];
        i++;
      }
    }
    if (s[i] !== '"') return { value: null, end: i };
    return { value: out, end: i + 1 };
  }
  let i = start;
  while (i < s.length && !/[\s}]/.test(s[i]!)) i++;
  return { value: s.slice(start, i), end: i };
}

// ---------- helpers ----------

function attachAttrs(node: WithAttrs, attrs: Attributes): void {
  const data = (node.data ??= {});
  const existing = (data.attrs as Attributes | undefined) ?? {};
  const merged: Attributes = {
    id: attrs.id ?? existing.id,
    classes: mergeArrays(existing.classes, attrs.classes),
    props: { ...(existing.props ?? {}), ...(attrs.props ?? {}) },
  };
  if (!merged.id) delete merged.id;
  if (!merged.classes || merged.classes.length === 0) delete merged.classes;
  if (!merged.props || Object.keys(merged.props).length === 0) delete merged.props;
  data.attrs = merged;
}

function mergeArrays<T>(a: T[] | undefined, b: T[] | undefined): T[] | undefined {
  if (!a && !b) return undefined;
  return [...(a ?? []), ...(b ?? [])];
}

function normalizeDirectiveAttrs(
  raw: Record<string, string | null> | undefined,
): Attributes | null {
  if (!raw) return null;
  const attrs: Attributes = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null) continue;
    if (k === "id") attrs.id = v;
    else if (k === "class") attrs.classes = v.split(/\s+/).filter((x) => x !== "");
    else (attrs.props ??= {})[k] = v;
  }
  if (!attrs.id && !attrs.classes && !attrs.props) return null;
  return attrs;
}

// suppress unused-phrasing import warning — kept for future inline visitor
void (null as unknown as PhrasingContent);
