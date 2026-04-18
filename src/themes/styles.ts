export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Lora:ital,wght@0,400..700;1,400..700" +
  "&family=IBM+Plex+Serif:ital,wght@0,400;0,600;0,700;1,400" +
  "&family=JetBrains+Mono:ital,wght@0,400;0,600;1,400" +
  "&display=swap";

export const STYLESHEET = /* css */ `
  :root {
    color-scheme: light only;
  }

  body {
    font-family: "Lora", Georgia, "Times New Roman", serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #111;
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
    margin: 1.7em 0 0.5em;
    line-height: 1.2;
    letter-spacing: -0.005em;
    break-after: avoid-page;
    page-break-after: avoid;
  }

  h1 {
    font-size: 26pt;
    font-weight: 700;
    letter-spacing: -0.015em;
    margin-top: 0;
    padding-bottom: 0.35em;
    border-bottom: 1px solid #000;
  }

  h2 {
    font-size: 17pt;
    font-weight: 700;
    padding-bottom: 0.2em;
    border-bottom: 1px solid #cfcfcf;
  }

  h3 { font-size: 13pt; font-weight: 600; }
  h4 { font-size: 11pt; font-weight: 600; font-style: italic; }

  p {
    margin: 0 0 0.9em;
    orphans: 3;
    widows: 3;
    hyphens: auto;
  }

  strong { font-weight: 700; color: #000; }
  em { font-style: italic; }

  /* ---------- Lists ---------- */

  ul, ol {
    margin: 0 0 1.1em;
    padding-left: 1.5em;
  }
  li { margin-bottom: 0.25em; }
  li > ul, li > ol { margin-top: 0.25em; margin-bottom: 0.25em; }

  /* ---------- Links ---------- */

  a {
    color: #000;
    text-decoration: underline;
    text-decoration-thickness: 0.06em;
    text-underline-offset: 0.18em;
  }

  /* ---------- Blockquotes ---------- */

  blockquote {
    margin: 1.2em 0;
    padding: 0.1em 0 0.1em 1em;
    border-left: 2px solid #000;
    color: #3d3d3d;
    font-style: italic;
    break-inside: avoid;
  }

  /* ---------- Inline code ---------- */

  code {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.88em;
    background: #efefef;
    padding: 1px 5px;
  }

  /* ---------- Code blocks (dark panel) ---------- */

  pre {
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 9.5pt;
    background: #111113;
    color: #e8e8e8;
    padding: 1.05em 1.1em 1em;
    margin: 1.2em 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    break-inside: avoid;
    line-height: 1.6;
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
    padding-top: 2.1em;
  }

  pre.shiki code { display: block; }

  pre.shiki::before {
    content: attr(data-language);
    position: absolute;
    top: 0.65em;
    right: 1em;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.72em;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-weight: 600;
  }

  pre.shiki[data-language="plaintext"]::before,
  pre.shiki[data-language="text"]::before {
    content: "";
  }

  /* ---------- Horizontal rule ---------- */

  hr {
    border: none;
    border-top: 1px solid #c8c8c8;
    margin: 2.2em 0;
  }

  /* ---------- Tables ---------- */

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1.2em 0;
    font-size: 0.95em;
  }

  thead { display: table-header-group; }

  th {
    text-align: left;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    text-transform: uppercase;
    font-size: 0.78em;
    letter-spacing: 0.09em;
    font-weight: 600;
    color: #000;
    padding: 0.55em 0.75em;
    border-top: 1.5px solid #000;
    border-bottom: 1px solid #000;
    background: transparent;
  }

  td {
    padding: 0.5em 0.75em;
    border-bottom: 1px solid #e4e4e4;
    vertical-align: top;
  }

  tbody tr:last-child td {
    border-bottom: 1.5px solid #000;
  }

  /* ---------- Strikethrough ---------- */

  del, s {
    color: #888;
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
    width: 0.85em;
    height: 0.85em;
    border: 1px solid #000;
    margin: 0 0.55em 0 0;
    vertical-align: -0.06em;
    position: relative;
    background: #fff;
  }
  li.task-list-item input[type="checkbox"]:checked::after {
    content: "";
    position: absolute;
    inset: 0.12em;
    background: #000;
  }

  /* ---------- Callouts (bare, monochrome) ---------- */

  .callout {
    margin: 1.3em 0;
    padding: 0.1em 0 0.1em 1em;
    border-left: 2px solid #000;
    break-inside: avoid;
  }

  .callout__tag {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.72em;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-weight: 700;
    color: #000;
    margin: 0 0 0.35em;
  }

  .callout > p { margin: 0 0 0.5em; }
  .callout > p:last-child { margin-bottom: 0; }

  .callout--system { border-left-style: dashed; }

  /* ---------- Images ---------- */

  img { max-width: 100%; height: auto; }

  sup, sub { font-size: 0.72em; }

  /* ---------- Footnotes ---------- */

  .footnotes {
    font-size: 9pt;
    color: #3d3d3d;
    border-top: 1px solid #c8c8c8;
    margin-top: 2.5em;
    padding-top: 0.8em;
  }
  .footnotes ol { padding-left: 1.2em; }
  .footnotes p { margin: 0.2em 0; }

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
