// rv-markdown-paper — Typst design system.
//
// The mdast-to-Typst generator emits a call to `paper(...)` that captures
// every document-level setting. Everything that was CSS in the old Chromium
// pipeline lives here as `set` / `show` rules.

// ---------- helpers (defined first so `paper` can reference them) ----------

#let _meta-cell(label, value) = box[
  #text(
    font: "JetBrains Mono", size: 7.5pt, weight: 600,
    tracking: 1.4pt, fill: rgb("#8a8a8a"),
  )[#upper(label)]
  #h(0.5em)
  #text(
    font: "IBM Plex Serif", size: 10pt, fill: rgb("#1a1a1a"),
  )[#value]
]

#let _meta-row(author: none, date: none, reading-time: none) = {
  let cells = ()
  if author != none { cells.push(_meta-cell("By", author)) }
  if date != none { cells.push(_meta-cell("On", date)) }
  if reading-time != none { cells.push(_meta-cell("Read", reading-time)) }
  if cells.len() > 0 {
    stack(dir: ltr, spacing: 2em, ..cells)
  }
}

#let _titleblock(
  title: none, subtitle: none, section: none,
  author: none, date: none, reading-time: none,
) = block(below: 2em)[
  #if section != none {
    text(
      font: "JetBrains Mono", size: 8.5pt, weight: 600,
      tracking: 2pt, fill: rgb("#5a5a5a"),
    )[#upper(section)]
    v(0.6em)
  }
  #text(font: "IBM Plex Serif", weight: 700, size: 26pt, fill: rgb("#000"))[#title]
  #if subtitle != none {
    v(0.3em)
    text(
      font: "IBM Plex Serif", size: 13pt, style: "italic", fill: rgb("#3a3a3a"),
    )[#subtitle]
  }
  #v(0.6em)
  #line(length: 60pt, stroke: 0.8pt + rgb("#000"))
  #v(0.6em)
  #_meta-row(author: author, date: date, reading-time: reading-time)
]

// ---------- callouts ----------
// One function per kind. The mdast generator emits `#note[...]`, `#warn[...]`,
// or `#system[...]` depending on the `[!NOTE]` / `[!WARN]` / `[!SYSTEM]` tag.

#let _tag(name) = text(
  font: "JetBrains Mono", weight: 700, size: 0.88em, tracking: 0.6pt,
)[#upper(name).]

#let note(body) = block(above: 1em, below: 1em)[#_tag("note") #body]

#let warn(body) = block(
  above: 1em, below: 1em,
  stroke: (left: 1pt + rgb("#000")),
  inset: (left: 0.8em, top: 0.2em, bottom: 0.2em),
)[#_tag("warn") #body]

#let system(body) = block(
  above: 1em, below: 1em,
  stroke: (left: (paint: rgb("#3a3a3a"), thickness: 1pt, dash: "dashed")),
  inset: (left: 0.8em, top: 0.25em, bottom: 0.25em),
)[
  #text(
    font: "JetBrains Mono", size: 9pt, fill: rgb("#3a3a3a"),
  )[#_tag("system") #body]
]

// ---------- task list markers ----------
// GFM renders `- [x]` / `- [ ]` as task list items. Typst doesn't have a
// native widget for it, so we emit a small stroked box with an optional
// checkmark.

#let task-box(checked) = box(
  width: 0.78em, height: 0.78em, baseline: 0.1em,
  stroke: 0.6pt + rgb("#1a1a1a"),
  inset: 0pt,
)[
  #if checked {
    align(center + horizon, text(
      font: "JetBrains Mono", size: 0.7em, weight: 700, fill: rgb("#000"),
    )[x])
  }
]

// ---------- the document function ----------

