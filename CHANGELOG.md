# Changelog

## 0.3.0 (2026-10-01)

Needs Typst 0.14 or newer.

### Added

- **Obsidian notes render as written:** `> [!tip]` callouts,
  `[[wikilinks]]` (as their text), `![[image.png]]` embeds (found by
  name in or below the note's folder), `==highlights==`, with
  `%%comments%%` and `^block-ids` removed.
- **Scripts:** Devanagari, Bengali, Kannada, Telugu and emoji render,
  via bundled Noto fonts (weights 300–700) and monochrome Noto Emoji.
- **Paper colours:** `--paper-bg` / `paperBg` take `glacier` (#FAFBFC),
  `platinum` (#F4F4F4, the default) and `parchment` (#F5EEDD), or any
  #RRGGBB.
- **Author signature:** the footer is signed with the author's first
  name before the folio (`AUTHOR · RISHAV`). `--no-author` /
  `showAuthor: false` leave it out.
- **Watermark:** `--watermark "Draft"` / `watermark:` sets faint text
  across every page, scaled to the page width.
- **Bracketed spans:** `[text]{.muted}` and `[text]{.underline}`.
- **Reference-style links and images** (`[text][ref]`, `[ref]`,
  `![alt][ref]` with a `[ref]: url` definition).
- `---` renders as a hairline rule.
- `ConfigError` is exported from the library entry.
- `examples/kannada-notes/`, a real study document, as a regression
  fixture.
- Documentation in `docs/`: architecture, pipeline, design system,
  configuration, development and a Markdown guide. The README is a
  short introduction.

### Changed

- **Tables:** columns are sized to their content, measured in the real
  fonts, and tables break across pages with the header row repeated.
- **Page width:** the right-hand margin rail is reserved only when a
  document has `:::margin` notes or `7.1`-style section numbers. Other
  documents get a ~140mm text column.
- **Fonts:** every font a PDF can use ships in `assets/fonts`, including
  the fallbacks Typst used to supply itself (Libertinus Serif, New
  Computer Modern Math). Typst runs with `--ignore-embedded-fonts`.
- **Unsupported characters fail the render**, with their code point and
  line, instead of silently disappearing.
- **Math** is LaTeX converted by `tex2typst`. Unknown commands fail with
  the formula named, and a raw `#` or `"` is rejected, since either
  could run Typst code.
- **Rendering writes nothing beside the source:** the template loads as
  a Typst local package (`typst/`) and the document compiles from stdin,
  so read-only folders work.
- **Running header:** no longer repeats the section number, and falls
  back to the document title when no chapter, part or section is set.
- **Config:** unknown keys in `mdpdf.config.json` are errors; frontmatter
  typos of real options warn with a suggestion. Library callers'
  overrides are validated like every other layer.
- Links take the colour of the text around them.
- A drop cap keeps leading opening punctuation with its letter (`“A`).
- Install is from GitHub (`npm install github:rvs-23/rv-markdown-paper`);
  the package is not on the npm registry.
- Design parity with `target.pdf`: ragged-right body, en-dash list
  markers, a two-column drop cap, a wider chapter opener, the cover's
  rules and spacing, mono table data, grayscale figures.

### Fixed

- Bold or italic starting inside a word (`oota**kke**`) compiles.
- Links whose URL contains `@host:port` or `{k:v}` parse.
- Inline code containing backticks compiles, and text glued to an inline
  call (`~~x~~(y)`, `[^1].Next`) no longer extends it.
- `~` and `//` in text, `//` in a cover subtitle, and an escaped
  `1\. text` paragraph render as typed.
- `--margin-right` / `margins.right` take effect.
- `--no-cover` with a frontmatter cover keeps the H1 title.
- A cover title with no comma no longer gets a trailing comma.
- Ordered lists keep a start number other than 1.
- A self-referencing footnote reports the cycle instead of overflowing
  the stack. Endnotes keep definitions that are never referenced.

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
