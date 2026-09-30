// Named page colours for --paper-bg / paperBg. Quiet, near-neutral tints
// so the single-ink design holds on all three. platinum is the template's
// default paper.
export const PAPER_PRESETS = {
  glacier: "#FAFBFC",
  platinum: "#F4F4F4",
  parchment: "#F5EEDD",
} as const;

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
// cross-referencing from body copy. `page` overrides the displayed page number;
// without it the template resolves the page at `ref`, offset by `pageStart`.
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

  // Optional page colour, stored as a "#RRGGBB" hex string (a preset
  // name from PAPER_PRESETS resolves to its hex during validation). The
  // surface, hairline, and danger-fg tokens derive from it (see
  // typst/local/mdpaper/0.1.0/palette.typ); default platinum, #F4F4F4.
  paperBg?: string;

  // Footnote placement. "page" (default) uses Typst's native page-bottom
  // footnotes — the body of each `[^x]` definition renders at the
  // bottom of the page where the reference appears. "endnotes" defers
  // every footnote to a single NOTES block at the end of the document
  // body, with inline superscript numerals at the reference sites.
  // Editorial / book-style documents typically want "endnotes".
  footnotes: "page" | "endnotes";
};

// One precedence layer (CLI, frontmatter, project config): every field
// optional, and margins may set any subset of sides.
export type DocumentOptionsLayer = Partial<Omit<DocumentOptions, "margins">> & {
  margins?: Partial<Margins>;
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
