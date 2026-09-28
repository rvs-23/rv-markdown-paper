// Palette for the Editorial+Swiss design system.
//
// The page colour comes from `--input paper-bg=#RRGGBB` (the CLI's
// --paper-bg / the `paperBg` option), defaulting to #F4F4F4. The neutral
// tones below derive from it, rounded to 8-bit hex so the default page
// reproduces the canonical values exactly:
//   c-surface    = paper darkened  7% — code panel body, note bg      (#E3E3E3)
//   c-surface-2  = paper darkened 11% — code panel header, warning bg (#D9D9D9)
//   c-hairline   = paper darkened 21% — visible thin rules            (#C1C1C1)
//   c-danger-fg  = paper              — paper-coloured ink for danger
// The ink ramp (c-ink … c-mute-2) is independent of the paper colour.

#let c-paper = rgb(sys.inputs.at("paper-bg", default: "#F4F4F4"))
#let _shade(amount) = rgb(c-paper.darken(amount).to-hex())

#let c-ink       = rgb("#11131A")  // primary text
#let c-ink-2     = rgb("#2A2D36")  // secondary text (eyebrows, labels)
#let c-ink-3     = rgb("#4A4D57")  // tertiary (kickers, eyebrow fills)
#let c-muted     = rgb("#686C76")  // captions, margin notes, meta cells
#let c-mute-2    = rgb("#8B8E97")  // very-light labels (lang-label, numerals)
#let c-hairline  = _shade(21%)     // dividers, thin rules
#let c-surface   = _shade(7%)      // code-block body, subtle panels
#let c-surface-2 = _shade(11%)     // code-block header, warning panels
#let c-accent    = rgb("#11131A")  // reserved for single color event (e.g. danger)
#let c-danger-bg = rgb("#11131A")  // danger block inverts to ink-on-paper
#let c-danger-fg = c-paper         // page-colored ink for danger inversion
