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

// Pre-built `margin` dicts the generator can `#set page(margin: ...)`
// with to switch layout mode mid-document. Only the right margin is
// specified — Typst merges these into the existing page margins, so
// top/left/bottom stay at the user's resolved values.
//
// `opener-margins` constrains the opener's prose to ~58ch per spec §12.4
// ("Measure for body prose (opener): max-width: 58ch"). At 10.5pt
// Archivo, 58ch ≈ 113mm, so right margin = 210 - 22 - 113 ≈ 75mm.
// This is wider than the rail reservation (62mm), so the opener column
// is narrower than the body column — visually matching the mockup's
// generous left/right breathing room on the dropcap page.
//
// `body-margins` reserves the marginalia rail (62mm right) so the prose
// column is ~126mm and the rail sits to its right.
#let opener-margins = (right: 75mm)
#let body-margins   = (right: rail-gap + rail-width + rail-outer)

// ---------- marginalia ----------
// `#marg(label, body)` places a labelled note in the right rail, anchored to
// its vertical position in source flow. The generator emits `#marg(...)`
// BEFORE its anchor paragraph so `dy` lands at the anchor's top. State on
// `_marg-bottom` tracks the last note's bottom y on the current page; if a
// following note's anchor sits above that, we push it down by `gap`.
//
// The state is reset on every page-break via `#set page(background: ...)`.

#let _marg-bottom = state("marg-bottom", 0pt)

// Current section sig-numeral ("7.1", "7.3", etc.). The generator updates
// this state immediately before each H2 whose body starts with a dotted
// section number. The page foreground renders the value at top-right per
// spec §12.5 (60pt Archivo 300 mute-2 in the right rail).
#let _sig-numeral = state("sig-numeral", "")

// History of every sig-numeral the generator has emitted, paired with
// the page it started on: `((page: 3, sig: "7.1"), (page: 3, sig: "7.2"),
// (page: 4, sig: "7.3"), …)`. The running header reads this list,
// filters by current page, and renders the first–last range
// ("7.1 – 7.2") when multiple sections share a page.
#let _sig-history = state("sig-history", ())

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
  #set par(first-line-indent: 0em, justify: false)
  #box(baseline: 0.55em, text(
    font: f-serif, style: "italic", weight: 400, size: 52pt, fill: c-ink,
  )[#letter])
  #h(1pt)
  #body
]

// Pull quote / epigraph: the loud, display-weight quote. Used by
// `::: epigraph` for elevated external attributions, where the
// ornament voice (Instrument Serif italic) is the whole point. Per
// spec §12.6:
//   body: 20pt italic serif on a full-ink 1.5pt left rule
//   cite: 8.5pt sans 500 tracked .12em uppercase muted, preceded by em-dash
// The ordinary `>` blockquote stays in the body voice — see the show
// rule on `quote` below.
//
// `cite` is optional content; when set, it renders as its own line
// below the quote body with the cite typography. Generator extracts
// the last paragraph starting with `—` and passes it via this slot
// (see renderContainerDirective in generate.ts).
#let epigraph(cite: none, body) = block(
  above: 1.6em, below: 1.6em, breakable: false,
  inset: (left: 20pt, top: 14pt, bottom: 12pt),
  stroke: (left: 1.5pt + c-ink),
)[
  #set par(leading: 0.7em, justify: false)
  #text(font: f-serif, style: "italic", size: 20pt, fill: c-ink, tracking: -0.05pt)[
    #body
  ]
  #if cite != none {
    // Quiet 7pt gap — target.pdf sets the attribution close under
    // the quote body, reading as a label rather than as a separate
    // paragraph. 14pt put the cite too far down for an editorial
    // attribution.
    v(7pt)
    // Leading "— " (em-dash + thin space) is part of the cite voice in
    // target.pdf; the generator strips the dash when extracting the
    // cite slot from the trailing paragraph, so we re-add it here at
    // render time.
    text(font: f-sans, size: 8.5pt, weight: 500, tracking: 0.12em, fill: c-muted)[
      — #upper(cite)
    ]
  }
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
  above: 1.6em, below: 1.6em, width: 100%, breakable: false,
  fill: c-surface,
  stroke: (left: 1pt + c-ink-3),
  inset: (left: 1.1em, right: 1.1em, top: 0.9em, bottom: 0.9em),
)[
  #_admonition-label("note")
  #v(5pt)
  #body
]

#let tip(body) = block(
  above: 1.6em, below: 1.6em, width: 100%, breakable: false,
  fill: c-surface,
  stroke: (left: 2pt + c-ink),
  inset: (left: 1.1em, right: 1.1em, top: 0.9em, bottom: 0.9em),
)[
  #_admonition-label("tip")
  #v(5pt)
  #body
]