#let paper(
  title: none,
  subtitle: none,
  section: none,
  author: none,
  date: none,
  reading-time: none,
  page-size: "us-letter",
  margin-top: 1in,
  margin-right: 0.9in,
  margin-bottom: 1in,
  margin-left: 0.9in,
  show-header: true,
  show-footer: true,
  show-cover: true,
  theme-path: none,
  body,
) = {
  // --------- Base typography ---------
  set text(font: "Lora", size: 10.5pt, fill: rgb("#1a1a1a"), hyphenate: false)
  set par(leading: 0.62em, spacing: 1em, justify: false)

  // --------- Headings: grayscale ladder, IBM Plex Serif ---------
  set heading(numbering: none)

  show heading.where(level: 1): it => block(above: 1.6em, below: 1em, breakable: false,
    stack(spacing: 0.3em,
      text(font: "IBM Plex Serif", weight: 700, size: 20pt, fill: rgb("#000"))[#it.body],
      stack(spacing: 1.5pt,
        line(length: 100%, stroke: 1.2pt + rgb("#000")),
        line(length: 100%, stroke: 0.5pt + rgb("#000")),
      ),
    ),
  )

  show heading.where(level: 2): it => block(above: 1.4em, below: 0.8em, breakable: false,
    stack(spacing: 0.3em,
      text(font: "IBM Plex Serif", weight: 700, size: 14pt, fill: rgb("#111"))[#it.body],
      line(length: 100%, stroke: 0.5pt + rgb("#111")),
    ),
  )

  show heading.where(level: 3): set text(
    font: "IBM Plex Serif", weight: 600, size: 12pt, fill: rgb("#1f1f1f"),
  )
  show heading.where(level: 4): set text(
    font: "IBM Plex Serif", weight: 600, size: 10.5pt, fill: rgb("#3a3a3a"),
  )

  // --------- Inline ---------
  show link: it => underline(offset: 1.8pt, stroke: 0.5pt, text(fill: rgb("#000"), it))
  show strong: set text(font: "IBM Plex Serif", weight: 700)
  show emph: set text(style: "italic")

  // --------- Tables: top+bottom rule, uppercase mono header, no verticals ---------
  set table(
    stroke: none,
    inset: (x: 8pt, y: 6pt),
    align: left + horizon,
  )
  show table: it => block(
    stroke: (top: 0.8pt + rgb("#111"), bottom: 0.8pt + rgb("#111")),
    inset: 0pt,
    it,
  )
  show table.cell.where(y: 0): it => text(
    font: "JetBrains Mono", size: 8.5pt, weight: 600, tracking: 0.4pt, fill: rgb("#111"),
  )[#upper(it)]

  // --------- Figures: auto-numbered "Fig. N. caption" ---------
  set figure(supplement: [Fig.], numbering: "1")
  show figure.caption: it => block(width: 100%)[
    #set align(left)
    #text(
      font: "IBM Plex Serif", size: 9pt, style: "italic", fill: rgb("#3a3a3a"),
    )[#it.supplement #context it.counter.display(it.numbering). #it.body]
  ]

  // --------- Code ---------
  // `set raw(theme: ...)` scopes to the enclosing block, so we set it at the
  // top of paper's body — this propagates to every raw node in `body`. The
  // generator always supplies theme-path, so no conditional is needed.
  set raw(theme: theme-path)
  show raw.where(block: true): it => block(
    fill: rgb("#FAF9F6"),
    inset: 10pt,
    radius: 2pt,
    width: 100%,
    text(font: "JetBrains Mono", size: 9pt, it),
  )
  show raw.where(block: false): it => box(
    fill: rgb("#FAF9F6"),
    inset: (x: 3pt, y: 0pt),
    outset: (y: 2pt),
    radius: 1.5pt,
    text(font: "JetBrains Mono", size: 0.92em, it),
  )

  // --------- Blockquote ---------
  show quote.where(block: true): it => block(
    inset: (left: 1em, y: 0.4em),
    spacing: 1em,
    text(style: "italic", fill: rgb("#3a3a3a"), it.body),
  )

  // --------- Page (header/footer suppressed on cover) ---------
  // No point in a running header for an untitled document — the three cells
  // would all be empty and leave an orphan rule at the top of every page.
  let header-has-content = title != none or section != none or date != none or author != none
  let footer-page-offset = if show-cover and title != none { 1 } else { 0 }
  let cover-active = show-cover and title != none
  let header-fn = if show-header and header-has-content {
    context {
      let p = counter(page).get().first()
      let on-cover = cover-active and p <= 1
      if on-cover { [] } else {
        set text(
          font: "IBM Plex Serif", size: 7.5pt, weight: 600,
          tracking: 1pt, fill: rgb("#5a5a5a"),
        )
        block(
          stroke: (bottom: 0.5pt + rgb("#c8c8c8")),
          inset: (bottom: 5pt),
          grid(
            columns: (1fr, 1fr, 1fr),
            align: (left, center, right),
            upper(if section != none { section } else { "" }),
            upper(if title != none { title } else { "" }),
            upper(if date != none { date } else if author != none { author } else { "" }),
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
        set align(center)
        set text(
          font: "JetBrains Mono", size: 7.5pt, tracking: 0.4pt, fill: rgb("#5a5a5a"),
        )
        let current = counter(page).get().first()
        let total = counter(page).final().first()
        // When a cover sits ahead of the body, the first body page should
        // still read "1 / N" — offset both current and total by one.
        [#(current - footer-page-offset) / #(total - footer-page-offset)]
      }
    }
  } else { none }

  set page(
    paper: page-size,
    margin: (top: margin-top, right: margin-right, bottom: margin-bottom, left: margin-left),
    header: header-fn,
    footer: footer-fn,
  )

  // --------- Cover page ---------
  if show-cover and title != none {
    block(height: 100% - 30pt)[
      #set align(horizon + left)
      #stack(spacing: 1.2em,
        if section != none {
          text(
            font: "JetBrains Mono", size: 9pt, weight: 600,
            tracking: 2.2pt, fill: rgb("#5a5a5a"),
          )[#upper(section)]
        },
        // Give the 46pt display type enough leading that descenders
        // (`g`, `p`, `y`) clear the italic subtitle below it.
        par(leading: 0.38em, text(
          font: "IBM Plex Serif", weight: 700, size: 46pt, fill: rgb("#000"),
          tracking: -0.5pt,
        )[#title]),
        if subtitle != none {
          text(
            font: "IBM Plex Serif", size: 14pt, style: "italic", fill: rgb("#3a3a3a"),
          )[#subtitle]
        },
        line(length: 70pt, stroke: 1pt + rgb("#000")),
        _meta-row(author: author, date: date, reading-time: reading-time),
      )
    ]
    align(right + bottom)[
      #text(
        font: "JetBrains Mono", size: 7.5pt, fill: rgb("#8a8a8a"),
        tracking: 2.5pt,
      )[#upper("rv · markdown · paper")]
    ]
    pagebreak(weak: true)
  } else if title != none {
    _titleblock(
      title: title, subtitle: subtitle, section: section,
      author: author, date: date, reading-time: reading-time,
    )
  }

  body
}
