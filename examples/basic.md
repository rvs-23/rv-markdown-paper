# Week 2 Milestone Document

This is the Week 2 fixture for **beautiful-md-pdf**. If the PDF shows this line as a rendered heading above real paragraphs, lists, and code — not as raw Markdown in a `<pre>` — Week 2 worked.

## What Changed Since Week 1

The conversion pipeline is now real:

1. Read the Markdown file.
2. Parse it into an mdast tree with `remark-parse`.
3. Transform to hast with `remark-rehype`.
4. Stringify to HTML with `rehype-stringify`.
5. Wrap in a document shell with throwaway grayscale CSS.
6. Print to PDF via headless Chromium.

The code is also split into dedicated modules:

- `parser/parseMarkdown.ts` — unified pipeline.
- `html/documentShell.ts` — HTML shell and placeholder CSS.
- `pdf/renderPdf.ts` — Playwright wrapper.
- `core/convert.ts` — thin orchestrator.

## Formatting Smoke Tests

Inline formatting works: **bold**, *italic*, and `inline code`. Links render as [underlined black](https://example.com) per the Design Tenets.

### Lists

Unordered:

- Parser → mdast
- Transformer → hast
- Renderer → HTML
- Printer → PDF

Ordered:

1. First item.
2. Second item.
3. Third item.

### Blockquote

> The document should read as a printed technical dossier, not a developer terminal.

### Code Block

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype)
  .use(rehypeStringify);
```

## What's Still Missing

- GFM tables, task lists, strikethrough — Week 3.
- Shiki syntax highlighting — Week 3.
- Image path resolution — Week 3.
- Frontmatter and CLI options — Week 4.
- Full Minimal theme with bundled fonts — Weeks 5–6.
- Callouts (NOTE / WARN / SYSTEM) — Week 6.
- TOC, cover page, page numbers — Week 7.
