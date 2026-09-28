# Changelog

## Unreleased

### Added — scripts

- Devanagari, Kannada and emoji render via bundled fallback fonts (Noto
  Sans Devanagari / Kannada, weights 300–700, and monochrome Noto Emoji).
  Before, they rendered as blanks because only the three design fonts
  were loaded.

### Changed — page width

- The right-hand marginalia rail is reserved only when a document has
  `:::margin` notes or `7.1`-style H2 numerals. Other documents get a
  ~140mm text column instead of an empty 40mm band. Documents that use
  the rail render unchanged.

### Fixed

- Tables break across pages. A table taller than the space left on a
  page used to jump whole to the next page, leaving its heading on a
  near-empty page; the header row now repeats on the continuation.
- `--margin-right` / `margins.right` was ignored (the right margin was
  hardwired to the rail); it now sets the outer margin.
- Bold or italic starting inside a word (`oota**kke**`) no longer fails
  to compile.

### Fixed — review pass (Markdown outside the canonical fixture)

- LaTeX math now converts through `tex2typst`: `$ab$` no longer fails
  with "unknown variable", `\frac{a}{b}` no longer prints as "frac {a}{b}",
  and unknown commands fail with the formula named.
- Math rejects a raw `#` or `"`, which could run Typst code (including
  network package imports) from inside `$…$`.
- Links whose URL contains `@host:port` or `{k:v}` parse again.
- Inline code containing backticks compiles; text glued to an inline call
  (`~~x~~(y)`, `[^1].Next`) no longer extends it.
- A cover subtitle containing `//` compiles; an escaped `1\. text`
  paragraph stays prose instead of becoming a numbered list.
- `--no-cover` with a frontmatter cover keeps the H1 title.
- `---` renders as a hairline rule; ordered lists keep a start number
  other than 1.
- A self-referencing footnote reports the cycle instead of overflowing
  the stack.
- Unknown keys in `mdpdf.config.json` are errors; frontmatter typos of
  real options warn with a suggestion.

### Changed — rendering

- The template ships as a Typst local package (`typst/`) and the document
  compiles from stdin: nothing is written beside the source Markdown, so
  read-only source dirs work. The palette derives from `--input paper-bg`
  in Typst. Committed PDFs are byte-identical.

### Target-parity pass

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
