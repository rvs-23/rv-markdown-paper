export type Margins = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

// A key/value pair rendered in the cover's "meta" column.
export type MetaPair = { label: string; value: string };

// A single entry in the cover TOC. `id` is what the reader sees (e.g. "7.1"),
// `title` is the section title, `ref` is the Typst label / heading ID used for
// cross-referencing from body copy. `page` is the page number to display in the
// TOC; provisional manual values today, will become a Typst-side
// `counter(page).at(label)` lookup once page choreography stabilises (see
// commit 15 of the post-review plan).
export type TocEntry = {
  id: string;
  title: string;
  ref?: string;
  page?: string;
};

export type Cover = {
  kicker?: string;
  title?: string;
  subtitle?: string;
  meta?: MetaPair[];
  toc?: TocEntry[];
};

export type DocumentOptions = {
  // Classic, still supported for plain documents.
  title?: string;
  subtitle?: string;
  section?: string;
  author?: string;
  date?: string;
  readingTime?: string;

  // Editorial-book fields.
  chapter?: number | string;
  part?: string;
  series?: string;       // book title — e.g. "Python in Practice"
  edition?: string;      // full edition string — e.g. "Edition 2 · 2026"
  editionShort?: string; // short edition for the cover-foot — e.g. "Edition 2"
  volume?: string;
  pageStart?: number;
  pageEnd?: number;
  cover?: Cover;

  // Layout.
  pageSize: "Letter" | "A4";
  margins: Margins;
  showHeader: boolean;
  showFooter: boolean;
  showCover: boolean;

  // Optional page-background override as a "#RRGGBB" hex string. When
  // set, the surface, hairline, and danger-fg tokens are re-derived
  // from this value so the whole neutral palette tracks the chosen
  // paper colour. When omitted, the canonical defaults in
  // src/typst/palette.typ apply.
  paperBg?: string;

  // Footnote placement. "page" (default) uses Typst's native page-bottom
  // footnotes — the body of each `[^x]` definition renders at the
  // bottom of the page where the reference appears. "endnotes" defers
  // every footnote to a single NOTES block at the end of the document
  // body, with inline superscript numerals at the reference sites.
  // Editorial / book-style documents typically want "endnotes".
  footnotes: "page" | "endnotes";
};

export type DocumentOptionsLayer = {
  title?: string;
  subtitle?: string;
  section?: string;
  author?: string;
  date?: string;
  readingTime?: string;
  chapter?: number | string;
  part?: string;
  series?: string;
  edition?: string;
  editionShort?: string;
  volume?: string;
  pageStart?: number;
  pageEnd?: number;
  cover?: Cover;
  pageSize?: "Letter" | "A4";
  margins?: Partial<Margins>;
  showHeader?: boolean;
  showFooter?: boolean;
  showCover?: boolean;
  paperBg?: string;
  footnotes?: "page" | "endnotes";
};

export const DEFAULTS: DocumentOptions = {
  pageSize: "A4",
  // Editorial + Swiss: 24mm top, 22mm elsewhere. The right margin reserved
  // for the marginalia rail (~62mm = 5mm gap + 35mm rail + 22mm outer) is
  // applied by the template itself when the marginalia rail is enabled, so
  // these values describe the *content column* margins.
  margins: {
    top: "24mm",
    right: "22mm",
    bottom: "22mm",
    left: "22mm",
  },
  showHeader: true,
  showFooter: true,
  showCover: true,
  footnotes: "page",
};
