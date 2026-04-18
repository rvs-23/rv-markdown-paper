# rv-markdown-paper

A grayscale, terminal-inspired Markdown to PDF converter.

The design goal is a printed technical dossier with terminal discipline —
black and white only, sharp rectangles, sans-serif body with mono used
deliberately for H1, code, callouts, metadata, and page numbers. No color,
no rounded corners, no shadows.

## Status

Week 3 of 10 (part-time). The pipeline supports GFM (tables, task lists,
strikethrough, autolinks), Shiki syntax highlighting through an inverted
grayscale theme (dark code blocks with a language label in the top corner),
YAML frontmatter (`title`, `author`, `date`), and a running page
header/footer rendered via Playwright templates — an uppercase-mono header
(title left, author right) and a `[ page / total ]` footer. Callouts
(`[!NOTE]` / `[!WARN]` / `[!SYSTEM]`) were pulled forward from Week 6; they
are the v1 design signature.

Internal boundaries are intact: `parser/` exposes the mdast AST as a
first-class value, `html/` wraps the output in a minimal shell with a
`<base href>` so relative image URLs resolve, `pdf/` drives headless
Chromium, and `core/` orchestrates. See the teaching plan at
`~/Desktop/markdown_to_pdf_project_plan.md` for the full week-by-week
breakdown.

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

## Frontmatter

Optional YAML at the top of the file. Supported keys:

```yaml
---
title: "A Short Case for Boring Output"
author: "R. Sharma"
date: "2026-04-18"
---
```

`title` drives the `<title>` tag, the PDF's running header, and falls back
to the filename when absent. `author` and `date` appear in the header
(author preferred if both are set). CLI-level overrides arrive in Week 4.

## Structure

```
src/
  cli/       CLI entry (commander)
  core/      convertMarkdownToPdf orchestrator
  parser/    Markdown parsing (unified + GFM) and frontmatter extraction
  transform/ AST transformations                 (Week 6+)
  html/      HTML shell + placeholder CSS
  themes/    Grayscale Shiki theme; Minimal CSS   (full theme, Week 5)
  pdf/       Playwright wrapper + header/footer templates
  preview/   Local preview server                 (Week 8)
  utils/
examples/    Markdown fixtures + rendered PDFs
tests/       Vitest + fixtures                    (Week 9)
docs/        Teaching docs                        (Week 10)
```

## License

MIT
