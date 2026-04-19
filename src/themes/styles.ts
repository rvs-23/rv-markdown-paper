export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Lora:ital,wght@0,400..700;1,400..700" +
  "&family=IBM+Plex+Serif:ital,wght@0,400;0,600;0,700;1,400;1,700" +
  "&family=JetBrains+Mono:ital,wght@0,400;0,600;0,700;1,400" +
  "&display=swap";

// Grayscale palette, used confidently across the document.
//   #000  — pure ink (H1, strong emphasis, table header rule)
//   #111  — headings, H-rule ink
//   #1a1a1a — body ink
//   #3a3a3a — italic asides, blockquote body
//   #5a5a5a — captions, muted metadata
//   #7a7a7a — footnotes, tertiary text
//   #8a8a8a — code comments
//   #c8c8c8 — thin rules
//   #e0e0e0 — hairline rules inside tables
//   #f5f4f0 — warm code-panel background
export const STYLESHEET = /* css */ `
  :root { color-scheme: light only; }

  body {
    font-family: "Lora", Georgia, "Times New Roman", serif;
    font-size: 10.5pt;
    line-height: 1.46;
    color: #1a1a1a;
    background: #ffffff;
    margin: 0;
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "kern", "liga", "onum";
    text-rendering: optimizeLegibility;
  }

  main { max-width: 100%; }

  /* ---------- Title block ---------- */

  .doc-titleblock {
    margin: 0 0 1.8em;
    break-after: avoid-page;
    page-break-after: avoid;
  }

  .doc-kicker {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 8.5pt;
    font-weight: 700;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    margin-bottom: 1em;
  }

  h1.doc-title {
    font-family: "IBM Plex Serif", "Lora", Georgia, serif;
    font-size: 34pt;
    font-weight: 700;
    line-height: 1.06;
    letter-spacing: -0.022em;
    color: #000;
    margin: 0 0 0.4em;
    padding: 0;
    border: none;
    box-shadow: none;
  }

  .doc-deck {
    font-family: "Lora", Georgia, serif;
    font-size: 12.5pt;
    font-weight: 400;
    font-style: normal;
    line-height: 1.35;
    color: #5a5a5a;
    margin: 0 0 0.85em;
    max-width: 42em;
  }

  .doc-sigrule {
    width: 48px;
    height: 0;
    border-top: 1.5px solid #000;
    margin: 0.75em 0 0.85em;
  }

  .doc-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.4em 1.8em;
    align-items: baseline;
    font-size: 9pt;
    line-height: 1.3;
  }

  .doc-meta__cell {
    display: inline-flex;
    align-items: baseline;
    gap: 0.45em;
  }

  .doc-meta__label {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.85em;
    font-weight: 600;
    color: #7a7a7a;
    text-transform: uppercase;
    letter-spacing: 0.13em;
  }

  .doc-meta__value {
    font-family: "Lora", Georgia, serif;
    color: #1a1a1a;
  }

  /* ---------- Headings ---------- */

  h1, h2, h3, h4, h5, h6 {
    font-family: "IBM Plex Serif", "Lora", Georgia, serif;
    margin: 1.25em 0 0.3em;
    line-height: 1.18;
    letter-spacing: -0.005em;
    break-after: avoid-page;
    page-break-after: avoid;
  }

  /* Subtle grayscale hierarchy: pure ink drops half a stop at each level so
     the eye reads depth without color. All stay dark enough to print crisp. */
  h1 {
    font-size: 24pt;
    font-weight: 700;
    letter-spacing: -0.015em;
    margin-top: 0;
    color: #000;
    padding-bottom: 0.25em;
    border-bottom: 2px solid #000;
    box-shadow: 0 3px 0 -2px #000; /* second rule below, 1pt below the main */
  }

  h2 {
    font-size: 15.5pt;
    font-weight: 700;
    margin-top: 1.5em;
    color: #111;
    padding-bottom: 0.18em;
    border-bottom: 1px solid #111;
  }

  h3 {
    font-size: 12pt;
    font-weight: 700;
    margin-top: 1.15em;
    color: #1f1f1f;
  }

  h4 {
    font-size: 10.5pt;
    font-weight: 700;
    font-style: italic;
    margin-top: 1em;
    color: #3a3a3a;
  }

  /* When a heading is immediately followed by a table or code block, the
     heading's rule and the block's own top rule stack into a visible double
     line. Drop the block's top rule so the heading's rule serves as both. */
  h1 + pre, h2 + pre, h3 + pre { border-top: none; }
  h1 + table thead tr th,
  h2 + table thead tr th,
  h3 + table thead tr th { border-top: none; }

  /* Heading anchors (rehype-autolink-headings, behavior: wrap) stay
     visually invisible — headings look plain, but are clickable in the PDF
     and carry stable ids that the TOC will point at. */
  h1 > a, h2 > a, h3 > a, h4 > a, h5 > a, h6 > a {
    color: inherit;
    text-decoration: none;
  }

  p {
    margin: 0 0 0.55em;
    orphans: 3;
    widows: 3;
    hyphens: auto;
  }

  strong { font-weight: 700; color: #000; }
  em { font-style: italic; }

  /* ---------- Lists ---------- */

  ul, ol {
    margin: 0 0 0.7em;
    padding-left: 1.4em;
  }
  li { margin-bottom: 0.12em; }
  li > ul, li > ol { margin-top: 0.12em; margin-bottom: 0.12em; }

  /* ---------- Links ---------- */

  a {
    color: #000;
    text-decoration: underline;
    text-decoration-thickness: 0.055em;
    text-underline-offset: 0.16em;
  }

  /* ---------- Blockquotes ---------- */

  blockquote {
    margin: 0.8em 0;
    padding: 0 0 0 0.9em;
    border-left: 2px solid #111;
    color: #3a3a3a;
    font-style: italic;
    break-inside: avoid;
  }
  blockquote p { margin-bottom: 0.4em; }
  blockquote p:last-child { margin-bottom: 0; }

  /* ---------- Inline code ---------- */

  code {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.88em;
    background: #ececea;
    color: #111;
    padding: 0.5px 4px;
  }

  /* ---------- Code blocks (light, warm, grayscale) ---------- */

  pre {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 9pt;
    background: #f5f4f0;
    color: #1a1a1a;
    padding: 0.85em 1em 0.8em;
    margin: 0.9em 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    break-inside: avoid;
    line-height: 1.5;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
  }

  pre code {
    font-size: inherit;
    background: transparent;
    padding: 0;
    color: inherit;
  }

  pre.shiki {
    position: relative;
    padding-top: 1.8em;
  }

  pre.shiki code { display: block; }

  pre.shiki::before {
    content: attr(data-language);
    position: absolute;
    top: 0.5em;
    right: 0.9em;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.68em;
    color: #7a7a7a;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-weight: 600;
  }

  pre.shiki[data-language="plaintext"]::before,
  pre.shiki[data-language="text"]::before {
    content: "";
  }

  /* ---------- Section break (print style, not a grey bar) ---------- */

  hr {
    border: none;
    height: 1em;
    margin: 1.3em 0;
    text-align: center;
  }
  hr::before {
    content: "* * *";
    color: #5a5a5a;
    letter-spacing: 0.6em;
    font-size: 0.95em;
  }

  /* ---------- Tables ---------- */

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.95em 0;
    font-size: 0.95em;
  }

  thead { display: table-header-group; }

  th {
    text-align: left;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    text-transform: uppercase;
    font-size: 0.74em;
    letter-spacing: 0.1em;
    font-weight: 700;
    color: #000;
    padding: 0.45em 0.65em;
    border-top: 2px solid #000;
    border-bottom: 1px solid #000;
    background: transparent;
  }

  td {
    padding: 0.4em 0.65em;
    border-bottom: 1px solid #e0e0e0;
    color: #1a1a1a;
    vertical-align: top;
  }

  tbody tr:last-child td {
    border-bottom: 2px solid #000;
  }

  /* ---------- Strikethrough ---------- */

  del, s {
    color: #7a7a7a;
    text-decoration: line-through;
  }

  /* ---------- Task lists ---------- */

  ul.contains-task-list {
    list-style: none;
    padding-left: 0.2em;
  }
  li.task-list-item { list-style: none; padding-left: 0; margin-left: 0; }

  li.task-list-item input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 0.78em;
    height: 0.78em;
    border: 1px solid #000;
    margin: 0 0.5em 0 0;
    vertical-align: -0.04em;
    position: relative;
    background: #fff;
  }
  li.task-list-item input[type="checkbox"]:checked::after {
    content: "";
    position: absolute;
    inset: 0.1em;
    background: #000;
  }

  /* ---------- Callouts (run-in, print-manual style) ---------- */

  .callout {
    margin: 0.85em 0;
    break-inside: avoid;
  }

  .callout > p { margin: 0 0 0.35em; }
  .callout > p:last-child { margin-bottom: 0; }

  .callout__tag {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.78em;
    font-weight: 700;
    letter-spacing: 0.14em;
    color: #000;
    margin-right: 0.45em;
  }

  /* NOTE is the default voice: quiet tag, no chrome. */

  /* WARN: reader must not miss — thick left rule in ink. */
  .callout--warn .callout__tag { color: #000; }
  .callout--warn { border-left: 2px solid #000; padding-left: 0.8em; }

  /* SYSTEM: a machine voice. Dashed left rule reads as "from the machine",
     and the body itself renders in JetBrains Mono so it's unambiguously
     distinct from the surrounding prose (and from a plain NOTE). */
  .callout--system {
    border-left: 1px dashed #3a3a3a;
    padding-left: 0.8em;
    color: #3a3a3a;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.9em;
    font-style: normal;
    line-height: 1.5;
  }
  .callout--system .callout__tag { font-style: normal; color: #000; }

  /* ---------- Images & figures ---------- */

  img { max-width: 100%; height: auto; }

  /* Auto-number figures. A counter runs across the whole document so Fig. 1
     on page 2 and Fig. 2 on page 5 stay consistent in the print order. */
  body { counter-reset: figure; }

  figure.figure {
    counter-increment: figure;
    margin: 1.1em 0;
    break-inside: avoid;
    page-break-inside: avoid;
    text-align: center;
  }

  figure.figure img {
    display: block;
    margin: 0 auto;
  }

  figcaption.figure__caption {
    margin-top: 0.5em;
    font-family: "Lora", Georgia, serif;
    font-style: italic;
    font-size: 9pt;
    color: #5a5a5a;
    line-height: 1.4;
    text-align: center;
  }

  figcaption.figure__caption::before {
    content: "Fig. " counter(figure) ". ";
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-style: normal;
    font-weight: 700;
    font-size: 0.85em;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #000;
    margin-right: 0.35em;
  }

  sup, sub { font-size: 0.72em; }

  /* ---------- Footnotes ---------- */

  .footnotes {
    font-size: 8.5pt;
    color: #5a5a5a;
    border-top: 1px solid #c8c8c8;
    margin-top: 2em;
    padding-top: 0.65em;
  }
  .footnotes ol { padding-left: 1.2em; }
  .footnotes p { margin: 0.15em 0; }

  /* ---------- Print ---------- */

  /* Keep atomic blocks on one page — a code sample or table split mid-way
     reads as a printing accident, not as design. */
  pre, blockquote, .callout, table, figure, .doc-titleblock {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Never orphan a heading at the bottom of a page. */
  h1, h2, h3, h4, h5, h6 {
    break-after: avoid-page;
    page-break-after: avoid;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* Figcaption must stay with its image. */
  figure.figure img { break-after: avoid-page; page-break-after: avoid; }
  figcaption.figure__caption { break-before: avoid-page; page-break-before: avoid; }

  /* Paragraphs: leave at least 3 lines on each side of a page break so a
     single orphaned word or dangling last line never sits alone. */
  p, li, td, th { orphans: 3; widows: 3; }

  /* Don't strand the first row of a table or the first paragraph of a
     blockquote at the bottom of a page. */
  thead { break-after: avoid-page; page-break-after: avoid; }
  blockquote > :first-child { break-after: avoid-page; page-break-after: avoid; }

  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

// Cover page styles — emitted only when the document has a cover.
//
// The cover page is rendered as its own separate PDF (without Playwright
// header/footer) and prepended to the body PDF at merge time. That's the
// only reliable way to suppress the running header on page 1 — Chromium's
// print engine paints header/footer iframes independent of any CSS @page
// override, so it has to be disabled at the pdf() call level.
export const COVER_PAGE_STYLES = /* css */ `
  .cover-page {
    padding: 25mm 10mm 15mm;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
  }

  .cover-titleblock {
    max-width: 44em;
  }

  .cover-kicker {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 9pt;
    font-weight: 700;
    color: #000;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    margin-bottom: 1.4em;
  }

  h1.cover-title {
    font-family: "IBM Plex Serif", "Lora", Georgia, serif;
    font-size: 46pt;
    font-weight: 700;
    line-height: 1.02;
    letter-spacing: -0.025em;
    color: #000;
    margin: 0 0 0.55em;
    padding: 0;
    border: none;
    box-shadow: none;
  }

  .cover-deck {
    font-family: "Lora", Georgia, serif;
    font-size: 14pt;
    font-weight: 400;
    line-height: 1.35;
    color: #3a3a3a;
    margin: 0 0 1.2em;
    max-width: 38em;
  }

  .cover-sigrule {
    width: 64px;
    height: 0;
    border-top: 1.5px solid #000;
    margin: 1em 0 1.3em;
  }

  .cover-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.4em 2em;
    align-items: baseline;
    font-size: 9.5pt;
    line-height: 1.3;
  }

  .cover-meta__cell {
    display: inline-flex;
    align-items: baseline;
    gap: 0.5em;
  }

  .cover-meta__label {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.85em;
    font-weight: 600;
    color: #7a7a7a;
    text-transform: uppercase;
    letter-spacing: 0.14em;
  }

  .cover-meta__value {
    font-family: "Lora", Georgia, serif;
    color: #1a1a1a;
  }

  .cover-colophon {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 7.5pt;
    color: #8a8a8a;
    text-transform: uppercase;
    letter-spacing: 0.28em;
    text-align: right;
    margin-top: auto;
    padding-top: 2em;
    border-top: 0.5px solid #c8c8c8;
  }
`;
