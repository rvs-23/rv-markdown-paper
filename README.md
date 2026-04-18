# rv-markdown-paper

A disciplined, grayscale Markdown to PDF converter.

The design goal is a printed technical dossier — serif body, serif
headings, mono reserved for code, tables, callout tags, and running
metadata. Black ink on pure-white paper. No color, no rounded corners,
no shadows, no palette to shop from.

## Status

Week 5 of 10 (part-time). The pipeline supports GFM (tables, task lists,
strikethrough, autolinks), Shiki syntax highlighting through a grayscale
dark theme (wide tonal range, bold keywords, italic comments, language
tag in the corner), YAML frontmatter, a running page header/footer, and
a full options resolver with the precedence **CLI flags → frontmatter →
`mdpdf.config.json` → defaults**.

Typography is editorial: **IBM Plex Serif** for headings, **Lora** for
body, **JetBrains Mono** for code and signal elements. Callouts
(`[!NOTE]` / `[!WARN]` / `[!SYSTEM]`) use a bare treatment — a thin black
left rule, a small mono tag, nothing else; `SYSTEM` gets a dashed rule
instead of solid.

There is no theme to configure. That is a feature.

## Quick start

```bash
npm install
npx playwright install chromium
npm run mdpdf -- examples/01-hello.md examples/01-hello.pdf
```

Render every example:

```bash
for md in examples/*.md; do
  npm run mdpdf -- "$md" "${md%.md}.pdf"
done
```

## Examples

Five fixtures of increasing complexity, each with a checked-in rendered PDF:

| File                    | What it demonstrates                                   |
|-------------------------|--------------------------------------------------------|
| `01-hello.md`           | Minimal page — type system, nothing else               |
| `02-typography.md`      | Headings, emphasis, blockquote, link, horizontal rule  |
| `03-structured.md`      | Ordered / unordered / nested lists, task lists, table  |
| `04-code.md`            | TypeScript / Python / Bash / JSON in grayscale Shiki   |
| `05-full-paper.md`      | Frontmatter metadata + all of the above in one paper   |

## Commands

```bash
npm run dev       # run the CLI via tsx
npm run mdpdf     # alias for dev
npm run build     # compile to dist/
npm run typecheck # tsc --noEmit
npm run lint      # eslint
```

## Options

Every option can be set in four places, resolved in this order (first
match wins):

1. **CLI flags** on `mdpdf convert`
2. **YAML frontmatter** at the top of the Markdown file
3. **`mdpdf.config.json`** found by walking up from the input file
4. **Built-in defaults**

### Frontmatter

```yaml
---
title: "A Short Case for Boring Output"
author: "Rishav Sharma"
date: "2026-04-18"
pageSize: Letter       # or A4
margins:
  top: 1in
  right: 0.9in
  bottom: 1in
  left: 0.9in
showHeader: true
showFooter: true
---
```

### Project config

Drop an `mdpdf.config.json` anywhere up the directory tree from the input
file to set defaults for a whole project:

```json
{
  "author": "Rishav Sharma",
  "pageSize": "A4",
  "margins": { "top": "1in", "bottom": "1in" }
}
```

### CLI flags

```
--title <text>            override title
--author <text>           override author
--date <text>             override date
--page-size <Letter|A4>   override page size
--margin-top <len>        e.g. 0.85in, 20mm, 72pt
--margin-right <len>
--margin-bottom <len>
--margin-left <len>
--no-header               hide the running header
--no-footer               hide the running footer
```

Invalid values produce friendly errors pointing at the source, e.g.
`frontmatter.pageSize: expected "Letter" or "A4", got "A5".`

## Structure

```
src/
  cli/       CLI entry (commander) with flag validation
  config/    Options types, validator, precedence resolver
  core/      convertMarkdownToPdf orchestrator
  parser/    Markdown parsing (unified + GFM) and frontmatter extraction
  transform/ AST transformations — remarkCallouts
  html/      HTML shell (webfont links + stylesheet)
  themes/    Stylesheet + Shiki theme
  pdf/       Playwright wrapper + header/footer templates
  preview/   Local preview server                 (Week 8)
  utils/
examples/    Markdown fixtures + rendered PDFs
tests/       Vitest + fixtures                    (Week 9)
docs/        Teaching docs                        (Week 10)
```

## License

MIT
