import type { Root as MdastRoot, PhrasingContent, Text } from "mdast";
import { ConfigError } from "../config/validate.js";
import { parseAttrString, type Attributes } from "./attributes.js";

// A Pandoc bracketed span, `[text]{.class}`. remark has no syntax for it,
// so the brackets and braces arrive as literal text around the content.
export interface Span {
  type: "span";
  children: PhrasingContent[];
  data?: { attrs?: Attributes };
}

declare module "mdast" {
  interface PhrasingContentMap {
    span: Span;
  }
  interface RootContentMap {
    span: Span;
  }
}

const ASCII_PUNCT_RE = /[!-/:-@[-`{-~]/;
const CHAR_REF_RE = /&(?:#\d{1,7}|#[xX][\da-fA-F]{1,6}|[A-Za-z][A-Za-z\d]{1,31});/y;
const SPAN_ATTR_RE = /^\{([^{}\n]*)\}/;

/**
 * Turn `[text]{#id .class key=val}` runs in phrasing content into `span`
 * nodes carrying the parsed attributes.
 *
 * Only text nodes are scanned, so code, math and HTML stay literal, and a
 * bracket written as `\[` or `&#91;` never opens or closes a span. mdast
 * text is already unescaped, so escapes are recovered by walking each text
 * node's value against its source slice.
 *
 * Args:
 *   tree: The parsed document, mutated in place.
 *   source: The exact string the tree was parsed from (positions index it).
 *
 * Raises:
 *   ConfigError: A span carries an `#id`; Typst can't reference a label on
 *     inline text, so ids on spans are rejected rather than dropped.
 */
export function liftBracketedSpans(tree: MdastRoot, source: string): void {
  const masks = new WeakMap<Text, boolean[]>();
  const liveMask = (t: Text): boolean[] => {
    let mask = masks.get(t);
    if (!mask) masks.set(t, (mask = computeLiveMask(t, source)));
    return mask;
  };
  const walk = (node: unknown): void => {
    const children = (node as { children?: unknown[] }).children;
    if (!Array.isArray(children)) return;
    for (const child of children) walk(child);
    while (liftOne(children as PhrasingContent[], liveMask, masks));
  };
  walk(tree);
}

// Find the first complete span at this level, splice it in, and report
// whether one was found. The caller loops until none remain; an inner span
// always closes before its outer one, so nesting falls out naturally.
function liftOne(
  children: PhrasingContent[],
  liveMask: (t: Text) => boolean[],
  masks: WeakMap<Text, boolean[]>,
): boolean {
  const opens: { node: number; at: number }[] = [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i]!;
    if (node.type !== "text") continue;
    const value = node.value;
    const live = liveMask(node);
    for (let k = 0; k < value.length; k++) {
      if (!live[k]) continue;
      if (value[k] === "[") {
        opens.push({ node: i, at: k });
        continue;
      }
      if (value[k] !== "]") continue;
      const open = opens.pop();
      if (!open || !live[k + 1]) continue;
      const match = SPAN_ATTR_RE.exec(value.slice(k + 1));
      if (!match) continue;
      // A malformed bundle (`[1]{.5}`) is ordinary prose, not a span.
      let attrs: Attributes | null;
      try {
        attrs = parseAttrString(match[1]!);
      } catch {
        attrs = null;
      }
      if (!attrs) continue;
      if (attrs.id) {
        throw new ConfigError(
          `bracketed span {${match[1]}}: span ids are not supported — Typst ` +
            `can't reference a label on inline text. Remove "#${attrs.id}" ` +
            `(classes such as .muted still work).`,
        );
      }
      const piece = (t: Text, from: number, to?: number): Text[] => {
        const text: Text = { type: "text", value: t.value.slice(from, to) };
        if (text.value === "") return [];
        masks.set(text, liveMask(t).slice(from, to));
        return [text];
      };
      const opener = children[open.node] as Text;
      const inner: PhrasingContent[] =
        open.node === i
          ? piece(node, open.at + 1, k)
          : [
              ...piece(opener, open.at + 1),
              ...children.slice(open.node + 1, i),
              ...piece(node, 0, k),
            ];
      const span: Span = { type: "span", children: inner, data: { attrs } };
      children.splice(
        open.node,
        i - open.node + 1,
        ...piece(opener, 0, open.at),
        span,
        ...piece(node, k + 1 + match[0].length),
      );
      return true;
    }
  }
  return false;
}

// For each character of a text node's value, whether it was written as
// itself in the source (true) or came from a backslash escape or character
// reference (false). Source characters the value lacks — container
// prefixes like `> ` and list indentation on continuation lines — are
// skipped. Without a position every character counts as escaped, so the
// node can never form a span.
function computeLiveMask(node: Text, source: string): boolean[] {
  const value = node.value;
  const live = new Array<boolean>(value.length).fill(false);
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return live;
  let j = start;
  for (let i = 0; i < value.length; i++) {
    while (j < end) {
      const ch = source[j]!;
      if (ch === "\\" && source[j + 1] === value[i] && ASCII_PUNCT_RE.test(value[i]!)) {
        j += 2;
        break;
      }
      CHAR_REF_RE.lastIndex = j;
      const ref = ch === "&" ? CHAR_REF_RE.exec(source) : null;
      // An unknown name such as `&foo;` stays in the value undecoded.
      if (ref && !value.startsWith(ref[0], i)) {
        j += ref[0].length;
        break;
      }
      j++;
      if (ch === value[i]) {
        live[i] = true;
        break;
      }
    }
  }
  return live;
}
