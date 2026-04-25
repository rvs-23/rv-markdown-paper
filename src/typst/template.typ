// rv-markdown-paper — Editorial + Swiss template.
//
// Design language: warm page tone (#EFEDE7), single-ink ramp, three-font
// system. Body sans is Archivo; ornament voice is Instrument Serif Italic
// (folios, dropcaps, pull quotes, equation tags); code is JetBrains Mono.
//
// Layout: A4, two columns. Content column runs the main flow; a 35mm
// marginalia rail sits in the right page margin. Fenced-div `:::margin`
// notes are rendered there and auto-align to the paragraph that follows.

// ---------- color tokens ----------

#let c-paper     = rgb("#EFEDE7")  // warm background
#let c-ink       = rgb("#11131A")  // primary text
#let c-ink-2     = rgb("#2A2D36")  // secondary text (eyebrows, labels)
#let c-ink-3     = rgb("#4A4D57")  // tertiary (kickers, eyebrow fills)
#let c-muted     = rgb("#686C76")  // captions, margin notes, meta cells
#let c-mute-2    = rgb("#8B8E97")  // very-light labels (lang-label, numerals)
#let c-hairline  = rgb("#C5C2BC")  // dividers, thin rules
#let c-surface   = rgb("#E4E1DA")  // code-block body, subtle panels
#let c-surface-2 = rgb("#DBD8D1")  // code-block header, warning panels
#let c-accent    = rgb("#11131A")  // reserved for single color event (e.g. danger)
#let c-danger-bg = rgb("#11131A")  // danger block inverts to ink-on-paper
#let c-danger-fg = rgb("#EFEDE7")

// ---------- fonts ----------
// Lists are tried in order; the first installed family wins. Fallbacks keep
// the template compiling even when Archivo / Instrument Serif are not yet
// staged in assets/fonts/.

#let f-sans   = ("Archivo", "IBM Plex Sans", "Helvetica", "Arial")
#let f-serif  = ("Instrument Serif", "IBM Plex Serif", "Lora", "Georgia")
#let f-mono   = ("JetBrains Mono", "Menlo", "Courier New")

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

#let marg(label: none, body) = context {
  let note-content = block(width: rail-width, above: 0pt, below: 0pt)[
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
  // dx = content-column width + rail-gap. For A4 @ (left 22mm, right 62mm),
  // content width = 210 − 22 − 62 = 126mm, so dx lands at 131mm — the left
  // edge of the rail. If page size / margins change, update this constant.
  place(dx: 131mm, dy: shift, note-content)
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
#let epigraph(body) = block(above: 1.6em, below: 1.6em)[
  #line(length: 40%, stroke: 0.5pt + c-hairline)
  #v(0.8em)
  #set par(leading: 0.7em, justify: false)
  #text(font: f-serif, style: "italic", size: 13pt, fill: c-ink-2)[#body]
  #v(0.8em)
  #line(length: 40%, stroke: 0.5pt + c-hairline)
]

// Admonitions — note / tip / warning / danger.
// Note: neutral hairline box.
// Tip: same box, different label.
// Warning: heavier left rule, ink label.
// Danger: inverted block — ink fill, paper text. Only color event allowed.

#let _admonition-label(label) = text(
  font: f-sans, size: 8pt, weight: 700, tracking: 0.14em, fill: c-ink,
)[#upper(label)]

#let note(body) = block(
  above: 1em, below: 1em,
  stroke: (left: 1pt + c-hairline),
  inset: (left: 0.8em, top: 0.4em, bottom: 0.4em),
)[
  #_admonition-label("note")
  #v(3pt)
  #body
]

#let tip(body) = block(
  above: 1em, below: 1em,
  stroke: (left: 1pt + c-hairline),
  inset: (left: 0.8em, top: 0.4em, bottom: 0.4em),
)[
  #_admonition-label("tip")
  #v(3pt)
  #body
]

