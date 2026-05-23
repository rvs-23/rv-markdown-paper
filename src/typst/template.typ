// rv-markdown-paper — Editorial + Swiss template.
//
// Design language: neutral light-gray page (#E8E8E8), single-ink ramp, three-font
// system. Body sans is Archivo; ornament voice is Instrument Serif Italic
// (folios, dropcaps, pull quotes, equation tags); code is JetBrains Mono.
//
// Layout: A4, two columns. Content column runs the main flow; a 35mm
// marginalia rail sits in the right page margin. Fenced-div `:::margin`
// notes are rendered there and auto-align to the paragraph that follows.

// ---------- color tokens ----------
// Imported from palette.typ so render.ts can swap in a derived palette
// when the CLI passes --paper-bg. Defaults are the canonical Editorial+
// Swiss neutral grays; see palette.typ for the full reference.

#import "palette.typ": *

// ---------- fonts ----------
// All three families ship in `assets/fonts/` and are loaded with
// `--ignore-system-fonts`. No fallbacks: a missing face must fail loud,
// not silently substitute and drift from the reference.

#let f-sans   = "Archivo"
#let f-serif  = "Instrument Serif"
#let f-mono   = "JetBrains Mono"

// ---------- geometry ----------
// `rail-width` = 35mm, `rail-gap` = 5mm between content column and rail,
// `rail-outer` = 22mm from rail to page edge. Right margin of the page is
// their sum. The `place(dx:, dy:)` offset in `marg()` is `content-width +
// rail-gap` so the note lands at the left edge of the rail.

#let rail-width = 35mm
#let rail-gap   = 5mm
#let rail-outer = 22mm

// ---------- marginalia ----------
// `#marg(label, body)` places a labelled note in the right rail, anchored to
// its vertical position in source flow. The generator emits `#marg(...)`
// BEFORE its anchor paragraph so `dy` lands at the anchor's top. State on
// `_marg-bottom` tracks the last note's bottom y on the current page; if a
// following note's anchor sits above that, we push it down by `gap`.
//
// The state is reset on every page-break via `#set page(background: ...)`.

#let _marg-bottom = state("marg-bottom", 0pt)

// Geometry state, populated by `paper()` so `marg()` can derive its
// horizontal offset from the actual page width and margins rather than
// hard-coding a number for A4. Default values reproduce the previous
// constant (131mm dx on A4) so this state is safe even when paper()
// hasn't run yet (e.g. fixtures that call marg directly).
#let _marg-geom = state(
  "marg-geom",
  (left: 22mm, right: 62mm, gap: 5mm, width: 35mm),
)

#let marg(label: none, body) = context {
  let geom = _marg-geom.get()
  let note-content = block(width: geom.width, above: 0pt, below: 0pt)[
    #line(length: 100%, stroke: 0.4pt + c-hairline)
    #v(4pt)
    #if label != none {
      text(font: f-sans, size: 7.5pt, weight: 500, tracking: 0.14em, fill: c-ink-2)[
        #upper(label)
      ]
      v(3pt)
    }
    #set par(leading: 0.45em)
    #text(font: f-sans, size: 8.5pt, fill: c-muted)[#body]
  ]
  let here-y = here().position().y
  let last-bottom = _marg-bottom.get()
  let gap = 8pt
  let actual-y = calc.max(here-y, last-bottom + gap)
  let shift = actual-y - here-y
  let h = measure(note-content).height
  // dx is relative to the content column's left edge (the surrounding
  // flow container). The rail sits to its right with `rail-gap` between,
  // so dx = content-column-width + rail-gap = (page.width - margin-left
  // - effective-right) + rail-gap. Reading page.width here lets the
  // marginalia track A4/Letter/custom margins without manual tweaks.
  let content-width = page.width - geom.left - geom.right
  place(dx: content-width + geom.gap, dy: shift, note-content)
  _marg-bottom.update(actual-y + h)
}

// ---------- ornamental helpers ----------

// Eyebrow: an uppercase mono-ish kicker above a section. Driven by
// `::: eyebrow ... :::` in markdown.
#let eyebrow(body) = block(above: 1.2em, below: 0.6em)[
  #text(
    font: f-sans, size: 8pt, weight: 600, tracking: 0.18em, fill: c-ink-2,
  )[#upper(body)]
  #v(4pt)
  #line(length: 100%, stroke: 0.5pt + c-hairline)
]

