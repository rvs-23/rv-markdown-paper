# rv-markdown-paper

Turn a Markdown file into an editorial-style PDF — warm paper, single-ink ramp, three-font system (Archivo for body, Instrument Serif for ornament, JetBrains Mono for code). Pandoc-style fenced divs, attributes, math, and cross-refs in source; native Typst typesetting on the back end. No color palette to pick.

## Install

```bash
git clone https://github.com/rvs-23/rv-markdown-paper.git
cd rv-markdown-paper
npm install
```

One external dependency: the [Typst](https://github.com/typst/typst) compiler has to be on your `PATH`. The runner shells out to `typst compile` — Node alone can't typeset a page.

```bash
brew install typst        # macOS
# or: cargo install --locked typst-cli
# or download a prebuilt binary from github.com/typst/typst/releases
```

Fonts ship in `assets/fonts/` (Archivo, Instrument Serif, JetBrains Mono — all OFL-1.1) and are passed to Typst via `--font-path --ignore-system-fonts`, so the output is identical on every machine regardless of what's installed.

## Convert a file

```bash
npm run mdpdf -- ~/Desktop/notes.md ~/Desktop/notes.pdf
```

The two positional arguments are the input `.md` and the output `.pdf`. Relative paths also work:

```bash
npm run mdpdf -- notes.md notes.pdf
```

If your Markdown references local images (`![alt](./diagram.svg)`), keep them next to the `.md` — they're resolved relative to it.

## What you can write

The parser extends GitHub-flavored Markdown with the bits a real editorial document needs:

| Feature                    | Syntax                                          |
|----------------------------|-------------------------------------------------|
| Headings with IDs          | `## Section {#sec-foo}`                         |
| Fenced divs                | `:::eyebrow` / `:::dropcap` / `:::note` / etc.  |
| Bracketed spans            | `[inline tag]{.class}`                          |
| Code-block attributes      | ```` ``` {.python filename="x.py" lang-label="Python 3.12"} ```` |
| Figures with cross-refs    | `![Caption](img.png){#fig:x}`, `[@fig:x]`       |
| Display math with refs     | `$$ N = \lambda \cdot W $$ {#eq:y}`, `[@eq:y]`  |
| Inline math                | `$x^2$`                                         |
| Footnotes                  | `text[^1]` ... `[^1]: footnote body`            |
| Definition lists           | `Term\n: definition`                            |
| Task lists                 | `- [x] done`, `- [ ] todo`                      |

Custom fenced divs the template knows by name:

| Block                       | Renders as                                                |
|-----------------------------|-----------------------------------------------------------|
| `:::eyebrow`                | Small uppercase tracked label                             |
| `:::dropcap`                | First-letter dropcap on the next paragraph                |
| `:::note` / `:::tip` / `:::warning` / `:::danger` | Admonition with left-rule + label   |
| `:::epigraph`               | Pull quote with em-dash attribution                       |
| `:::margin` (or `:::{.margin label="..."}`) | Right-rail marginalia, auto-aligned       |
| `:::{.exbox number="01" tag="warm-up"}`     | Exercise block with numeral + tag         |

The heading ladder maps to a *visual* ladder, not 1:1 by level. `##` is a small section eyebrow + hairline (the "7.1 · TITLE" line); `###` is the actual display heading (21 pt). `## Heading {#chapter-opener}` suppresses the heading text entirely — the eyebrow + dropcap below it carry the page.

## What happens under the hood

```
src/
  cli/        Commander entry + flag validation
  config/     Options types, precedence resolver, validator
  core/       Pipeline orchestrator
  parser/     Markdown → mdast (remark + plugins); Pandoc attribute extractor
  typst/      mdast → Typst generator; template.typ; theme.tmTheme; compiler runner
assets/fonts/ Archivo + Instrument Serif + JetBrains Mono (bundled)
docs/         plan.md — full design spec and refactor plan
examples/     reference/ canonical fixture; numbered demos; editorial-swiss.pdf
```

The pipeline is four stages, top-to-bottom in `src/core/convert.ts`:

1. **Frontmatter** — `gray-matter` peels YAML off the top.
2. **Parse** — Markdown → mdast via `remark-parse` + `remark-gfm` + `remark-directive` + `remark-math` + `remark-definition-list`. A pre-parse pass normalizes Pandoc dialect surface forms (`::: name`, `:::{.class}`, attribute-bracket colons) so the canonical fixture parses without running Pandoc as a subprocess. `src/parser/attributes.ts` lifts `{#id .class k=v}` bundles off headings, images, math, and code fences onto `node.data.attrs`.
3. **Generate** — `src/typst/generate.ts` walks the tree and emits Typst directly. Footnote definitions are pre-collected and inlined at reference sites; cross-ref targets are pre-collected so unresolved `@fig:x` refs degrade to plain text instead of crashing the compiler; LaTeX math is mapped to Typst symbols (`\lambda` → `lambda`, `\cdot` → `dot.op`, etc.).
4. **Compile** — `src/typst/render.ts` writes the generated body into a temp directory alongside `template.typ` and `theme.tmTheme`, then spawns `typst compile` with the bundled fonts.

The template is the only place that knows what the document looks like. Pure Typst `set` / `show` rules: `src/typst/template.typ`.

## Options

An option can be set in four places. Resolved in order, first match wins:

1. **CLI flags**
2. **YAML frontmatter** at the top of the Markdown file
3. **`mdpdf.config.json`** — walked up from the input file's directory
4. **Built-in defaults**

A project-wide `mdpdf.config.json` sets the baseline, frontmatter overrides per-document, CLI overrides per-invocation.

### Frontmatter

```yaml
---
title: "Thread pools"
subtitle: "or how to share a bounded crew."
section: "Chapter 07 · Thread pools"
author: "Rishav Sharma"
date: "2026-04-20"
readingTime: "75 min"
chapter: 7
part: "Part Two"
edition: "Edition 2 · 2026"
volume: "Volume I"
pageStart: 85
pageEnd: 98
pageSize: A4              # or Letter
margins: { top: 24mm, right: 22mm, bottom: 22mm, left: 22mm }
showHeader: true
showFooter: true
showCover: true
cover:
  kicker: "Part Two · Chapter 07"
  title: "Thread pools, or how to share a bounded crew."
  subtitle: "From `threading.Thread` to `concurrent.futures` — when a pool helps."
  meta:
    - { label: TOPIC, value: "Thread pools & futures" }
    - { label: LANGUAGE, value: "Python 3.12" }
    - { label: RUNTIME, value: "75 min read" }
  toc:
    - { id: "7.1", title: "Threads & the GIL", ref: "sec-threads-gil" }
    - { id: "7.2", title: "What a pool actually is", ref: "sec-pool-is" }
---
```

### CLI flags

| Flag                                | Effect                                  |
|-------------------------------------|-----------------------------------------|
| `--title <text>`                    | Document title                          |
| `--subtitle <text>`                 | Deck line under the title               |
| `--section <text>`                  | Small kicker above the title            |
| `--author <text>` / `--date <text>` | Byline                                  |
| `--reading-time <"7 min">`          | Override the auto-estimate              |
| `--page-size <Letter\|A4>`          |                                         |
| `--margin-{top,right,bottom,left}`  | CSS length: `0.85in`, `20mm`, `72pt`    |
| `--no-header` / `--no-footer`       | Hide the running header/footer          |
| `--no-cover`                        | Inline title block, no dedicated cover  |

Cover, chapter, part, edition, volume, page-start/end and reading-time are frontmatter-only.

Invalid values fail loud with the source named: `frontmatter.pageSize: expected "Letter" or "A4", got "A5".`

## Examples

| File                                   | What it teaches                                     |
|----------------------------------------|-----------------------------------------------------|
| `examples/reference/reference.md`      | Canonical Editorial+Swiss fixture (full chapter)    |
| `examples/reference/reference.pdf`     | Hand-typeset target — the visual north star         |
| `examples/reference/reference.html`    | CSS spec source for the design tokens               |
| `examples/editorial-swiss.pdf`         | Latest pipeline render of `reference.md`            |
| `examples/01-hello.md`                 | Minimum viable page — just the type system          |
| `examples/02-typography.md`            | Headings, emphasis, blockquote, links, rule         |
| `examples/03-structured.md`            | Ordered / nested / task lists, table                |
| `examples/04-code.md`                  | Grayscale syntax across TypeScript / Python / Bash  |
| `examples/05-full-paper.md`            | Cover page, callouts, figure, frontmatter — the lot |

Render them all:

```bash
for md in examples/*.md; do
  npm run mdpdf -- "$md" "${md%.md}.pdf"
done
```

## Development

```bash
npm run dev        # run the CLI via tsx (no build step)
npm run mdpdf      # alias for dev
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

Full design spec and refactor plan: [`docs/plan.md`](docs/plan.md).

## License

MIT
