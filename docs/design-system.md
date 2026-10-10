# Design system

The look of every PDF comes from one Typst template. This doc describes what it draws and where to change it. [architecture.md](architecture.md) explains how the template is loaded.

## Contents

- [Principles](#principles)
- [Where the design lives](#where-the-design-lives)
- [Type](#type)
- [Fonts](#fonts)
- [Colour](#colour)
- [Page geometry](#page-geometry)
- [Header and footer](#header-and-footer)
- [Watermark](#watermark)
- [Components](#components)
- [Changing the design](#changing-the-design)

## Principles

1. **One design, no themes.** Authors choose a paper colour and nothing else visual. Every document from every author looks like it belongs to the same book.
2. **One ink.** Text is a near-black `#11131A` that steps down through four lighter greys for secondary text. The `:::danger` callout is the only inverted block, light text on ink, and nothing else inverts.
3. **Each font has one job.** Archivo sets body text, headings, tables and labels. Instrument Serif appears only in italic, only as ornament. JetBrains Mono sets code and table data, except a table's first column, which holds labels in Archivo.
4. **The template is the design.** The TypeScript code only marks what each block is. All styling is in the template.

## Where the design lives

```text
typst/local/mdpaper/0.1.0/
  template.typ    Page setup, type, header, footer, every component
  palette.typ     Colours, derived from the paper colour
  theme.tmTheme   Grayscale syntax highlighting for code blocks
  typst.toml      Package manifest (name mdpaper, version 0.1.0)
```

[architecture.md](architecture.md#why-it-is-built-this-way) explains the folder path and the `0.1.0`.

## Type

Body text is Archivo Light at 10.5 pt, ragged right, with hyphenation off.

Writers open a section with `##` (a small label) followed by `###` (the visible title):

| Markdown | Renders as |
|---|---|
| `#` | Document title, Archivo 28 pt. Only used when there's no cover. |
| `##` | Section label: 9 pt tracked uppercase (`7.4 · SIZING THE POOL`) |
| `###` | Display heading, Archivo 21 pt |
| `####` | Sub-heading, 14 pt; a leading number like `7.1.1` is muted |
| `#####` | Small inline label, 10.5 pt |
| `######` | Aside in Instrument Serif italic, 10 pt |

Instrument Serif italic is kept for ornament: page numbers, drop caps, pull quotes, equation numbers, figure labels and ordered-list numerals. Body italic stays in Archivo, because the serif italic is too loud for running text.

## Fonts

Typst can only use the fonts in `assets/fonts/`, because it runs with system and built-in fonts disabled. When the design font lacks a character, Typst falls back to another bundled font that has it.

| Font | Used for | Licence |
|---|---|---|
| Archivo | Body, headings, tables, labels | OFL 1.1 |
| Instrument Serif | Italic ornament | OFL 1.1 |
| JetBrains Mono | Code, table data | OFL 1.1 |
| Noto Sans Devanagari | Hindi and other Devanagari text | OFL 1.1 |
| Noto Sans Bengali | Bengali text | OFL 1.1 |
| Noto Sans Kannada | Kannada text | OFL 1.1 |
| Noto Sans Telugu | Telugu text | OFL 1.1 |
| Noto Emoji | Emoji, in monochrome to keep one ink | OFL 1.1 |
| Libertinus Serif | Greek, Cyrillic and Hebrew fallback | OFL 1.1 |
| New Computer Modern Math | Formulas | GUST Font License |

Any other script (Chinese, Arabic, …) has no font. The converter stops with the characters and their lines rather than let Typst drop them. Supporting a new script means adding its font files to `assets/fonts/`.

## Colour

[`palette.typ`](../typst/local/mdpaper/0.1.0/palette.typ) builds every colour from the paper colour. The ink greys are fixed. The panel and rule tones are the paper darkened by a set amount, so they stay in tune with any paper:

| Token | Value | Used for |
|---|---|---|
| `c-paper` | The paper colour | Page background |
| `c-surface` | Paper darkened 7% | Code panels, note and tip callouts |
| `c-surface-2` | Paper darkened 11% | Code headers, warning callouts |
| `c-hairline` | Paper darkened 21% | Rules and table lines |
| `c-ink` … `c-mute-2` | `#11131A` to `#8B8E97` | Text, from primary to faint |

The paper colour comes from `--paper-bg` or `paperBg`, which accept three names or any `#RRGGBB`:

| Name | Hex | Feel |
|---|---|---|
| `glacier` | `#FAFBFC` | Clean white with the faintest cool tint |
| `platinum` (default) | `#F4F4F4` | Neutral silver-grey |
| `parchment` | `#F5EEDD` | Subtle warm gold |

The names are defined in `PAPER_PRESETS` in [`options.ts`](../src/config/options.ts).

## Page geometry

The default page is A4 with margins of 24 mm at the top and 22 mm on the other sides.

The right side can hold a **rail**: a 35 mm column for `:::margin` notes and the large section numeral. The rail is only reserved when a document uses it. Without it, the text column widens to a reading measure of about 140 mm instead of leaving an empty band. `page-right` in the template computes the right margin:

| Document | Right margin (default) | Text column on A4 |
|---|---|---|
| Uses the rail | `margin-right` + 5 mm gap + 35 mm rail = 62 mm | 126 mm |
| No rail | `margin-right` + 26 mm = 48 mm | 140 mm |

The chapter-opener page always uses the wider no-rail column.

## Header and footer

**Header.** The running header shows one locator on the left: `Ch. 07 — Thread pools` when a chapter is set, otherwise `Part <part>`, then the `section` text, then the title. It doesn't repeat the section number, which the rail numeral already shows. The header is hidden on the cover, the title page and the chapter opener.

**Footer.** The left side shows the series and edition when they're set. The right side shows the author's signature, then the page number:

```text
Python in Practice · Edition 2                    AUTHOR · RISHAV   086
```

The signature uses the author's first name in the tracked label style; `--no-author` hides it. The page number is zero-padded to three digits and offset by `pageStart`. The footer is hidden on the cover.

## Watermark

With `watermark: "Draft"`, the text is set in uppercase across every page, cover included, behind the content. It is scaled to span the page width and drawn in `c-surface`, the same faint tone as the callout panels, so it stays quiet on every paper colour.

## Components

Each Markdown construct maps onto one template function. [markdown-guide.md](markdown-guide.md) shows the syntax.

| Markdown | Template function | Look |
|---|---|---|
| `:::note` / `:::tip` / `:::warning` | `note` / `tip` / `warning` | Tinted panel with a left rule and a small label. Never split across pages. |
| `:::danger` | `danger` | Inverted: light text on an ink panel |
| `:::margin` | `marg` | Note in the right rail, aligned with the next paragraph |
| `:::epigraph` | `epigraph` | 20 pt serif italic pull quote with a tracked attribution |
| `:::exbox` | `exbox` | Exercise: large serif numeral, title and tag |
| `:::eyebrow` / `:::dropcap` | `eyebrow` / `dropcap` | Chapter-opener label; 64 pt serif initial |
| Code fence with `filename=` | `code-block` | Panel with a filename and language strip |
| ` ```mermaid ` | `diagram` | Mermaid's neutral theme, in a figure panel at natural width |
| Table | `md-table` | Columns sized to their content; header rule, no stripes. The first column is labels in Archivo, the rest data in JetBrains Mono. |
| Task list | `task-list` | Ink checkboxes; done items muted |
| `==highlight==` | `mark` | Grey marker behind the text |
| `---` | `rule` | Full-width hairline |

## Changing the design

1. Edit [`template.typ`](../typst/local/mdpaper/0.1.0/template.typ) or [`palette.typ`](../typst/local/mdpaper/0.1.0/palette.typ).
2. Re-render every committed example PDF and look at the ones that changed. [development.md](development.md#committed-pdfs) has the command.
3. Compare the example chapter against `examples/editorial-swiss/target.pdf`, the design target it was built from.
