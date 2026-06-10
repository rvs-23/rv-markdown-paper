# Changelog

## Unreleased

Target-parity pass: the canonical fixture's render
(`examples/editorial-swiss/output.pdf`) now tracks `target.pdf` closely.
Verified by page-by-page raster diff at matched DPI.

### Fixed

- `~` in body text was silently swallowed as a Typst non-breaking space
  ("~100 μs" rendered as " 100 μs"); `/` could open a `//` line comment.
  Both now escape in markup context.
- Endnotes mode dropped footnote definitions that were never referenced;
  they now append to the NOTES block after the referenced ones, in
  definition order.
- The cover TOC's first row inherited table-header styling (bold) from
  the document-level `table.cell` rule; the TOC is now a grid.

### Changed — design parity with target.pdf

- Body prose is ragged-right (justification off), including marginalia.
- Unordered lists mark with en-dashes at every level; ordered-list
  numerals are Instrument Serif italic.
- Dropcap is a true two-column lettrine (64pt cap, paragraph wraps
  beside it); the chapter opener widens to a ~140mm measure and opens
  with a deep band of air.
- Section eyebrows (H2) lose their rule; the `:::eyebrow` directive
  closes with a short ink dash instead of a full-width hairline.
- Cover: kicker middots render as spaced bullets, the subtitle shares
  the title's 95mm measure, the meta row closes with a hairline
  (double-rule stack above the TOC), masthead/foot margins match
  target, and an explicit `page:` on a TOC entry now wins over
  counter-resolved folios.
- Tables set data columns in JetBrains Mono Light (label column stays
  sans). Equation numbers and cross-refs render in the ornament voice
  (10pt italic serif, top-right of the panel).
- Exercise-box header clusters numeral/title/tag left on a shared
  baseline; admonitions, task lists, definition lists, and cover TOC
  rows all gain air per the target's rhythm.
- Syntax theme drops bold from keyword/function/tag/property scopes.
- Figures render full-bleed inside the hairline panel; the fixture's
  `pool-queue.svg` is redrawn grayscale on a grid-paper background.

### Tests

- 80 tests (up from 49): escape table, endnote ordering/orphans,
  attribute grammar and lifting, palette derivation, reading time,
  generator surface (tables, lists, directives, cross-refs, math,
  inline-code fencing), and a file snapshot of the fixture's generated
  Typst body.

## 0.2.0

- Package as installable CLI + library (`mdpdf` bin, `exports` entry).
- Endnotes mode (`footnotes: endnotes`) with auto-resolved cover TOC
  page numbers.
- Bundled JetBrains Mono Light; cover `|` linebreak; weighted table
  fr columns.
- Editorial template: cover page, marginalia rail, sig-numeral rail
  glyph, page choreography for the canonical 6-page fixture.

## 0.1.0

- Initial pipeline: Markdown → mdast (remark) → Typst → PDF with the
  fixed Editorial + Swiss design system and bundled fonts.
