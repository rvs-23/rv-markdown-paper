# beautiful-md-pdf

A grayscale, terminal-inspired Markdown to PDF converter.

The design goal is a printed technical dossier with terminal discipline — black and white only, sharp rectangles, sans-serif body with mono used deliberately for H1, code, callouts, metadata, and page numbers. No color. No rounded corners. No shadows.

## Status

Week 2 of 10 (part-time). The conversion pipeline now parses Markdown into HTML via `unified` + `remark-parse` + `remark-rehype` + `rehype-stringify`, wraps the result in an HTML shell with throwaway grayscale CSS, and prints via headless Chromium. Code is split into `parser/`, `html/`, `pdf/`, and a thin `core/` orchestrator. GFM extensions, Shiki syntax highlighting, and image resolution arrive in Week 3.

See `~/Desktop/markdown_to_pdf_project_plan.md` for the full teaching plan, architecture, design tenets, and week-by-week breakdown.

## Quick start

```bash
npm install
npx playwright install chromium
npm run mdpdf -- examples/hello.md examples/hello.pdf
```

Output:

```
Wrote examples/hello.pdf
```

## Commands

```bash
npm run dev       # run the CLI via tsx
npm run mdpdf     # alias for dev
npm run build     # compile to dist/
npm run typecheck # tsc --noEmit
npm run lint      # eslint
```

## Structure

```
src/
  cli/       CLI entry (commander)
  core/      convertMarkdownToPdf
  parser/    Markdown parsing (unified)
  transform/ AST transformations         (Week 3+)
  html/      HTML shell + placeholder CSS
  themes/    Minimal theme (CSS + JSON)   (Week 5)
  pdf/       Playwright wrapper
  preview/   Local preview server         (Week 8)
  utils/
examples/    Fixture Markdown + generated PDFs
tests/       Vitest + fixtures            (Week 9)
docs/        Teaching docs                (Week 10)
```

## License

MIT
