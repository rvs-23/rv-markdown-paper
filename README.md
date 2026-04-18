# rv-markdown-paper

A restrained, editorial-modern Markdown to PDF converter.

The design goal is a printed technical dossier — serif body, single
disciplined accent, sharp edges, one stylesheet that handles every valid
combination of five theme variables. No gradients, no rounded corners, no
shadows, no color palette to shop from.

## Status

Week 5 of 10 (part-time). The pipeline supports GFM (tables, task lists,
strikethrough, autolinks), Shiki syntax highlighting through a themed
light palette (accent keywords, muted strings, italic comments, language
tag in the corner), YAML frontmatter, a running page header/footer in the
accent-colored mono voice, and a full options resolver with the precedence
**CLI flags → frontmatter → `mdpdf.config.json` → defaults**.

The typographic theme is built around **five binary variables** — each
with two good values, both supported by the single stylesheet:

| Variable       | Values                          | Default        |
|----------------|---------------------------------|----------------|
| `paper-tone`   | `cool-white` · `pure-white`     | `cool-white`   |
| `accent`       | `graphite` · `forest`           | `graphite`     |
| `body-font`    | `lora` · `inter`                | `lora`         |
| `heading-font` | `plex-serif` · `lora`           | `plex-serif`   |
| `density`      | `normal` · `compact`            | `normal`       |

Callouts (`[!NOTE]` / `[!WARN]` / `[!SYSTEM]`) use a bare treatment —
thin accent-colored left rule, small mono tag, no fill or label bar.

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

Try an alternate theme:

```bash
npm run mdpdf -- examples/05-full-paper.md /tmp/forest.pdf \
  --accent forest --body-font inter --density compact
```

## Examples

Five fixtures of increasing complexity, each with a checked-in rendered PDF:

| File                    | What it demonstrates                                   |
|-------------------------|--------------------------------------------------------|
| `01-hello.md`           | Minimal page — type system, nothing else               |
| `02-typography.md`      | Headings, emphasis, blockquote, link, horizontal rule  |
| `03-structured.md`      | Ordered / unordered / nested lists, task lists, table  |
| `04-code.md`            | TypeScript / Python / Bash / JSON in the themed Shiki  |
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
  top: 1.05in
  right: 0.95in
  bottom: 0.95in
  left: 0.95in
showHeader: true
showFooter: true
theme:
  paperTone: cool-white  # or pure-white
  accent: graphite       # or forest
  bodyFont: lora         # or inter
  headingFont: plex-serif # or lora
  density: normal        # or compact
---
```

### Project config

Drop an `mdpdf.config.json` anywhere up the directory tree from the input
file to set defaults for a whole project:

```json
{
  "author": "Rishav Sharma",
  "pageSize": "A4",
  "margins": { "top": "1in", "bottom": "1in" },
  "theme": { "accent": "forest", "density": "compact" }
}
```

### CLI flags

```
--title <text>                           override title
--author <text>                          override author
--date <text>                            override date
--page-size <Letter|A4>                  override page size
--margin-top <len>                       e.g. 0.85in, 20mm, 72pt
--margin-right <len>
--margin-bottom <len>
--margin-left <len>
--no-header                              hide the running header
--no-footer                              hide the running footer
--paper-tone <cool-white|pure-white>     paper background
--accent <graphite|forest>               single accent color
--body-font <lora|inter>                 body typeface
--heading-font <plex-serif|lora>         heading typeface
--density <normal|compact>               type scale and spacing
```

Invalid values produce friendly errors pointing at the source, e.g.
`frontmatter.theme.accent: expected "graphite" or "forest", got "magenta".`

## Structure

```
src/
  cli/       CLI entry (commander) with flag validation
  config/    Options types, validator, precedence resolver
  core/      convertMarkdownToPdf orchestrator
  parser/    Markdown parsing (unified + GFM) and frontmatter extraction
  transform/ AST transformations — remarkCallouts
  html/      HTML shell (sets data attributes, injects webfonts + CSS)
  themes/    Stylesheet + dynamic Shiki theme builder
  pdf/       Playwright wrapper + themed header/footer templates
  preview/   Local preview server                 (Week 8)
  utils/
examples/    Markdown fixtures + rendered PDFs
tests/       Vitest + fixtures                    (Week 9)
docs/        Teaching docs                        (Week 10)
```

## License

MIT