// Dropcap: the first paragraph of a chapter opener. The generator splits
// the leading letter off the paragraph and passes it as the first argument;
// the rest of the body flows as normal paragraph text after it.
//
// The big letter sits in a box with `baseline: 0.55em` so it protrudes
// upward by roughly two baselines while the inline layout treats it as a
// single glyph. Not a true text-wrapping lettrine (Typst doesn't do that),
// but visually distinctive and unambiguously editorial.
#let dropcap(letter, body) = block(above: 0.3em, below: 1em)[
  #set par(first-line-indent: 0em, justify: true)
  #box(baseline: 0.55em, text(
    font: f-serif, style: "italic", weight: 400, size: 52pt, fill: c-ink,
  )[#letter])
  #h(1pt)
  #body
]

// Pull quote / epigraph: italic serif, indented, hairline rule above and
// below. Used by `::: epigraph`.
#let epigraph(body) = block(above: 1.6em, below: 1.6em, breakable: false)[
  #line(length: 40%, stroke: 0.5pt + c-hairline)
  #v(0.8em)
  #set par(leading: 0.7em, justify: false)
  #text(font: f-serif, style: "italic", size: 13pt, fill: c-ink-2)[#body]
  #v(0.8em)
  #line(length: 40%, stroke: 0.5pt + c-hairline)
]

// Admonitions — note / tip / warning / danger.
// Per spec §12.6: same surface fill behind note + tip, distinguished by
// left-rule weight + colour (ink-3 vs ink). Warning steps up to a warmer
// surface (surface-2) with an ink-2 left rule plus top/bottom hairlines —
// the extra borders elevate it without spending colour. Danger is the only
// inversion: ink fill, paper-coloured text.

#let _admonition-label(label) = text(
  font: f-sans, size: 8pt, weight: 500, tracking: 0.14em, fill: c-ink,
)[#upper(label)]

// `breakable: false` on every admonition keeps the tracked-uppercase
// label and the body together. A block too tall for the current page
// forces an early page break; the previous (default `breakable: auto`)
// behaviour split the DANGER label from its body across page borders,
// which is materially worse. See examples/demos/07-oversized-admonition.md
// for the regression fixture covering the early-break case.
#let note(body) = block(
  above: 1em, below: 1em, width: 100%, breakable: false,
  fill: c-surface,
  stroke: (left: 1pt + c-ink-3),
  inset: (left: 0.9em, right: 0.9em, top: 0.7em, bottom: 0.7em),
)[
  #_admonition-label("note")
  #v(3pt)
  #body
]

#let tip(body) = block(
  above: 1em, below: 1em, width: 100%, breakable: false,
  fill: c-surface,
  stroke: (left: 2pt + c-ink),
  inset: (left: 0.9em, right: 0.9em, top: 0.7em, bottom: 0.7em),
)[
  #_admonition-label("tip")
  #v(3pt)
  #body
]

#let warning(body) = block(
  above: 1em, below: 1em, width: 100%, breakable: false,
  fill: c-surface-2,
  stroke: (
    left: 2pt + c-ink-2,
    top: 0.4pt + c-hairline,
    bottom: 0.4pt + c-hairline,
  ),
  inset: (left: 0.9em, right: 0.9em, top: 0.7em, bottom: 0.7em),
)[
  #_admonition-label("warning")
  #v(3pt)
  #body
]

#let danger(body) = block(
  above: 1em, below: 1em, breakable: false,
  fill: c-danger-bg,
  inset: (x: 0.9em, y: 0.7em),
)[
  #set text(fill: c-danger-fg)
  // Inline-code chips default to a light fill on dark text; invert here so
  // they stay readable against the danger block.
  #show raw.where(block: false): it => box(
    fill: rgb("#2A2D36"),
    inset: (x: 3pt, y: 0pt),
    outset: (y: 2pt),
    radius: 1.5pt,
    text(font: f-mono, size: 0.92em, fill: c-danger-fg, it),
  )
  #text(font: f-sans, size: 8pt, weight: 500, tracking: 0.14em)[#upper("danger")]
  #v(3pt)
  #body
]