#let warning(body) = block(
  above: 1em, below: 1em,
  stroke: (left: 1.5pt + c-ink),
  inset: (left: 0.8em, top: 0.4em, bottom: 0.4em),
)[
  #_admonition-label("warning")
  #v(3pt)
  #body
]

#let danger(body) = block(
  above: 1em, below: 1em,
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
  #text(font: f-sans, size: 8pt, weight: 700, tracking: 0.14em)[#upper("danger")]
  #v(3pt)
  #body
]

// Exercise box: numbered, tagged, hairline outline. Driven by
// `::: {.exbox number="01" tag="..."}`.
#let exbox(number: none, tag: none, body) = block(
  above: 1.4em, below: 1.4em,
  stroke: 0.6pt + c-hairline,
  inset: (x: 1em, y: 0.8em),
)[
  #grid(
    columns: (auto, 1fr, auto),
    column-gutter: 0.8em,
    if number != none {
      text(font: f-serif, style: "italic", size: 22pt, fill: c-ink)[#number]
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

// ---------- task list markers ----------

#let task-box(checked) = box(
  width: 0.78em, height: 0.78em, baseline: 0.1em,
  stroke: 0.6pt + c-ink,
  inset: 0pt,
)[
  #if checked {
    align(center + horizon, text(
      font: f-mono, size: 0.7em, weight: 700, fill: c-ink,
    )[x])
  }
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
    // Top: kicker line + ghosted chapter numeral.
    #if kicker != none {
      text(font: f-sans, size: 9pt, weight: 600, tracking: 0.18em, fill: c-ink-2)[
        #upper(kicker)
      ]
    }
    #v(1.6em)

    // Display title: two-line mixed voice.
    #if title != none {
      par(leading: 0.32em, text(
        font: f-serif, size: 52pt, weight: 400, fill: c-ink, tracking: -0.5pt,
      )[#title])
    }
    #if subtitle != none {
      v(0.8em)
      par(leading: 0.48em, text(
        font: f-serif, style: "italic", size: 18pt, fill: c-ink-2,
      )[#subtitle])
    }

    #v(2.4em)
    #line(length: 60pt, stroke: 1.2pt + c-ink)
    #v(2.4em)

    // Two-column footer grid: meta | toc.
    #grid(
      columns: (1fr, 1fr),
      column-gutter: 3em,
      // Meta column.
      if meta.len() > 0 {
        stack(spacing: 0.9em, ..meta.map(pair => [
          #text(font: f-sans, size: 7.5pt, weight: 600, tracking: 0.14em, fill: c-muted)[
            #upper(pair.label)
          ] \
          #text(font: f-serif, size: 11pt, fill: c-ink)[#pair.value]
        ]))
      } else [],
      // TOC column.
      if toc.len() > 0 {
        stack(spacing: 0.7em, ..toc.map(entry => [
          #grid(
            columns: (auto, 1fr),
            column-gutter: 1em,
            text(font: f-serif, style: "italic", size: 10pt, fill: c-ink-2)[#entry.id],
            text(font: f-sans, size: 10pt, fill: c-ink)[#entry.title],
          )
        ]))
      } else [],
    )

    // Ghosted chapter numeral — pinned bottom-right, weight 300, light tone.
    #v(1fr)
    #if chapter != none {
      align(right)[
        #text(font: f-serif, style: "italic", size: 140pt, fill: c-hairline, weight: 300)[
          #chapter
        ]
      ]
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
  // reserved band.
  let effective-right = rail-gap + rail-width + rail-outer
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
  show heading.where(level: 2): it => block(above: 1.6em, below: 0.4em, breakable: false)[
    #text(font: f-sans, weight: 500, size: 9pt, tracking: 0.16em, fill: c-ink-3)[
      #upper(it.body)
    ]
    #v(4pt, weak: true)
    #line(length: 100%, stroke: 0.4pt + c-hairline)
  ]
  show heading.where(level: 3): it => block(above: 0.8em, below: 0.4em, breakable: false)[
    #text(font: f-sans, weight: 500, size: 21pt, fill: c-ink, tracking: -0.25pt)[
      #it.body
    ]
  ]
  show heading.where(level: 4): it => block(above: 1.2em, below: 0.3em, breakable: false)[
    #text(font: f-sans, weight: 500, size: 14pt, fill: c-ink)[#it.body]
  ]
  show heading.where(level: 5): it => block(above: 0.9em, below: 0.2em)[
    #text(font: f-sans, weight: 500, size: 10.5pt, fill: c-ink)[#it.body]
  ]
  show heading.where(level: 6): it => block(above: 0.8em, below: 0.2em)[
    #text(font: f-serif, style: "italic", weight: 400, size: 10pt, fill: c-ink-2)[
      #it.body
    ]
  ]

  // --------- Inline ---------
  show link: it => underline(offset: 1.8pt, stroke: 0.5pt, text(fill: c-ink, it))
  show strong: set text(weight: 600)
  show emph: set text(font: f-serif, style: "italic", fill: c-ink-2)

  // --------- Tables ---------
  set table(stroke: none, inset: (x: 8pt, y: 6pt), align: left + horizon)
  show table: it => block(
    stroke: (top: 0.8pt + c-ink, bottom: 0.8pt + c-ink),
    inset: 0pt,
    it,
  )
  show table.cell.where(y: 0): it => text(
    font: f-sans, size: 8.5pt, weight: 600, tracking: 0.14em, fill: c-ink,
  )[#upper(it)]

  // --------- Figures ---------
  set figure(supplement: [Fig.], numbering: "1")
  show figure.caption: it => block(width: 100%)[
    #set align(left)
    #text(font: f-serif, style: "italic", size: 9pt, fill: c-muted)[
      #it.supplement #context it.counter.display(it.numbering). #it.body
    ]
  ]

  // --------- Code ---------
  if theme-path != none { set raw(theme: theme-path) }
  // Raw block: no own fill/stroke — the wrapper provides the panel chrome.
  // A bare ``` fence without attributes still gets a subtle panel via the
  // outer block set on top of this rule; to guarantee one even when called
  // standalone, we give it a light surface fill only when NOT already inside
  // a `code-block` wrapper (which it detects via parent fill). Simplest: keep
  // the standalone case visually identical to the wrapped case.
  show raw.where(block: true): it => block(
    fill: c-surface,
    inset: (x: 12pt, y: 10pt),
    width: 100%,
    stroke: 0.5pt + c-hairline,
    text(font: f-mono, size: 8.6pt, it),
  )
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

  // --------- Running header/footer ---------
  let cover-active = show-cover and cover != none
  let footer-page-offset = if cover-active { 1 } else { 0 }

  let header-fn = if show-header {
    context {
      let p = counter(page).get().first()
      let on-cover = cover-active and p <= 1
      if on-cover { [] } else {
        set text(font: f-sans, size: 7.5pt, weight: 500, tracking: 0.14em, fill: c-muted)
        block(
          stroke: (bottom: 0.4pt + c-hairline),
          inset: (bottom: 5pt),
          grid(
            columns: (1fr, 1fr, 1fr),
            align: (left, center, right),
            upper(if part != none { part } else if section != none { section } else { "" }),
            upper(if title != none { title } else { "" }),
            upper(if edition != none { edition } else if date != none { date } else { "" }),
          ),
        )
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
    // Lighter editorial title block for documents without a full cover.
    block(below: 2em)[
      #if section != none {
        text(font: f-sans, size: 8.5pt, weight: 600, tracking: 0.18em, fill: c-ink-2)[
          #upper(section)
        ]
        v(0.6em)
      }
      #text(font: f-serif, weight: 400, size: 30pt, fill: c-ink)[#title]
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
