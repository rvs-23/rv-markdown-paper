// Canonical default palette for the Editorial+Swiss design system.
//
// This file is the SOURCE OF TRUTH for the default values. At render
// time, src/typst/render.ts writes a fresh palette.typ into the temp
// compile directory — either a copy of this file (when no override is
// passed) or a derived palette (when --paper-bg is set). template.typ
// imports c-* names from this file, so any helper that closes over a
// colour token automatically picks up the override.
//
// All five neutral tones are derived from `c-paper`:
//   c-hairline   = c-paper darkened 21% — visible thin rules
//   c-surface    = c-paper darkened  7% — code panel body, note bg
//   c-surface-2  = c-paper darkened 11% — code panel header, warning bg
//   c-danger-fg  = c-paper             — paper-colored ink for danger
// The ink ramp (c-ink, c-ink-2, c-ink-3, c-muted, c-mute-2) is
// independent of the paper colour: it stays the same neutral
// progression regardless of the background.

#let c-paper     = rgb("#E8E8E8")  // page background — distinctly light gray
#let c-ink       = rgb("#11131A")  // primary text
#let c-ink-2     = rgb("#2A2D36")  // secondary text (eyebrows, labels)
#let c-ink-3     = rgb("#4A4D57")  // tertiary (kickers, eyebrow fills)
#let c-muted     = rgb("#686C76")  // captions, margin notes, meta cells
#let c-mute-2    = rgb("#8B8E97")  // very-light labels (lang-label, numerals)
#let c-hairline  = rgb("#B8B8B8")  // dividers, thin rules — neutral gray
#let c-surface   = rgb("#D9D9D9")  // code-block body, subtle panels
#let c-surface-2 = rgb("#CECECE")  // code-block header, warning panels
#let c-accent    = rgb("#11131A")  // reserved for single color event (e.g. danger)
#let c-danger-bg = rgb("#11131A")  // danger block inverts to ink-on-paper
#let c-danger-fg = rgb("#E8E8E8")  // page-colored ink for danger inversion; tracks c-paper
