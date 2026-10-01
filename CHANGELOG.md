# Changelog

## 0.1.0 (2026-10-01)

The first release. Needs Node.js 20 or newer and Typst 0.14 or newer.

**What it does:** turns a Markdown file into a PDF set in one fixed editorial design.

- **Page design:** a cover page with a table of contents, running header, footer with page numbers and an author signature, margin notes, and a large section numeral in the margin.
- **Content:** headings, lists, task lists, definition lists, tables sized to their content, code blocks with grayscale highlighting, figures, footnotes or endnotes, cross-references, LaTeX math, callouts, pull quotes, exercise boxes, a chapter opener with a drop cap, and bracketed spans.
- **Obsidian notes render as written:** `> [!tip]` callouts, `[[wikilinks]]`, `![[image.png]]` embeds and `==highlights==`.
- **Scripts:** Latin, Greek, Cyrillic, Hebrew, Devanagari, Bengali, Kannada, Telugu and emoji. A character with no bundled font fails the render, naming the character and its line.
- **Options:** paper colours (`glacier`, `platinum`, `parchment`, or any hex), page size, margins, an optional watermark, and switches for the cover, header, footer and signature. Set them as CLI flags, in frontmatter, or in `mdpdf.config.json`.
- **Reproducible output:** every font ships in the repo, so the same file gives the same PDF on any machine with the same Typst version.
- **Two ways to use it:** the `mdpdf` command, and a library function, `convertMarkdownToPdf`.

Install from GitHub: `npm install github:rvs-23/rv-markdown-paper`. The package is not on the npm registry.
