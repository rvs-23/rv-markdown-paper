import { ACCENT_HEX, CODE_BG } from "./shikiTheme.js";

export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2" +
  "?family=Lora:ital,wght@0,400..700;1,400..700" +
  "&family=Inter:wght@400;500;600;700" +
  "&family=IBM+Plex+Serif:ital,wght@0,400;0,500;0,700;1,400" +
  "&family=JetBrains+Mono:ital,wght@0,400;0,600;1,400" +
  "&display=swap";

export const STYLESHEET = /* css */ `
  :root {
    color-scheme: light only;

    /* paper tone — cool-white default, overridden by [data-paper-tone="pure-white"] */
    --paper: #fafbfc;
    --ink: #18181b;
    --ink-soft: #3f3f46;
    --muted: #71717a;
    --rule: #d4d4d8;
    --rule-soft: #e4e4e7;
    --code-bg: ${CODE_BG["cool-white"]};
    --code-inline-bg: #e9ecef;

    /* accent — graphite default */
    --accent: ${ACCENT_HEX.graphite};
    --accent-soft: #e2e8f0;

    /* type */
    --body-font: "Lora", Georgia, "Times New Roman", serif;
    --heading-font: "IBM Plex Serif", "Lora", Georgia, serif;
    --mono-font: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

    /* density — normal default */
    --body-size: 11pt;
    --body-leading: 1.62;
    --para-gap: 0.95em;
    --heading-gap-top: 1.65em;
    --heading-gap-bottom: 0.55em;
    --h1-size: 26pt;
    --h2-size: 17pt;
    --h3-size: 13pt;
    --h4-size: 11pt;
    --block-gap: 1.35em;
  }

  [data-paper-tone="pure-white"] {
    --paper: #ffffff;
    --code-bg: ${CODE_BG["pure-white"]};
    --code-inline-bg: #f4f4f5;
  }

  [data-accent="forest"] {
    --accent: ${ACCENT_HEX.forest};
    --accent-soft: #dbe7df;
  }

  [data-body-font="inter"] {
    --body-font: "Inter", -apple-system, "Segoe UI", system-ui, sans-serif;
  }

  [data-heading-font="lora"] {
    --heading-font: "Lora", Georgia, serif;
  }

  [data-density="compact"] {
    --body-size: 10.5pt;
    --body-leading: 1.5;
    --para-gap: 0.7em;
    --heading-gap-top: 1.3em;
    --heading-gap-bottom: 0.4em;
    --h1-size: 22pt;
    --h2-size: 15pt;
    --h3-size: 12pt;
    --h4-size: 10.5pt;
    --block-gap: 1.05em;
  }

  html, body {
    background: var(--paper);
  }

  body {
    font-family: var(--body-font);
    font-size: var(--body-size);
    line-height: var(--body-leading);
    color: var(--ink);
    margin: 0;
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "kern", "liga", "onum";
    text-rendering: optimizeLegibility;
  }

  main { max-width: 100%; }

  /* ---------- Headings ---------- */

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--heading-font);
    color: var(--ink);
    margin: var(--heading-gap-top) 0 var(--heading-gap-bottom);
    line-height: 1.2;
    letter-spacing: -0.005em;
    break-after: avoid-page;
    page-break-after: avoid;
  }

  h1 {
    font-size: var(--h1-size);
    font-weight: 700;
    letter-spacing: -0.015em;
    margin-top: 0;
    padding-bottom: 0.35em;
    border-bottom: 1px solid var(--ink);
  }

  h2 {
    font-size: var(--h2-size);
    font-weight: 700;
    padding-bottom: 0.2em;
    border-bottom: 1px solid var(--rule);
  }

  h3 { font-size: var(--h3-size); font-weight: 600; }
  h4 { font-size: var(--h4-size); font-weight: 600; font-style: italic; }

  p {
    margin: 0 0 var(--para-gap);
    orphans: 3;
    widows: 3;
    hyphens: auto;
  }

  strong { font-weight: 700; color: var(--ink); }
  em { font-style: italic; }

  /* ---------- Lists ---------- */

  ul, ol {
    margin: 0 0 var(--block-gap);
    padding-left: 1.5em;
  }
  li { margin-bottom: 0.25em; }
  li > ul, li > ol { margin-top: 0.25em; margin-bottom: 0.25em; }

  /* ---------- Links ---------- */

  a {
    color: var(--accent);
    text-decoration: underline;
    text-decoration-thickness: 0.06em;
    text-underline-offset: 0.18em;
  }

  /* ---------- Blockquotes ---------- */

  blockquote {
    margin: var(--block-gap) 0;
    padding: 0.1em 0 0.1em 1em;
    border-left: 2px solid var(--rule);
    color: var(--ink-soft);
    font-style: italic;
    break-inside: avoid;
  }

  /* ---------- Code ---------- */

  code {
    font-family: var(--mono-font);
    font-size: 0.88em;
    background: var(--code-inline-bg);
    padding: 1px 5px;
    border-radius: 0;
  }

  pre {
    font-family: var(--mono-font);
    font-size: 9.5pt;
    background: var(--code-bg);
    color: var(--ink);
    padding: 1em 1.1em 0.95em;
    margin: var(--block-gap) 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    break-inside: avoid;
    line-height: 1.58;
    border-left: 2px solid var(--accent);
  }

  pre code {
    font-size: inherit;
    background: transparent;
    padding: 0;
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
    font-family: var(--mono-font);
    font-size: 0.72em;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-weight: 600;
  }

  pre.shiki[data-language="plaintext"]::before,
  pre.shiki[data-language="text"]::before {
    content: "";
  }

  /* ---------- Rule ---------- */

  hr {
    border: none;
    border-top: 1px solid var(--rule);
    margin: 2.2em 0;
  }

  /* ---------- Tables ---------- */

  table {
    border-collapse: collapse;
    width: 100%;
    margin: var(--block-gap) 0;
    font-size: 0.95em;
  }

  thead { display: table-header-group; }

  th {
    text-align: left;
    font-family: var(--mono-font);
    text-transform: uppercase;
    font-size: 0.78em;
    letter-spacing: 0.09em;
    font-weight: 600;
    color: var(--accent);
    padding: 0.55em 0.75em;
    border-top: 1.5px solid var(--ink);
    border-bottom: 1px solid var(--ink);
    background: transparent;
  }

  td {
    padding: 0.5em 0.75em;
    border-bottom: 1px solid var(--rule-soft);
    vertical-align: top;
  }

  tbody tr:last-child td {
    border-bottom: 1.5px solid var(--ink);
  }

  /* ---------- Strikethrough ---------- */

  del, s {
    color: var(--muted);
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
    border: 1px solid var(--ink);
    margin: 0 0.55em 0 0;
    vertical-align: -0.06em;
    position: relative;
    background: transparent;
  }
  li.task-list-item input[type="checkbox"]:checked {
    background: var(--accent);
    border-color: var(--accent);
  }
  li.task-list-item input[type="checkbox"]:checked::after {
    content: "";
    position: absolute;
    left: 0.18em;
    top: 0.02em;
    width: 0.22em;
    height: 0.45em;
    border: solid var(--paper);
    border-width: 0 0.1em 0.1em 0;
    transform: rotate(45deg);
  }

  /* ---------- Callouts (bare) ---------- */

  .callout {
    margin: var(--block-gap) 0;
    padding: 0.15em 0 0.15em 1.1em;
    border-left: 2px solid var(--accent);
    break-inside: avoid;
  }

  .callout__tag {
    font-family: var(--mono-font);
    font-size: 0.72em;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-weight: 600;
    color: var(--accent);
    margin: 0 0 0.35em;
  }

  .callout > p { margin: 0 0 0.5em; }
  .callout > p:last-child { margin-bottom: 0; }

  .callout--warn .callout__tag::after { content: " ·"; }
  .callout--system { border-left-style: dashed; }

  /* ---------- Images ---------- */

  img { max-width: 100%; height: auto; }

  sup, sub { font-size: 0.72em; }

  /* ---------- Footnotes ---------- */

  .footnotes {
    font-size: 9pt;
    color: var(--ink-soft);
    border-top: 1px solid var(--rule);
    margin-top: 2.5em;
    padding-top: 0.8em;
  }
  .footnotes ol { padding-left: 1.2em; }
  .footnotes p { margin: 0.2em 0; }

  /* ---------- Print ---------- */

  @page { margin: 0; }

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