#let warning(body) = block(
  above: 1.6em, below: 1.6em, width: 100%, breakable: false,
  fill: c-surface-2,
  stroke: (
    left: 2pt + c-ink-2,
    top: 0.4pt + c-hairline,
    bottom: 0.4pt + c-hairline,
  ),
  inset: (left: 1.1em, right: 1.1em, top: 0.9em, bottom: 0.9em),
)[
  #_admonition-label("warning")
  #v(5pt)
  #body
]

#let danger(body) = block(
  above: 1.6em, below: 1.6em, width: 100%, breakable: false,
  fill: c-danger-bg,
  inset: (left: 1.1em, right: 1.1em, top: 0.9em, bottom: 0.9em),
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
  #v(5pt)
  #body
]

// Exercise box: top hairline rule (no surrounding box), italic-serif numeral
// on the left, optional uppercase tracked tag on the right, body below.
// Driven by `::: {.exbox number="01" tag="..."}`.
// 3-col header row per spec §12.6:
//   L: numeral  — 32pt italic serif ink
//   M: title    — 14pt italic serif ink-2 (e.g. "Warm-up")
//   R: tag/meta — 8pt sans tracked uppercase muted (e.g. "SUBMIT / RESULT")
// Title is supplied either as a `title="..."` directive attribute or by
// consuming a leading `**...**` bold-prefix from the body (the generator
// handles that extraction).
#let exbox(number: none, title: none, tag: none, body) = block(
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
    if title != none {
      text(font: f-serif, style: "italic", weight: 400, size: 14pt, fill: c-ink-2)[
        #title
      ]
    } else [],
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
    // Header strip is its own bordered surface-2 box. The 4pt gap below
    // separates it visually from the raw body box (which has its own
    // border via the raw show-rule); without the gap the two boxes
    // share a border and read as one panel.
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
    v(4pt)
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
  width: 0.92em, height: 0.92em, baseline: 0.12em,
  stroke: 0.6pt + c-ink,
  fill: if checked { c-ink } else { none },
  inset: 0pt,
)[
  #if checked {
    // Tick glyph (U+2713 CHECK MARK), not "x". Target.pdf uses a check
    // for completed items; "x" reads ambiguously as either "done" or
    // "rejected" depending on context. Weight 700 so the tick fills
    // the box cleanly at the paper colour. Box at 0.92em — measured
    // against target.pdf's checkboxes, which run nearly a full em.
    align(center + horizon, text(
      font: f-sans, size: 0.8em, weight: 700, fill: c-paper,
    )[#"\u{2713}"])
  }
]

#let task-item(checked, body) = grid(
  columns: (auto, 1fr),
  column-gutter: 0.6em,
  align: (top, top),
  task-box(checked),
  if checked { text(fill: c-muted, body) } else { body },
)

// Item-to-item spacing 0.55em. Earlier passes tightened this to 0.2em
// on the belief that target stacks task rows almost flush — a raster
// diff at matched DPI shows the opposite: target rows carry roughly
// half a line of air between them.
#let task-list(..items) = block(above: 1em, below: 0.8em)[
  #stack(spacing: 0.55em, ..items.pos())
]

// ---------- legacy callouts ----------
// The old v0.2 generator emitted `#warn[...]` and `#system[...]`. Keep them
// as thin aliases so any existing markdown continues to render.
#let warn(body) = warning(body)
#let system(body) = note(body)

// ---------- endnotes ----------
// Editorial / book-style footnote handling: each [^x] in the body
// renders as a superscript italic-serif numeral inline, and the
// generator collects the bodies into a single NOTES block at the end
// of the document via `endnotes((body1, body2, …))`. Engaged when
// `footnotes: "endnotes"` is set; the page-bottom mode keeps Typst's
// native `#footnote` instead.
#let endnote-ref(n) = super(
  text(font: f-serif, style: "italic", size: 0.95em, fill: c-ink)[#n]
)

#let endnotes(items) = if items.len() > 0 {
  block(above: 2em, below: 1.4em, breakable: false)[
    // Section eyebrow voice — tracked-uppercase 9pt sans, matching the
    // H2 styling so NOTES reads as a sibling to other section openers.
    #text(font: f-sans, weight: 500, size: 9pt, tracking: 0.16em, fill: c-ink-3)[
      NOTES
    ]
  ]
  // 2-col grid: italic-serif numeral on the left in a narrow
  // right-aligned column so every body left-edge sits at the same
  // x position regardless of digit count; body on the right in
  // normal prose. Tight 10pt numeral slot + 6pt gutter sits the
  // body ~16pt in from page-left — typical footnote hanging-indent
  // without visible gap between numeral and body.
  grid(
    columns: (10pt, 1fr),
    column-gutter: 6pt,
    row-gutter: 0.6em,
    align: (right + top, left + top),
    ..items.enumerate().map(((i, body)) => (
      text(font: f-serif, style: "italic", size: 10pt, fill: c-muted)[
        #(i + 1)
      ],
      body,
    )).flatten(),
  )
}

