export type CoverPageFields = {
  title: string;
  subtitle?: string;
  section?: string;
  author?: string;
  date?: string;
  readingTime?: string;
};

// A dedicated first page carrying just the title block. The rest of the
// document starts on page 2, and the running header is suppressed on this
// page via the @page :first margin-top: 0 rule in the stylesheet.
export function renderCoverPage(fields: CoverPageFields): string {
  const parts: string[] = [];
  parts.push(`<section class="cover-page">`);
  parts.push(`  <header class="cover-titleblock">`);
  if (fields.section) {
    parts.push(`    <div class="cover-kicker">${escapeHtml(fields.section)}</div>`);
  }
  parts.push(`    <h1 class="cover-title">${escapeHtml(fields.title)}</h1>`);
  if (fields.subtitle) {
    parts.push(`    <p class="cover-deck">${escapeHtml(fields.subtitle)}</p>`);
  }
  parts.push(`    <div class="cover-sigrule" aria-hidden="true"></div>`);

  const metaCells: string[] = [];
  if (fields.author) metaCells.push(metaCell("BY", fields.author));
  if (fields.date) metaCells.push(metaCell("ON", fields.date));
  if (fields.readingTime) metaCells.push(metaCell("READ", fields.readingTime));
  if (metaCells.length > 0) {
    parts.push(`    <div class="cover-meta">${metaCells.join("")}</div>`);
  }

  parts.push(`  </header>`);
  parts.push(`  <div class="cover-colophon" aria-hidden="true">rv · markdown · paper</div>`);
  parts.push(`</section>`);
  return parts.join("\n") + "\n";
}

function metaCell(label: string, value: string): string {
  return `<span class="cover-meta__cell"><span class="cover-meta__label">${escapeHtml(label)}</span><span class="cover-meta__value">${escapeHtml(value)}</span></span>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