// Exercise box: top hairline rule (no surrounding box), italic-serif numeral
// on the left, optional uppercase tracked tag on the right, body below.
// Driven by `::: {.exbox number="01" tag="..."}`.
#let exbox(number: none, tag: none, body) = block(
  above: 1.2em, below: 1.2em, breakable: false,
  stroke: (top: 0.4pt + c-hairline),
  inset: (top: 12pt, bottom: 4pt),
)[
  #grid(
    columns: (auto, 1fr, auto),
    column-gutter: 1em,
    align: (left + horizon, left + horizon, right + horizon),
    if number != none {
      text(font: f-serif, style: "italic", weight: 400, size: 32pt, fill: c-ink)[
        #number
      ]
    } else [],
    [],
    if tag != none {
      text(font: f-sans, size: 8pt, weight: 500, tracking: 0.14em, fill: c-muted)[
        #upper(tag)
      ]
    } else [],
  )
  #v(0.3em)
  #body
]

// ---------- code block with filename / lang-label header ----------
// Pandoc-style attributes on a fenced block (`{.python filename="x.py"
// lang-label="Python 3.12"}`) surface in the generator as a wrapper call:
//   #code-block(filename: "x.py", lang-label: "Python 3.12")[```python ... ```]
// The header strip only renders when at least one of the two is set.

// The wrapper adds a header strip above the raw block. It does NOT set fill
// or stroke — the raw show-rule below already paints the body panel with
// `c-surface` and hairline borders. This keeps bare ``` blocks and wrapped
// blocks visually identical.
#let code-block(filename: none, lang-label: none, body) = block(
  above: 1em, below: 1em, breakable: true,
)[
  #if filename != none or lang-label != none {
    block(
      fill: c-surface-2,
      inset: (x: 12pt, y: 6pt),
      width: 100%,
      stroke: 0.5pt + c-hairline,
    )[
      #grid(
        columns: (1fr, auto),
        text(font: f-sans, size: 8pt, weight: 500, fill: c-ink-2)[
          #if filename != none { filename } else []
        ],
        text(font: f-mono, size: 7.5pt, weight: 400, fill: c-mute-2)[
          #if lang-label != none { lang-label } else []
        ],
      )
    ]
  }
  #body
]

// ---------- task list ----------
// Per spec §12.6: square ink-bordered checkbox; checked items invert to a
// filled ink box with a page-coloured tick, and their body text drops to
// muted to read as "done". Rendered as an explicit stack of grid rows so
// the items do NOT carry the native Typst list bullet — otherwise checked
// items doubled up as `• ☑ Text`.

#let task-box(checked) = box(
  width: 0.78em, height: 0.78em, baseline: 0.1em,
  stroke: 0.6pt + c-ink,
  fill: if checked { c-ink } else { none },
  inset: 0pt,
)[
  #if checked {
    align(center + horizon, text(
      font: f-mono, size: 0.7em, weight: 700, fill: c-paper,
    )[x])
  }
]

#let task-item(checked, body) = grid(
  columns: (auto, 1fr),
  column-gutter: 0.6em,
  align: (top, top),
  task-box(checked),
  if checked { text(fill: c-muted, body) } else { body },
)

#let task-list(..items) = block(above: 0.6em, below: 0.6em)[
  #stack(spacing: 0.45em, ..items.pos())
]

// ---------- legacy callouts ----------
// The old v0.2 generator emitted `#warn[...]` and `#system[...]`. Keep them
// as thin aliases so any existing markdown continues to render.
#let warn(body) = warning(body)
#let system(body) = note(body)

// ---------- cover page ----------
// Rendered when `show-cover = true` and a cover config was passed. Three
// stacked blocks: kicker (Part · Chapter), display title (mixed upright sans
// + italic serif accent), meta column + TOC column on a single grid row.

