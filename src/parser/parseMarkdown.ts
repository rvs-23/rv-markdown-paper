import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkDefinitionList from "remark-definition-list";
import type { Root as MdastRoot } from "mdast";
import { extractAttributes } from "./attributes.js";
import { liftBracketedSpans } from "./spans.js";

const parser = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkDirective)
  .use(remarkMath)
  .use(remarkDefinitionList);

// Pandoc attribute IDs frequently contain colons (`{#fig:x}`, `{#eq:y}`).
// remark-directive also uses colons to introduce text directives (`:name`),
// so a bare `{#eq:little}` trips the directive tokenizer. We protect the
// brace-enclosed attribute payload by swapping `:` for a unique placeholder
// before parse, then swapping it back on the extracted attribute strings.
//
// Only brace groups that open like a Pandoc attribute bundle (`{#id`,
// `{.class`, `{key=`) are touched, and a crossref's `@` must follow
// whitespace, `[` or `(`. Anything looser also rewrites colons inside
// link destinations (`https://user@host:8080`, `/{k:v}`), where the
// placeholder is an illegal control character and the link stops parsing.
const COLON_PLACEHOLDER = "\u0001";
const ATTR_BLOCK_RE = /\{\s*(?:[#.]|[A-Za-z_][\w-]*=)[^{}\n]*\}/g;
// Pandoc-crossref `@fig:label` / `@eq:label` references. The colon again
// collides with remark-directive's `:name` text-directive trigger, so we
// protect the same way.
const CROSSREF_RE = /(^|[\s[(])@([A-Za-z][\w-]*):([\w-]+)/gm;

export function parseMarkdownToMdast(markdown: string): MdastRoot {
  const normalized = normalizeDirectiveOpeners(markdown);
  const protectedSource = protectAttrColons(normalized);
  const tree = parser.parse(protectedSource) as MdastRoot;
  restoreAttrColons(tree);
  // Spans first, so a heading ending in `[x]{.muted}` keeps its span rather
  // than handing `{.muted}` to the heading. Positions index the normalized
  // source; the colon placeholder is a same-length swap, so offsets agree.
  liftBracketedSpans(tree, normalized);
  extractAttributes(tree);
  return tree;
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

function protectAttrColons(markdown: string): string {
  return markdown
    .replace(ATTR_BLOCK_RE, (m) => m.replace(/:/g, COLON_PLACEHOLDER))
    .replace(
      CROSSREF_RE,
      (_m, lead: string, prefix: string, tail: string) =>
        `${lead}@${prefix}${COLON_PLACEHOLDER}${tail}`,
    );
}

// Walk the tree and restore colons in every string field — text values,
// code lang/meta, link and image url/title/alt, directive attribute
// records, and anything a plugin attaches under `data`.
function restoreAttrColons(node: unknown): void {
  if (node === null || typeof node !== "object") return;
  const n = node as Record<string, unknown>;
  for (const [k, v] of Object.entries(n)) {
    if (typeof v === "string") {
      if (v.includes(COLON_PLACEHOLDER)) n[k] = v.split(COLON_PLACEHOLDER).join(":");
    } else if (k !== "position") {
      restoreAttrColons(v);
    }
  }
}
