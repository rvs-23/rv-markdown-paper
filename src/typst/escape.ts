// Typst has two escape regimes:
//
//   1. Markup context (inside paragraphs, content blocks) — these characters
//      trigger Typst markup if unescaped: \ * _ ` $ # @ < > [ ] plus `~`
//      (non-breaking space), `//` (line comment), and `=`, `-`, `+`, `/` at
//      the start of a line. `~` silently swallowed "~100 μs" into " 100 μs"
//      before it was added here; `/` is escaped everywhere because a `//`
//      sequence mid-paragraph would comment out the rest of the line.
//
//   2. String literals (quoted arguments like url in `#link("...")`) — only
//      `"` and `\` need escaping.
//
// We never attempt to be clever about line position — any of the four
// "line-start sensitive" characters is always escaped when present, because
// Typst's markup mode reparses content inside `[...]` blocks and reapplies
// those rules. Over-escaping is cheap; under-escaping is a parsing bug.

const MARKUP_SPECIAL_RE = /[\\*_`$#@<>[\]~/]/g;
// Only `^` can match this — newlines are collapsed to spaces upstream of
// the regex, so the `(\n)` alternative would never fire. The previous
// `(^|\n)` form was dead code on that branch.
const LINE_START_SPECIAL_RE = /^([=\-+/])/;

export function escapeMarkup(text: string): string {
  // Soft line breaks inside mdast text nodes (from Markdown line-wrap) become
  // a literal `\n` in the value. In Typst markup, a newline that lands at
  // column 0 can terminate the enclosing list item or list itself — safer to
  // collapse soft breaks into spaces so paragraphs stay single-line.
  return text
    .replace(/\n/g, " ")
    .replace(MARKUP_SPECIAL_RE, (c) => `\\${c}`)
    .replace(LINE_START_SPECIAL_RE, (_, ch: string) => `\\${ch}`);
}

export function escapeString(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
