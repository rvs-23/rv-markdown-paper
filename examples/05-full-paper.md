---
title: "A Short Case for Boring Output"
author: "R. Sharma"
date: "2026-04-18"
---

# A Short Case for Boring Output

Most document generators optimize for visual variety — icons, gradients,
accent colors, rounded corners, illustrated divider graphics. This one does
not. It generates the same kind of page, over and over, with as little chrome
as possible.

## Why

The point of a PDF is to be read.

- Every pixel of color is a decision the reader has to resolve.
- Every rounded corner is a style choice the reader has to accept.
- Every shadow is an attempt to imitate paper that paper itself does not need.

When those decisions aren't yours to make, the reader can just read.

## What You Get

| Element | Treatment                                              |
|---------|--------------------------------------------------------|
| H1      | JetBrains Mono, rule above, pure black                 |
| H2–H4   | IBM Plex Sans, tight hierarchy                         |
| Body    | IBM Plex Sans, 11pt, 1.55 line-height                  |
| Code    | JetBrains Mono, grayscale Shiki, rules top and bottom  |
| Tables  | Uppercase mono header, no vertical borders             |
| Links   | Black, underlined — no color, no hover                 |
| Header  | Title left, author right, uppercase mono, muted        |
| Footer  | `[ page / total ]` in mono, centered                   |

## How

1. Extract frontmatter with `gray-matter`.
2. Parse the Markdown to an mdast tree (`remark-parse` + `remark-gfm`).
3. Transform mdast → hast with `remark-rehype`.
4. Syntax-highlight with `@shikijs/rehype` and the grayscale theme.
5. Stringify to HTML, wrap in a minimal shell, drive Chromium headlessly.

Nothing in that list is novel. The novelty, if any, is in what's left out.

## Code, For Flavor

```typescript
const { content, metadata } = extractFrontmatter(raw);
const tree = parseMarkdownToMdast(content);
const html = wrapInDocumentShell(await mdastToHtml(tree), {
  title: metadata.title ?? deriveTitle(inputPath),
  baseUrl: pathToFileURL(dirname(inputPath) + "/").href,
});
```

One call per stage. No configuration surface to speak of — yet. A theme
registry and plugin API will arrive when a second document format needs them,
not before.

## Callouts

Three types, one source format — labeled NOTE, WARN, or SYSTEM at the start
of a blockquote.

> [!NOTE]
> Useful context that isn't load-bearing. A quiet aside the reader can take
> or leave.

> [!WARN]
> Something the reader must not miss. The inverted label bar is the
> typographic equivalent of an air-horn.

> [!SYSTEM]
> A diagnostic, an engineering invariant, or a pre-condition. Dashed border
> reads as "from the machine, not the author."

## A Note on Checklists

- [x] ~~Use five accent colors.~~
- [x] Use zero accent colors.
- [x] Ship the footer with page numbers.
- [ ] Ship the cover page (Week 7).

The strikethrough, task list, and nested list all render from a single
Markdown source — no special syntax, no escape hatches.

## Closing

> Design is a plan for arranging elements in such a way as best to
> accomplish a particular purpose.

— Charles Eames, who knew a thing or two about chairs.

---

If a boring page is readable, and a readable page gets read, the boring page
has out-performed the interesting one. That is the whole case.
