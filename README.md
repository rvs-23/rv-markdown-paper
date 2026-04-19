# rv-markdown-paper

Turn a Markdown file into a grayscale, editorial-style PDF — serif body, serif headings, mono reserved for code and callouts, black ink on white paper. No color, no theme to pick.

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

Fonts are bundled under `assets/fonts/` (IBM Plex Serif, Lora, JetBrains Mono) and passed to Typst via `--font-path --ignore-system-fonts`, so the output is identical on every machine regardless of what's installed.

## Convert a file

```bash
npm run mdpdf -- ~/Desktop/notes.md ~/Desktop/notes.pdf
```

The two positional arguments are the input `.md` and the output `.pdf`. Relative paths also work:

```bash
npm run mdpdf -- notes.md notes.pdf
```

If your Markdown references local images (`![alt](./diagram.svg)`), keep them next to the `.md` — they're resolved relative to it.

## What happens under the hood

The pipeline is four small stages. Each does one thing; you can read them top-to-bottom in `src/core/convert.ts`.

1. **Frontmatter** — `gray-matter` peels YAML off the top of the file.
2. **Parse** — Markdown → mdast (`remark-parse` + `remark-gfm` for tables, task lists, strikethrough).
3. **Generate** — an mdast walker in `src/typst/generate.ts` emits Typst markup directly: headings, lists, tables, figures, callouts, fenced code, inline styles. Escaping lives in `src/typst/escape.ts`.
4. **Compile** — `src/typst/render.ts` writes the generated body into a temp directory alongside `template.typ` (the design system) and `theme.tmTheme` (the grayscale syntax theme), then spawns `typst compile` with the bundled fonts.

The template is the only place that knows what the document looks like. It's pure Typst `set` / `show` rules — the old CSS stylesheet collapsed into one file you can read in ten minutes: `src/typst/template.typ`.

## Options

An option can be set in four places. They're resolved in this order, first match wins:

1. **CLI flags**
2. **YAML frontmatter** at the top of the Markdown file
3. **`mdpdf.config.json`** — walked up from the input file's directory
4. **Built-in defaults**

That means a project-wide `mdpdf.config.json` sets the baseline, frontmatter overrides per-document, CLI overrides per-invocation.

### Frontmatter

```yaml
---
title: "A Short Case for Boring Output"
subtitle: "Why the same page beats visual variety."
section: "Essay 05 · Editorial Intent"
author: "Rishav Sharma"
date: "2026-04-18"
readingTime: "7 min"     # auto-estimated from word count if omitted
pageSize: Letter          # or A4
margins: { top: 1in, right: 0.9in, bottom: 1in, left: 0.9in }
showHeader: true
showFooter: true
showCover: true           # dedicated cover page on page 1
---
```

### CLI flags

| Flag                                | Effect                                  |
|-------------------------------------|-----------------------------------------|
| `--title <text>`                    | Document title                          |
| `--subtitle <text>`                 | Deck line under the title               |
| `--section <text>`                  | Small kicker above the title            |
| `--author <text>` / `--date <text>` | Byline                                  |
| `--reading-time <e.g. "7 min">`     | Override the auto-estimate              |
| `--page-size <Letter\|A4>`          |                                         |
| `--margin-{top,right,bottom,left}`  | CSS length: `0.85in`, `20mm`, `72pt`    |
| `--no-header` / `--no-footer`       | Hide the running header/footer          |
| `--no-cover`                        | Inline title block, no dedicated cover  |

Invalid values fail loud with the source named: `frontmatter.pageSize: expected "Letter" or "A4", got "A5".`

### Project config

Drop an `mdpdf.config.json` anywhere above the input file:

```json
{ "author": "Rishav Sharma", "pageSize": "A4", "showCover": false }
```

## Examples

Each file adds one layer on top of the previous. The checked-in PDFs let you compare source to output without rendering yourself.

| File                       | What it teaches                                     |
|----------------------------|-----------------------------------------------------|
| `examples/01-hello.md`     | Minimum viable page — just the type system          |
| `examples/02-typography.md`| Headings, emphasis, blockquote, links, rule         |
| `examples/03-structured.md`| Ordered / nested / task lists, table                |
| `examples/04-code.md`      | Grayscale syntax across TypeScript / Python / Bash  |
| `examples/05-full-paper.md`| Cover page, callouts, figure, frontmatter — the lot |

Render them all:

```bash
for md in examples/*.md; do
  npm run mdpdf -- "$md" "${md%.md}.pdf"
done
```

## Source layout

```
src/
  cli/         Commander entry + flag validation
  config/      Options types, precedence resolver, validator
  core/        Pipeline orchestrator; reading-time estimator
  parser/      Markdown → mdast; frontmatter extraction
  typst/       mdast → Typst generator; escape rules; template.typ; theme.tmTheme; compiler runner
assets/
  fonts/       IBM Plex Serif, Lora, JetBrains Mono (bundled, passed to Typst)
```

## Development

```bash
npm run dev        # run the CLI via tsx (no build step)
npm run mdpdf      # alias for dev
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## License

MIT