#let _cover-page(
  kicker: none, title: none, subtitle: none,
  meta: (), toc: (),
  chapter: none, part: none, edition: none, volume: none,
  page-start: none, page-end: none,
) = [
  #set page(
    margin: (top: 24mm, right: 22mm, bottom: 22mm, left: 22mm),
    header: none, footer: none,
  )
  #block(height: 100%)[
    // Edition strip: top row with edition L, volume R, separated by a
    // hairline below. 8pt sans tracked uppercase muted. Only rendered
    // when edition or volume is set — skipped for cover configs that
    // don't carry book metadata.
    #if edition != none or volume != none {
      grid(
        columns: (1fr, auto),
        align: (left, right),
        text(font: f-sans, size: 8pt, weight: 500, tracking: 0.16em, fill: c-muted)[
          #if edition != none { upper(edition) }
        ],
        text(font: f-sans, size: 8pt, weight: 500, tracking: 0.16em, fill: c-muted)[
          #if volume != none { upper(volume) }
        ],
      )
      v(6pt)
      line(length: 100%, stroke: 0.4pt + c-hairline)
      v(20mm)
    }

    // Kicker line.
    #if kicker != none {
      text(font: f-sans, size: 9pt, weight: 600, tracking: 0.18em, fill: c-ink-2)[
        #upper(kicker)
      ]
    }
    #v(1.6em)

    // Display title — comma-split per spec §12.6: head ("Thread pools")
    // is upright Archivo 500 at 44pt; tail (everything from the first comma
    // on) is Instrument Serif italic at the same size, the ornament voice.
    #if title != none {
      let parts = title.split(",")
      let head = parts.at(0)
      let tail = if parts.len() > 1 { "," + parts.slice(1).join(",") } else { "" }
      par(leading: 0.32em)[
        #text(font: f-sans, size: 44pt, weight: 500, fill: c-ink, tracking: -0.5pt)[#head]#text(font: f-serif, style: "italic", size: 44pt, weight: 400, fill: c-ink, tracking: -0.5pt)[#tail]
      ]
    }
    #if subtitle != none {
      v(0.6em)
      par(leading: 0.48em, text(
        font: f-serif, style: "italic", size: 17pt, fill: c-ink-2,
      )[#subtitle])
    }

    #v(2em)
    #line(length: 60pt, stroke: 1pt + c-ink)
    #v(1.6em)

    // Meta — 3-col grid: (label / value) per cell, side by side.
    #if meta.len() > 0 {
      grid(
        columns: (1fr,) * meta.len(),
        column-gutter: 14mm,
        ..meta.map(pair => stack(spacing: 6pt,
          text(font: f-sans, size: 8pt, weight: 600, tracking: 0.16em, fill: c-mute-2)[
            #upper(pair.label)
          ],
          text(font: f-sans, size: 10pt, fill: c-ink-2)[#pair.value],
        )),
      )
      v(1.6em)
    }

    // "In this chapter" — section list as 3-col grid (id / title / page).
    #if toc.len() > 0 {
      line(length: 100%, stroke: 1pt + c-ink)
      v(0.6em)
      text(font: f-sans, size: 9pt, weight: 600, tracking: 0.16em, fill: c-ink-2)[
        #upper("In this chapter")
      ]
      v(0.8em)
      stack(spacing: 0.55em, ..toc.map(entry => grid(
        columns: (52pt, 1fr, auto),
        column-gutter: 1em,
        text(font: f-sans, size: 9pt, weight: 500, tracking: 0.04em, fill: c-ink-2)[#entry.id],
        text(font: f-sans, size: 10pt, fill: c-ink)[#entry.title],
        text(font: f-serif, style: "italic", size: 12pt, fill: c-muted)[
          #entry.at("page", default: "")
        ],
      )))
    }

    // Cover-foot per spec §12.6: edition · "Ch. NN" · page-range, hairline
    // above. No ghost numeral — sig-numeral is suppressed on the cover.
    #v(1fr)
    #line(length: 100%, stroke: 0.4pt + c-hairline)
    #v(0.6em)
    #{
      let chapter-str = if chapter != none {
        let n = str(chapter)
        if n.len() == 1 { "Ch. 0" + n } else { "Ch. " + n }
      } else { "" }
      let page-range = if page-start != none and page-end != none {
        "pp. " + str(page-start) + " – " + str(page-end)
      } else { "" }
      grid(
        columns: (1fr, auto, 1fr),
        align: (left, center, right),
        text(font: f-sans, size: 8.5pt, fill: c-muted)[
          #if edition != none { edition } else []
        ],
        text(font: f-serif, style: "italic", size: 13pt, fill: c-ink)[#chapter-str],
        text(font: f-sans, size: 8.5pt, fill: c-muted)[#page-range],
      )
    }
  ]
  #pagebreak(weak: true)
]

// ---------- the document function ----------

#let paper(
  // classic
  title: none, subtitle: none, section: none,
  author: none, date: none, reading-time: none,
  // editorial
  chapter: none, part: none, edition: none, volume: none,
  page-start: none, page-end: none,
  cover: none,
  // layout
  page-size: "a4",
  margin-top: 24mm,
  margin-right: 22mm,
  margin-bottom: 22mm,
  margin-left: 22mm,
  show-header: true,
  show-footer: true,
  show-cover: true,
  theme-path: none,
  body,
) = {
  // --------- Base typography ---------
  set text(font: f-sans, size: 10.5pt, fill: c-ink, hyphenate: false)
  set par(leading: 0.62em, spacing: 1em, justify: true, first-line-indent: 0em)

  // --------- Page ---------
  // Right margin reserves the rail. The `marg()` helper places into that
  // reserved band; we publish the geometry it needs via `_marg-geom` so
  // its dx computation tracks actual page width / margins instead of
  // hardcoding A4.
  let effective-right = rail-gap + rail-width + rail-outer
  _marg-geom.update((
    left: margin-left,
    right: effective-right,
    gap: rail-gap,
    width: rail-width,
  ))
  set page(
    paper: page-size,
    fill: c-paper,
    margin: (top: margin-top, right: effective-right, bottom: margin-bottom, left: margin-left),
    background: context {
      _marg-bottom.update(0pt)
      []
    },
  )

  // --------- Headings: sans display ladder ---------
  set heading(numbering: none)

  // Heading ladder follows the mockup's editorial remap (not a 1:1
  // size-by-level cascade):
  //   H1 → chapter title (28pt body fallback when no cover is shown)
  //   H2 → small section eyebrow + hairline rule (NOT a display heading)
  //   H3 → display heading for that section (21pt — the visual H2)
  //   H4 → sub-heading (14pt)
  //   H5 → small inline label (10.5pt mixed case)
  //   H6 → tiny italic serif aside
  // The author writes ## for the section number and ### for the actual
  // visible title. The mockup CSS does the same: h2 is the "7.1 · TITLE"
  // eyebrow line, h3 is the "Why a pool" display.

  show heading.where(level: 1): it => block(above: 1.8em, below: 0.8em, breakable: false)[
    #text(font: f-sans, weight: 500, size: 28pt, fill: c-ink, tracking: -0.4pt)[
      #it.body
    ]
  ]
  show heading.where(level: 2): it => block(above: 2em, below: 0.9em, breakable: false)[
    #text(font: f-sans, weight: 500, size: 9pt, tracking: 0.16em, fill: c-ink-3)[
      #upper(it.body)
    ]
    #v(4pt, weak: true)
    #line(length: 100%, stroke: 0.4pt + c-hairline)
  ]
  show heading.where(level: 3): it => block(above: 1.2em, below: 1em, breakable: false)[
    #text(font: f-sans, weight: 500, size: 21pt, fill: c-ink, tracking: -0.25pt)[
      #it.body
    ]
  ]
  show heading.where(level: 4): it => block(above: 1.8em, below: 0.9em, breakable: false)[
    #text(font: f-sans, weight: 500, size: 14pt, fill: c-ink)[#it.body]
  ]
  show heading.where(level: 5): it => block(above: 1.6em, below: 0.6em)[
    #text(font: f-sans, weight: 500, size: 10.5pt, fill: c-ink)[#it.body]
  ]
  show heading.where(level: 6): it => block(above: 1em, below: 0.3em)[
    #text(font: f-serif, style: "italic", weight: 400, size: 10pt, fill: c-ink-2)[
      #it.body
    ]
  ]

  // --------- Inline ---------
  show link: it => underline(offset: 1.8pt, stroke: 0.5pt, text(fill: c-ink, it))
  show strong: set text(weight: 600)
  // Emphasis stays in the body family (Archivo Italic). Instrument Serif
  // italic is reserved for ornamental slots — cover subtitle, dropcap,
  // epigraphs, equation tags, figure captions — not running prose. The
  // font is re-asserted in an explicit `text()` wrapper because `set text`
  // inside a `show emph` rule does not always commit Typst to the Italic
  // variant in the font registry.
  show emph: it => text(font: f-sans, style: "italic")[#it.body]

  // --------- Tables ---------
  // Mockup: no surrounding box; header row gets a 0.75pt ink rule below it;
  // every body row gets a 0.4pt hairline below. First column is sans, the
  // rest is mono with tabular numerals so digits line up.
  set table(
    stroke: (x, y) => (
      bottom: if y == 0 { 0.75pt + c-ink } else { 0.4pt + c-hairline },
    ),
    inset: (x: 10pt, y: 7pt),
    align: left + horizon,
  )
  // Document-level `set par(justify: true)` propagates into table cells,
  // producing ugly inter-word gaps in narrow columns (visible in the Notes
  // columns of 03-structured.pdf and 06-full-paper.pdf before this rule).
  // Tabular content should ragged-right; turn justification off here.
  show table.cell: it => {
    set par(justify: false)
    if it.y == 0 {
      text(font: f-sans, size: 8.5pt, weight: 500, fill: c-ink-2, tracking: 0.02em, it)
    } else if it.x == 0 {
      text(font: f-sans, size: 9.3pt, fill: c-ink, it)
    } else {
      text(font: f-mono, size: 9.3pt, fill: c-ink, it)
    }
  }

  // --------- Figures ---------
  // Caption: hairline rule above, then a two-column grid — italic-serif
  // `Fig. X.Y` lead in ink, sans body in muted gray. Mirrors the mockup's
  // figcaption row.
  set figure(supplement: [Fig.], numbering: "1.1")
  show figure.caption: it => block(width: 100%, above: 0.6em)[
    #set align(left)
    #block(stroke: (top: 0.3pt + c-hairline), inset: (top: 5pt))[
      #grid(
        columns: (auto, 1fr),
        column-gutter: 10pt,
        text(font: f-serif, style: "italic", size: 10pt, fill: c-ink)[
          #it.supplement #context it.counter.display(it.numbering)
        ],
        text(font: f-sans, size: 8.5pt, fill: c-muted)[#it.body],
      )
    ]
  ]

  // --------- Code ---------
  // `set raw(theme: ...)` must live at function scope, not inside an
  // `if {…}` — Typst `set` rules expire at the closing brace of their
  // enclosing block, so wrapping this in a conditional `{ set raw(theme:
  // theme-path) }` would make the rule die immediately and never reach
  // subsequent raw blocks. `none` is Typst's no-op for `set raw(theme:)`,
  // so an unconditional set is safe even when no theme was passed.
  set raw(theme: theme-path)
  // Disable contextual + standard ligatures inside raw so JetBrains Mono
  // does not collapse `->`, `==`, `>=`, `--`, `!=`, `<=` into `→`, `=`,
  // `≥`, `–`, `≠`, `≤`. Code copied out of the PDF must round-trip back
  // to its source form character-for-character.
  show raw: set text(features: ("calt": 0, "liga": 0))
  // Raw block: no own fill/stroke — the wrapper provides the panel chrome.
  // A bare ``` fence without attributes still gets a subtle panel via the
  // outer block set on top of this rule; to guarantee one even when called
  // standalone, we give it a light surface fill only when NOT already inside
  // a `code-block` wrapper (which it detects via parent fill). Simplest: keep
  // the standalone case visually identical to the wrapped case.
  // Block raw: `justify: false` so a soft-wrapped long line doesn't
  // stretch with cavernous inter-token gaps. Font stays at 8.6pt — the
  // editorial fixture's pagination is calibrated around this size, and
  // dropping to 8pt re-compresses sections enough that the §7.5
  // pagebreak alone no longer reaches 6 pages.
  show raw.where(block: true): it => block(
    fill: c-surface,
    inset: (x: 12pt, y: 10pt),
    width: 100%,
    stroke: 0.5pt + c-hairline,
  )[
    #set par(justify: false)
    #text(font: f-mono, size: 8.6pt, it)
  ]
  show raw.where(block: false): it => box(
    fill: c-surface,
    inset: (x: 4pt, y: 0pt),
    outset: (y: 2pt),
    radius: 0pt,
    text(font: f-mono, size: 0.88em, fill: c-ink, it),
  )

  // --------- Blockquote ---------
  show quote.where(block: true): it => block(
    inset: (left: 1.2em, y: 0.5em),
    spacing: 1.2em,
    stroke: (left: 2pt + c-hairline),
    text(font: f-serif, style: "italic", size: 12pt, fill: c-ink-2, it.body),
  )

  // --------- Math ---------
  set math.equation(numbering: "(1)", supplement: [Eq.])
  show math.equation.where(block: true): it => block(
    above: 1em, below: 1em,
    stroke: (top: 0.3pt + c-hairline, bottom: 0.3pt + c-hairline),
    inset: (top: 8pt, bottom: 8pt),
    width: 100%,
    it,
  )

  // --------- Running header/footer ---------
  let cover-active = show-cover and cover != none
  let footer-page-offset = if cover-active { 1 } else { 0 }

  let header-fn = if show-header {
    context {
      let p = counter(page).get().first()
      let on-cover = cover-active and p <= 1
      // Suppress the header on page 1 when an editorial title block is
      // doing the chrome (no full cover, but `title` is set). Otherwise
      // p.1 stacks the running header AND the title block, both carrying
      // the same kicker/title — visible in 06-full-paper.pdf before this.
      let on-title-page = not cover-active and title != none and p == 1
      if on-cover or on-title-page { [] } else {
        let left-cell = if part != none { part } else if section != none { section } else { "" }
        let center-cell = if title != none { title } else { "" }
        let right-cell = if edition != none { edition } else if date != none { date } else { "" }
        if left-cell == "" and center-cell == "" and right-cell == "" {
          []
        } else {
          set text(font: f-sans, size: 7.5pt, weight: 500, tracking: 0.14em, fill: c-muted)
          block(
            stroke: (bottom: 0.4pt + c-hairline),
            inset: (bottom: 5pt),
            grid(
              columns: (auto, 1fr, auto),
              column-gutter: 1.5em,
              align: (left + horizon, center + horizon, right + horizon),
              upper(left-cell),
              upper(center-cell),
              upper(right-cell),
            ),
          )
        }
      }
    }
  } else { none }

  let footer-fn = if show-footer {
    context {
      let p = counter(page).get().first()
      let on-cover = cover-active and p <= 1
      if on-cover { [] } else {
        let current = counter(page).get().first()
        let display-num = current - footer-page-offset + (
          if page-start != none { page-start - 1 } else { 0 }
        )
        set align(center)
        text(font: f-serif, style: "italic", size: 9pt, fill: c-muted)[#display-num]
      }
    }
  } else { none }

  set page(header: header-fn, footer: footer-fn)

  // --------- Cover ---------
  if cover-active {
    _cover-page(
      kicker: cover.at("kicker", default: none),
      title: cover.at("title", default: none),
      subtitle: cover.at("subtitle", default: none),
      meta: cover.at("meta", default: ()),
      toc: cover.at("toc", default: ()),
      chapter: chapter,
      part: part,
      edition: edition,
      volume: volume,
      page-start: page-start,
      page-end: page-end,
    )
  } else if title != none {
    // Editorial title block for documents without a full cover. Uses the
    // SAME size + family as H1 (Archivo sans 28pt 500) so the on-page
    // title ladder is one voice — the previous 30pt Instrument Serif
    // variant collided with the H1 show-rule's 28pt Archivo. Instrument
    // Serif italic stays reserved for ornament (folio, subtitles, pull
    // quotes) per the §12.1 design rule.
    block(below: 2em)[
      #if section != none {
        text(font: f-sans, size: 8.5pt, weight: 600, tracking: 0.18em, fill: c-ink-2)[
          #upper(section)
        ]
        v(0.6em)
      }
      #text(font: f-sans, weight: 500, size: 28pt, fill: c-ink, tracking: -0.4pt)[
        #title
      ]
      #if subtitle != none {
        v(0.3em)
        text(font: f-serif, style: "italic", size: 14pt, fill: c-ink-2)[#subtitle]
      }
      #v(0.6em)
      #line(length: 60pt, stroke: 1pt + c-ink)
    ]
  }

  body
}
