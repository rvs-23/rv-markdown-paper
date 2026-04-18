const placeholderCss = `
  :root {
    color-scheme: light only;
  }

  body {
    font-family: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 11pt;
    line-height: 1.55;
    color: #111;
    margin: 0;
  }

  main {
    max-width: 100%;
  }

  h1, h2, h3, h4, h5, h6 {
    color: #000;
    margin: 1.6em 0 0.5em;
    line-height: 1.25;
    break-after: avoid;
  }

  h1 {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 22pt;
    border-top: 1px solid #000;
    padding-top: 0.6em;
    margin-top: 0;
  }

  h2 { font-size: 17pt; }
  h3 { font-size: 13pt; }
  h4 { font-size: 11pt; }

  p {
    margin: 0 0 0.9em;
    orphans: 3;
    widows: 3;
  }

  ul, ol {
    margin: 0 0 1em;
    padding-left: 1.4em;
  }

  li {
    margin-bottom: 0.3em;
  }

  a {
    color: #000;
    text-decoration: underline;
  }

  blockquote {
    margin: 1em 0;
    padding: 0.2em 0 0.2em 1em;
    border-left: 2px solid #000;
    color: #444;
    break-inside: avoid;
  }

  code {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.92em;
    background: #ececec;
    padding: 1px 5px;
  }

  pre {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 10pt;
    background: #0a0a0a;
    color: #e8e8e8;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 14px 16px;
    margin: 1.2em 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    break-inside: avoid;
    line-height: 1.5;
  }

  pre code {
    font-size: inherit;
    background: transparent;
    padding: 0;
  }

  pre.shiki {
    position: relative;
    padding-top: 2em;
  }

  pre.shiki code {
    display: block;
  }

  pre.shiki::before {
    content: attr(data-language);
    position: absolute;
    top: 0.55em;
    right: 0.9em;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.72em;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }

  pre.shiki[data-language="plaintext"]::before,
  pre.shiki[data-language="text"]::before {
    content: "";
  }

  hr {
    border: none;
    border-top: 1px solid #c8c8c8;
    margin: 2em 0;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
    border-bottom: 2px solid #000;
  }

  thead {
    display: table-header-group;
  }

  th {
    text-align: left;
    background: #ececec;
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    text-transform: uppercase;
    font-size: 0.85em;
    letter-spacing: 0.05em;
    padding: 6px 10px;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
  }

  td {
    padding: 6px 10px;
    border-bottom: 1px solid #c8c8c8;
    vertical-align: top;
  }

  del, s {
    color: #888;
    text-decoration: line-through;
  }

  ul.contains-task-list {
    list-style: none;
    padding-left: 0.2em;
  }

  li.task-list-item {
    list-style: none;
    padding-left: 0;
    margin-left: 0;
  }

  li.task-list-item input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    width: 0.9em;
    height: 0.9em;
    border: 1px solid #000;
    margin: 0 0.55em 0 0;
    vertical-align: -0.08em;
    position: relative;
    background: #fff;
  }

  li.task-list-item input[type="checkbox"]:checked::after {
    content: "";
    position: absolute;
    inset: 0.12em;
    background: #000;
  }

  /* ---------- Callouts ---------- */

  .callout {
    margin: 1.4em 0;
    border: 1px solid #000;
    padding: 0 0 0.7em;
    break-inside: avoid;
  }

  .callout__label {
    font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    font-size: 0.72em;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-weight: 700;
    padding: 5px 10px;
    margin: 0 0 0.7em;
    border-bottom: 1px solid #000;
  }

  .callout > *:not(.callout__label) {
    margin-left: 1em;
    margin-right: 1em;
    margin-bottom: 0.5em;
  }

  .callout > *:not(.callout__label):last-child {
    margin-bottom: 0;
  }

  .callout--note .callout__label {
    background: #ececec;
    color: #000;
  }

  .callout--warn .callout__label {
    background: #000;
    color: #fff;
  }

  .callout--system {
    border: 1px dashed #000;
  }
  .callout--system .callout__label {
    background: transparent;
    color: #000;
    border-bottom: 1px dashed #000;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  sup, sub {
    font-size: 0.75em;
  }

  .footnotes {
    font-size: 9pt;
    color: #444;
    border-top: 1px solid #c8c8c8;
    margin-top: 2.5em;
    padding-top: 0.8em;
  }

  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
`;

export type DocumentShellOptions = {
  title?: string;
  baseUrl?: string;
};

export function wrapInDocumentShell(htmlBody: string, options: DocumentShellOptions = {}): string {
  const { title = "Document", baseUrl } = options;
  const baseTag = baseUrl ? `    <base href="${escapeAttribute(baseUrl)}" />\n` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
${baseTag}    <title>${escapeAttribute(title)}</title>
    <style>${placeholderCss}</style>
  </head>
  <body>
    <main class="document">
${htmlBody}
    </main>
  </body>
</html>`;
}

function escapeAttribute(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
