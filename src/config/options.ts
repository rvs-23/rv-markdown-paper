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
// cross-referencing from body copy.
export type TocEntry = { id: string; title: string; ref?: string };

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
  edition?: string;
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
  edition?: string;
  volume?: string;
  pageStart?: number;
  pageEnd?: number;
  cover?: Cover;
  pageSize?: "Letter" | "A4";
  margins?: Partial<Margins>;
  showHeader?: boolean;
  showFooter?: boolean;
  showCover?: boolean;
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
};
