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

  /* ---------- Headings ---------- */

  h1, h2, h3, h4, h5, h6 {
    font-family: "IBM Plex Serif", "Lora", Georgia, serif;
    color: #000;
    margin: 1.25em 0 0.3em;
    line-height: 1.18;
    letter-spacing: -0.005em;
    break-after: avoid-page;
    page-break-after: avoid;
  }

  h1 {
    font-size: 24pt;
    font-weight: 700;
    letter-spacing: -0.015em;
    margin-top: 0;
    padding-bottom: 0.25em;
    border-bottom: 2px solid #000;
    box-shadow: 0 3px 0 -2px #000; /* second rule below, 1pt below the main */
  }

  h2 {
    font-size: 15.5pt;
    font-weight: 700;
    margin-top: 1.5em;
    padding-bottom: 0.18em;
    border-bottom: 1px solid #000;
  }

  h3 {
    font-size: 12pt;
    font-weight: 700;
    margin-top: 1.15em;
  }

  h4 {
    font-size: 10.5pt;
    font-weight: 700;
    font-style: italic;
    margin-top: 1em;
    color: #111;
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

  .callout--warn .callout__tag { color: #000; }
  .callout--warn { border-left: 2px solid #000; padding-left: 0.8em; }
  .callout--system { color: #3a3a3a; font-style: italic; }
  .callout--system .callout__tag { font-style: normal; color: #000; }

  /* ---------- Images ---------- */

  img { max-width: 100%; height: auto; }

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

  pre, blockquote, .callout, table, figure {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  h1, h2, h3 {
    break-after: avoid-page;
    page-break-after: avoid;
  }
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;