// ---------- cover page ----------
// Rendered when `show-cover = true` and a cover config was passed. Three
// stacked blocks: kicker (Part · Chapter), display title (mixed upright sans
// + italic serif accent), meta column + TOC column on a single grid row.

#let _cover-page(
  kicker: none, title: none, subtitle: none,
  meta: (), toc: (),
  chapter: none, part: none,
  series: none, edition: none, edition-short: none,
  volume: none,
  page-start: none, page-end: none,
) = [
  // Cover geometry per target.pdf: masthead strip sits ~40mm from the
  // top edge (deeper than the body's 24mm) and the cover-foot runs
  // ~16mm off the bottom.
  #set page(
    margin: (top: 40mm, right: 22mm, bottom: 16mm, left: 22mm),
    header: none, footer: none,
  )
  #block(height: 100%)[
    // Edition strip: top row with `series · edition` L, volume R,
    // separated by a hairline below. 8pt sans tracked uppercase muted.
    // The left cell joins series + edition with a middle-dot when both
    // are set so the strip reads e.g.
    //   "PYTHON IN PRACTICE · EDITION 2 · 2026                  VOLUME I"
    // Only rendered when at least one of series/edition/volume is set.
    #let _strip-left = if series != none and edition != none {
      series + " · " + edition
    } else if series != none {
      series
    } else if edition != none {
      edition
    } else { none }
    #if _strip-left != none or volume != none {
      grid(
        columns: (1fr, auto),
        align: (left, right),
        text(font: f-sans, size: 8pt, weight: 500, tracking: 0.16em, fill: c-muted)[
          #if _strip-left != none { upper(_strip-left) }
        ],
        text(font: f-sans, size: 8pt, weight: 500, tracking: 0.16em, fill: c-muted)[
          #if volume != none { upper(volume) }
        ],
      )
      v(6pt)
      line(length: 100%, stroke: 0.4pt + c-hairline)
      v(26mm)
    }

    // Kicker line. Target.pdf separates the kicker's segments with a
    // small filled bullet ("PART TWO ● CHAPTER 07"), so any middot in
    // the authored kicker becomes a spaced ● at render time.
    #if kicker != none {
      let segs = kicker.split("·").map(s => s.trim())
      text(font: f-sans, size: 9pt, weight: 600, tracking: 0.18em, fill: c-ink-2)[
        #for (i, seg) in segs.enumerate() {
          if i > 0 [#h(0.9em)#text(size: 6.5pt, baseline: -1pt)[●]#h(0.9em)]
          upper(seg)
        }
      ]
    }
    #v(1.6em)

    // Display title — comma-split per spec §12.6: head (before the
    // first comma) is upright Archivo 500 at 44pt; tail (everything
    // from the first comma on) is Instrument Serif italic at the same
    // size, the ornament voice. A hard linebreak after the head pins
    // the head/tail break; within the tail, the author can insert
    // `|` as an explicit linebreak marker to force the wrap matching
    // the mockup (e.g. "Thread pools, or how to share | a bounded
    // crew." renders as three lines: head / "or how to share" /
    // "a bounded crew."). Without a `|`, the tail flows naturally
    // within the box width.
    #if title != none {
      let parts = title.split(",")
      let head = parts.at(0) + ","
      let tail = if parts.len() > 1 { parts.slice(1).join(",").trim() } else { "" }
      let tail-segments = tail.split("|").map(s => s.trim())
      box(width: 95mm)[
        // `justify: false` on the title — the document-level `set par`
        // turns justification on for body prose, which spreads "Thread"
        // and "pools," apart on short title lines. Display headings
        // should always be left-aligned, never justified.
        #par(leading: 0.32em, justify: false)[
          #text(font: f-sans, size: 44pt, weight: 500, fill: c-ink, tracking: -0.5pt)[#head]#linebreak()#text(font: f-serif, style: "italic", size: 44pt, weight: 400, fill: c-ink, tracking: -0.5pt)[#{
            for (i, seg) in tail-segments.enumerate() {
              if i > 0 { linebreak() }
              seg
            }
          }]
        ]
      ]
    }
    // Subtitle shares the title's 95mm measure — full-width it ran two
    // long lines; target.pdf wraps the deck inside the title column.
    #if subtitle != none {
      v(0.6em)
      box(width: 95mm)[
        #par(leading: 0.48em, text(
          font: f-serif, style: "italic", size: 17pt, fill: c-ink-2,
        )[#subtitle])
      ]
    }

    // No ornament rule between deck and meta — target.pdf goes straight
    // from the subtitle into the TOPIC / LANGUAGE / RUNTIME row.
    #v(2.2em)

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
      v(1.4em)
      line(length: 100%, stroke: 0.4pt + c-hairline)
      v(1.6em)
    }

    // "In this chapter" — section list as a 3-col grid with hairline
    // row separators (id / title / page). Per Mockup D each TOC row
    // ends in a full-width hairline rule via `stroke: (bottom: ...)`.
    // A `grid`, not a `table`: the document-level `show table.cell`
    // rule styles row 0 as a tracked-uppercase header, which bolded
    // the first TOC entry ("Threads & the GIL") — the TOC has no
    // header row, so it must not participate in table-cell styling.
    #if toc.len() > 0 {
      line(length: 100%, stroke: 1pt + c-ink)
      v(1.4em)
      text(font: f-sans, size: 9pt, weight: 600, tracking: 0.16em, fill: c-ink-2)[
        #upper("In this chapter")
      ]
      v(0.8em)
      // Page-number precedence: an explicit `page:` on the entry wins.
      // It is the editorial override for folios that follow the book's
      // fiction rather than this document's own pagination (target.pdf
      // lists 086/088/090… while the rendered chapter itself spans
      // 085–089), and for entries pointing outside the rendered range
      // (a reference card or appendix in a sibling file). Entries
      // without an override resolve via Typst's page counter at the
      // entry's heading label, with `page-start` applied as an
      // editorial offset.
      //
      // Wrapped in a `context` block so `counter(page).at(label(…))`
      // can see the final document layout; `query(label(…)).first()`
      // returns the heading element, whose `.location().page()` gives
      // the absolute page number.
      let pad3 = (n) => {
        let s = str(n)
        if s.len() >= 3 { s }
        else if s.len() == 2 { "0" + s }
        else { "00" + s }
      }
      // Cover is doc page 1 but folio 000 — every body page starts
      // one ahead of its absolute page number. Subtract 1 from the
      // queried page so 7.1 on doc page 3 reads as 086 (matching the
      // page footer's `current - 1 + page-start - 1` math), not 087.
      let toc-page-cell(entry) = context {
        let manual = entry.at("page", default: "")
        let ref = entry.at("ref", default: none)
        let resolved = if manual != "" {
          manual
        } else if ref != none and ref != "" {
          let hits = query(label(ref))
          if hits.len() > 0 {
            let p = hits.first().location().page()
            let offset = if page-start != none { page-start - 1 } else { 0 }
            pad3(p - 1 + offset)
          } else { none }
        } else { none }
        text(font: f-serif, style: "italic", size: 12pt, fill: c-muted)[
          #if resolved != none { resolved } else { "" }
        ]
      }
      grid(
        columns: (52pt, 1fr, auto),
        align: (left + horizon, left + horizon, right + horizon),
        inset: (x: 0pt, y: 12pt),
        stroke: (x, y) => (bottom: 0.4pt + c-hairline),
        ..toc.map(entry => (
          text(font: f-sans, size: 9pt, weight: 500, tracking: 0.04em, fill: c-ink-2)[
            #entry.id
          ],
          text(font: f-sans, size: 10pt, fill: c-ink)[#entry.title],
          toc-page-cell(entry),
        )).flatten(),
      )
    }

    // Cover-foot per spec §12.6: `series · edition-short` L,
    // "Ch. NN" centred (italic serif), `pp. NNN – NNN` R (zero-padded).
    // Hairline above. No ghost numeral — sig-numeral is suppressed on
    // the cover.
    #v(1fr)
    #line(length: 100%, stroke: 0.4pt + c-hairline)
    #v(0.6em)
    #{
      let chapter-str = if chapter != none {
        let n = str(chapter)
        if n.len() == 1 { "Ch. 0" + n } else { "Ch. " + n }
      } else { "" }
      let pad3 = (n) => {
        let s = str(n)
        if s.len() >= 3 { s }
        else if s.len() == 2 { "0" + s }
        else { "00" + s }
      }
      let page-range = if page-start != none and page-end != none {
        "pp. " + pad3(page-start) + " – " + pad3(page-end)
      } else { "" }
      let foot-left = if series != none and edition-short != none {
        series + " · " + edition-short
      } else if series != none and edition != none {
        // Fall back to full edition if editionShort isn't provided.
        series + " · " + edition
      } else if series != none {
        series
      } else if edition-short != none {
        edition-short
      } else if edition != none {
        edition
      } else { "" }
      grid(
        columns: (1fr, auto, 1fr),
        align: (left, center, right),
        text(font: f-sans, size: 8.5pt, fill: c-muted)[#foot-left],
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
  chapter: none, part: none,
  series: none, edition: none, edition-short: none,
  volume: none,
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
  // Body weight: 300 (Archivo Light). 200 (ExtraLight) under-rendered
  // against target.pdf in side-by-side review — body text looked 10–20%
  // lighter than the target. 300 closes the gap while still feeling
  // editorial rather than UI-weight. Headings keep their explicit
  // 400/500 weights so the hierarchy still steps up cleanly.
  //
  // Body leading: 0.85em, paragraph spacing 1.2em — calibrated to the
  // target's line rhythm; do not tighten without re-checking the
  // editorial fixture page count.
  set text(font: f-sans, size: 10.5pt, weight: 300, fill: c-ink, hyphenate: false)
  // Ragged-right, not justified: target.pdf sets every paragraph
  // left-aligned with a soft rag. Justification produced visible
  // inter-word gaps in the narrow body column (and worse ones in the
  // 35mm marginalia rail, which inherits this rule).
  set par(leading: 0.85em, spacing: 1.2em, justify: false, first-line-indent: 0em)

  // --------- Lists ---------
  // Target.pdf marks unordered items with an en-dash at every nesting
  // level (no disc/triangle ladder), and sets ordered-list numerals in
  // the ornament voice — Instrument Serif italic — against the sans
  // body. Both lists indent off the column edge so the markers read as
  // a separate rail.
  set list(marker: ([–], [–], [–]), indent: 1.2em, body-indent: 0.6em)
  set enum(
    numbering: n => text(font: f-serif, style: "italic", fill: c-ink)[#n.],
    indent: 1.2em,
    body-indent: 0.6em,
  )

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
    #text(font: f-sans, weight: 400, size: 28pt, fill: c-ink, tracking: -0.4pt)[
      #it.body
    ]
  ]
  // H2 = section eyebrow. Tracked-uppercase row + a short editorial
  // kicker rule (60pt, ink-weight) beneath. Matches target.pdf's
  // consistent section-opener mark (visible on the chapter opener
  // and every body section) — short enough to read as a flourish
  // under the eyebrow rather than a column-wide divider.
  show heading.where(level: 2): it => block(above: 2em, below: 1em, breakable: false)[
    #text(font: f-sans, weight: 500, size: 9pt, tracking: 0.16em, fill: c-ink-3)[
      #upper(it.body)
    ]
    #v(6pt, weak: true)
    #line(length: 60pt, stroke: 0.6pt + c-ink)
  ]
  // H3 — display heading inside a section. Below-spacing bumped to 1.6em
  // so the section opens with real breathing room before the first
  // paragraph (matches Mockup D's airy lead-in under "Why a pool, and
  // why bounded."). Weight 400 (Regular) instead of 500 — paired with a
  // 200-weight body, 500 read as bold-face. 400 still steps up clearly
  // but at a calmer contrast.
  show heading.where(level: 3): it => block(above: 1.2em, below: 1.6em, breakable: false)[
    #text(font: f-sans, weight: 400, size: 21pt, fill: c-ink, tracking: -0.25pt)[
      #it.body
    ]
  ]
  // H4 (e.g. "7.1.1 Three reasons to pool") in muted ink. Target sets
  // sub-heading numerals + body in a gray voice so the H3 display
  // heading stays the only ink-weight title in the section, and the
  // H4s read as secondary structural beats rather than competing
  // section openers.
  show heading.where(level: 4): it => block(above: 1.8em, below: 0.9em, breakable: false)[
    #text(font: f-sans, weight: 500, size: 14pt, fill: c-muted)[#it.body]
  ]
  show heading.where(level: 5): it => block(above: 1.6em, below: 0.6em)[
    #text(font: f-sans, weight: 500, size: 10.5pt, fill: c-ink)[#it.body]
  ]
  show heading.where(level: 6): it => block(above: 1em, below: 0.3em)[
    #text(font: f-serif, style: "italic", weight: 400, size: 10pt, fill: c-ink-2)[
      #it.body
    ]
  ]

  // Lists need a real gap above so they don't sit flush against the
  // preceding heading or paragraph. Without this, `### Foo` immediately
  // followed by `- bullet` shows the first item ~5pt under the heading
  // baseline — visibly too tight. 1em above gives a "tab-equivalent"
  // breathing room after H3/H4 without making list-after-paragraph
  // double-spaced.
  show list: it => block(above: 1em, below: 0.8em, it)
  show enum: it => block(above: 1em, below: 0.8em, it)

  // --------- Inline ---------
  show link: it => underline(offset: 1.8pt, stroke: 0.5pt, text(fill: c-ink, it))
  // Strong weight 500 (Medium) — paired with body ExtraLight (200), the
  // jump from 200 → 500 is three steps which reads as bold but stays
  // proportional. The previous 600 against 200-weight body looked
  // bold-on-the-face for run-in labels ("Bound memory.", etc.).
  show strong: set text(weight: 500)
  // Emphasis stays in the body family (Archivo Italic). Instrument Serif
  // italic is reserved for ornamental slots — cover subtitle, dropcap,
  // epigraphs, equation tags, figure captions — not running prose. The
  // font is re-asserted in an explicit `text()` wrapper because `set text`
  // inside a `show emph` rule does not always commit Typst to the Italic
  // variant in the font registry.
  show emph: it => text(font: f-sans, style: "italic")[#it.body]
  // Strikethrough renders in muted ink with a thinner stroke so deleted
  // text reads as "removed" rather than as a deletion-bar over normal
  // body weight. Target.pdf shows ~Async pools~ in the muted ramp; our
  // earlier default left the body fill at c-ink, which made strikes
  // visually loud.
  show strike: it => text(fill: c-muted)[#it]

  // --------- Tables ---------
  // Mockup: no surrounding box; header row gets a 0.75pt ink rule below it;
  // every body row gets a 0.4pt hairline below. First column is sans, the
  // rest is mono with tabular numerals so digits line up.
  set table(
    stroke: (x, y) => (
      bottom: if y == 0 { 0.75pt + c-ink } else { 0.4pt + c-hairline },
    ),
    // x:7pt (was 10pt) trims 6pt per column off the side-inset budget
    // so first-column labels like "Pure Python CPU" fit without
    // wrapping. y:7pt unchanged — the row rhythm is calibrated to
    // body leading.
    inset: (x: 7pt, y: 7pt),
    align: left + horizon,
  )
  // Tables fill the column width by default so they don't sit as a
  // narrow island in the middle of the body — target.pdf stretches
  // tables edge-to-edge inside the body column. Using `layout(...)`
  // resolves the table inside a `box(width:)` of the actual available
  // measure, which is what Typst needs to compute `fr` columns into
  // absolute lengths (a bare `block(width: 100%, table)` doesn't
  // propagate the container width to the table's fr resolution).
  show table: it => layout(size => box(width: size.width, it))
  // Document-level `set par(justify: true)` propagates into table cells,
  // producing ugly inter-word gaps in narrow columns (visible in the Notes
  // columns of 03-structured.pdf and 06-full-paper.pdf before this rule).
  // Tabular content should ragged-right; turn justification off here.
  show table.cell: it => {
    set par(justify: false)
    if it.y == 0 {
      // Header row — tracked uppercase eyebrow voice.
      text(font: f-sans, size: 8.5pt, weight: 500, fill: c-ink-2, tracking: 0.02em, it)
    } else {
      // Body cells — all sans (Archivo), no font switch by column.
      // Tabular-numerals feature ("tnum") keeps digit columns
      // aligned so numeric columns line up vertically without
      // resorting to a monospaced face (which reads heavier than the
      // body's ExtraLight weight). Cells inherit body weight (200).
      text(
        font: f-sans, size: 9.3pt, fill: c-ink,
        features: ("tnum": 1),
        it,
      )
    }
  }

  // --------- Figures ---------
  // Caption: hairline rule above, then a two-column grid — italic-serif
  // `Fig. X.Y` lead in ink, sans body in muted gray. Mirrors the mockup's
  // figcaption row.
  // Figures and equations are chapter-relative per Mockup D:
  // "Fig. 7.1", "(7.1)". Prefix derives from the `chapter` parameter so
  // documents that don't set chapter fall back to flat numbering ("Fig.
  // 1", "(1)").
  let chapter-prefix = if chapter != none { str(chapter) + "." } else { "" }
  set figure(
    supplement: [Fig.],
    numbering: n => chapter-prefix + str(n),
  )
  show figure.caption: it => block(width: 100%, above: 0.6em)[
    #set align(left)
    #block(stroke: (top: 0.3pt + c-hairline), inset: (top: 5pt))[
      #grid(
        columns: (auto, 1fr),
        column-gutter: 10pt,
        // `align: (left + bottom, left + bottom)` puts the larger 10pt
        // italic-serif `Fig. N.M` and the smaller 8.5pt sans caption
        // body on the same baseline. Without this they shared the
        // grid row's top, leaving the caption text sitting visibly
        // above the figure label.
        align: (left + bottom, left + bottom),
        text(font: f-serif, style: "italic", size: 10pt, fill: c-ink)[
          #it.supplement #context it.counter.display(it.numbering)
        ],
        text(font: f-sans, size: 8.5pt, fill: c-muted)[#it.body],
      )
    ]
  ]
  // Figure framed panel per spec §12.6: image sits inside a
  // surface-filled, hairline-bordered box (visually "the figure lives
  // in its own panel"); caption row renders below with the existing
  // figure.caption show-rule (italic-serif "Fig. N.M" lead + caption
  // body on a hairline-divided row). The custom show: figure rule
  // replaces Typst's default figure layout with this panel + caption
  // composition, so the framing also covers code-fence figures and
  // tabular figures, not just images.
  show figure: it => block(below: 1.4em, width: 100%)[
    #block(
      fill: c-surface,
      stroke: 0.5pt + c-hairline,
      inset: 14pt,
      width: 100%,
    )[
      #set align(center)
      #it.body
    ]
    #it.caption
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
  // Code voice: JetBrains Mono Light (300). Bundling Light against the
  // body's 300-weight body keeps code visually paired with prose rather
  // than reading as a heavier on-page event. Prior pass dropped fill
  // to c-ink-2 as a stopgap because we shipped Regular (400) only;
  // with Light shipped we can put the fill back to c-ink and let the
  // weight do the work — sharper letterforms, no perceived greying.
  show raw.where(block: true): it => block(
    fill: c-surface,
    inset: (x: 12pt, y: 10pt),
    width: 100%,
    stroke: 0.5pt + c-hairline,
  )[
    #set par(justify: false)
    #text(font: f-mono, size: 8.6pt, weight: 300, fill: c-ink, it)
  ]
  show raw.where(block: false): it => box(
    fill: c-surface,
    inset: (x: 4pt, y: 0pt),
    outset: (y: 2pt),
    radius: 0pt,
    text(font: f-mono, size: 0.88em, weight: 300, fill: c-ink, it),
  )

  // --------- Blockquote ---------
  // Ordinary `>` blockquote: body voice (Archivo sans), quiet hairline
  // left rule. Instrument Serif italic is reserved for ornament (folio,
  // pull quotes, dropcap, etc.) per the design rule — using it on every
  // in-text quote spent the ornament voice on the wrong slot. The loud
  // "pull quote" lives in `:::epigraph` instead.
  show quote.where(block: true): it => block(
    spacing: 1.2em,
    inset: (left: 14pt, top: 2pt, bottom: 2pt),
    stroke: (left: 1.5pt + c-hairline),
    text(font: f-sans, size: 10.5pt, fill: c-ink-2, it.body),
  )

  // --------- Math ---------
  // Equation refs resolve to "(7.1)" — no "Eq." supplement, chapter-
  // relative numbering. Supplement set to empty content so cross-refs
  // emit only the parenthesised numbering.
  set math.equation(
    numbering: n => "(" + chapter-prefix + str(n) + ")",
    supplement: [],
  )
  // Display math: bigger and bolder than body voice — target.pdf
  // renders `N = λ · W` at a generous display size in medium weight,
  // so the equation reads as the centerpiece of its panel rather
  // than as inline-sized text floating between hairlines. Wrapped
  // text() sets the math font at 15pt 500 inside the panel; the
  // panel keeps its top/bottom hairline + generous inset for
  // breathing room.
  show math.equation.where(block: true): it => block(
    above: 1.8em, below: 1.8em,
    stroke: (top: 0.3pt + c-hairline, bottom: 0.3pt + c-hairline),
    inset: (top: 18pt, bottom: 18pt),
    width: 100%,
    text(size: 15pt, weight: 500, it),
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
      // Suppress the header on the opener page (single dropcap intro
      // after the cover). The generator emits `<chapter-opener>` as a
      // label on the opener's structural heading; query its page so the
      // header-fn can match against the current page deterministically.
      let opener-results = query(<chapter-opener>)
      let on-opener = if opener-results.len() > 0 {
        p == opener-results.at(0).location().page()
      } else { false }
      if on-cover or on-title-page or on-opener { [] } else {
        // Header left: "Ch. NN — Title" per the mockup. Chapter is
        // zero-padded under 10 (matches the cover-foot). Title is the
        // head of the comma-split cover.title when a cover is set
        // (e.g. "Thread pools" from "Thread pools, or how to share a
        // bounded crew."), otherwise the flat `title` field, otherwise
        // omitted.
        let chapter-str = if chapter != none {
          let n = str(chapter)
          if n.len() == 1 { "Ch. 0" + n } else { "Ch. " + n }
        } else { none }
        let title-head = if cover != none and cover.at("title", default: none) != none {
          // Head of comma-split (same convention as the cover title).
          let t = cover.title
          if "," in t { t.split(",").at(0) } else { t }
        } else if title != none { title } else { none }
        let left-cell = if chapter-str != none and title-head != none {
          chapter-str + " — " + title-head
        } else if chapter-str != none {
          chapter-str
        } else if part != none {
          "Part " + part
        } else if section != none {
          section
        } else { "" }
        // Header right: section range for the current page. The
        // generator pushes (page, sig) tuples into _sig-history at
        // each H2; here we filter to entries whose page matches the
        // current page. One entry → single sig ("7.3"). Two or more →
        // range ("7.1 – 7.2"). Zero (no H2 starts on this page) →
        // fall back to the currently-active sig from _sig-numeral,
        // which carries the section the body continues from.
        let history = _sig-history.final()
        let on-page = history.filter(h => h.page == p)
        let right-cell = if on-page.len() == 0 {
          let sig = _sig-numeral.get()
          if sig != "" { sig } else { "" }
        } else if on-page.len() == 1 {
          on-page.at(0).sig
        } else {
          on-page.at(0).sig + " – " + on-page.at(-1).sig
        }
        if left-cell == "" and right-cell == "" {
          []
        } else {
          // Mixed-case sans, no tracking, no underline rule. Target.pdf
          // sets the running header in a quiet locator voice — "Ch. 07
          // — Thread pools" L, "7.4" R — so it reads as page-furniture
          // and leaves the column-rule eyebrow ("7.4 · SIZING THE POOL")
          // to do the section-marker work.
          set text(font: f-sans, size: 9pt, weight: 400, fill: c-muted)
          grid(
            columns: (1fr, auto),
            column-gutter: 1.5em,
            align: (left + horizon, right + horizon),
            left-cell,
            right-cell,
          )
        }
      }
    }
  } else { none }

  // Footer: `series · edition-short` left in sans muted, zero-padded
  // folio right in italic serif. Mirrors the cover-foot's left composition
  // so a reader flipping pages sees the same book locator throughout.
  let footer-left-text = if series != none and edition-short != none {
    series + " · " + edition-short
  } else if series != none and edition != none {
    series + " · " + edition
  } else if series != none {
    series
  } else if edition-short != none {
    edition-short
  } else if edition != none {
    edition
  } else { "" }
  let footer-fn = if show-footer {
    context {
      let p = counter(page).get().first()
      let on-cover = cover-active and p <= 1
      if on-cover { [] } else {
        let current = counter(page).get().first()
        let n = current - footer-page-offset + (
          if page-start != none { page-start - 1 } else { 0 }
        )
        // Zero-pad to 3 digits so the folio reads consistently across a
        // book-length document (e.g. "085" not "85").
        let s = str(n)
        let display-num = if s.len() >= 3 { s }
          else if s.len() == 2 { "0" + s }
          else { "00" + s }
        grid(
          columns: (1fr, auto),
          align: (left + horizon, right + horizon),
          text(font: f-sans, size: 8.5pt, fill: c-muted)[#footer-left-text],
          text(font: f-serif, style: "italic", size: 9pt, fill: c-ink)[#display-num],
        )
      }
    }
  } else { none }

  // Page foreground: sig-numeral (60pt Archivo 300 mute-2) pinned in
  // the right rail of every body page. Suppressed on cover / opener /
  // title-page chrome, same conditions as the header-fn.
  let foreground-fn = context {
    let p = counter(page).get().first()
    let on-cover = cover-active and p <= 1
    let on-title-page = not cover-active and title != none and p == 1
    let opener-results = query(<chapter-opener>)
    let on-opener = if opener-results.len() > 0 {
      p == opener-results.at(0).location().page()
    } else { false }
    if on-cover or on-title-page or on-opener { return }
    // Prefer the FIRST section that starts on this page so a late
    // placeholder H2 (e.g. 7.2 at the bottom of a page dominated by
    // 7.1) cannot hijack the big rail glyph. _sig-history is the
    // (page, sig) tuple list pushed at each H2; the header range uses
    // the same source. Fall back to the active _sig-numeral when no
    // H2 starts on this page (i.e. body continues a prior section).
    let history = _sig-history.final()
    let on-page = history.filter(h => h.page == p)
    let sig = if on-page.len() > 0 {
      on-page.at(0).sig
    } else {
      _sig-numeral.get()
    }
    if sig == "" { return }
    place(
      top + right,
      dx: -12mm,
      dy: 24mm,
      text(font: f-sans, size: 60pt, weight: 300, fill: c-mute-2, tracking: -1pt)[
        #sig
      ],
    )
  }

  set page(header: header-fn, footer: footer-fn, foreground: foreground-fn)

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
      series: series,
      edition: edition,
      edition-short: edition-short,
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
