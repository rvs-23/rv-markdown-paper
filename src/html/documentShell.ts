import { GOOGLE_FONTS_HREF, STYLESHEET, COVER_PAGE_STYLES } from "../themes/styles.js";
import { renderCoverPage, type CoverPageFields } from "./coverPage.js";

export type TitleBlockFields = {
  title?: string;
  subtitle?: string;
  section?: string;
  author?: string;
  date?: string;
  readingTime?: string;
};

export type DocumentShellOptions = {
  title?: string;
  baseUrl?: string;
  titleBlock?: TitleBlockFields;
};

export function wrapInDocumentShell(htmlBody: string, options: DocumentShellOptions = {}): string {
  const { title = "Document", baseUrl, titleBlock } = options;
  const baseTag = baseUrl ? `    <base href="${escapeAttribute(baseUrl)}" />\n` : "";
  const titleBlockHtml = titleBlock ? renderTitleBlock(titleBlock) : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
${baseTag}    <title>${escapeAttribute(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="${GOOGLE_FONTS_HREF}" />
    <style>${STYLESHEET}</style>
  </head>
  <body>
    <main class="document">
${titleBlockHtml}${htmlBody}
    </main>
  </body>
</html>`;
}

// The cover page is rendered into its own HTML document and then emitted
// as a standalone PDF that gets prepended to the body PDF at merge time.
// Doing two separate renders is the only way to get Chromium to skip the
// Playwright header/footer on the cover — the header iframe is painted by
// the print engine regardless of CSS @page :first margin overrides, so we
// disable it at the pdf() call level instead.
export type CoverShellOptions = {
  baseUrl?: string;
  cover: CoverPageFields;
};

export function wrapCoverInShell(options: CoverShellOptions): string {
  const { baseUrl, cover } = options;
  const baseTag = baseUrl ? `    <base href="${escapeAttribute(baseUrl)}" />\n` : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
${baseTag}    <title>${escapeAttribute(cover.title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="${GOOGLE_FONTS_HREF}" />
    <style>${STYLESHEET}${COVER_PAGE_STYLES}</style>
  </head>
  <body>
${renderCoverPage(cover)}  </body>
</html>`;
}

function renderTitleBlock(fields: TitleBlockFields): string {
  if (!fields.title) return "";

  const parts: string[] = [];
  parts.push(`<header class="doc-titleblock">`);
  if (fields.section) {
    parts.push(`  <div class="doc-kicker">${escapeHtml(fields.section)}</div>`);
  }
  parts.push(`  <h1 class="doc-title">${escapeHtml(fields.title)}</h1>`);
  if (fields.subtitle) {
    parts.push(`  <p class="doc-deck">${escapeHtml(fields.subtitle)}</p>`);
  }
  parts.push(`  <div class="doc-sigrule" aria-hidden="true"></div>`);

  const metaCells: string[] = [];
  if (fields.author) metaCells.push(metaCell("BY", fields.author));
  if (fields.date) metaCells.push(metaCell("ON", fields.date));
  if (fields.readingTime) metaCells.push(metaCell("READ", fields.readingTime));
  if (metaCells.length > 0) {
    parts.push(`  <div class="doc-meta">${metaCells.join("")}</div>`);
  }

  parts.push(`</header>`);
  return parts.join("\n") + "\n";
}

function metaCell(label: string, value: string): string {
  return `<span class="doc-meta__cell"><span class="doc-meta__label">${escapeHtml(label)}</span><span class="doc-meta__value">${escapeHtml(value)}</span></span>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttribute(text: string): string {
  return escapeHtml(text);
}
