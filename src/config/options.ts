export type Margins = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

export type DocumentOptions = {
  title?: string;
  subtitle?: string;
  section?: string;
  author?: string;
  date?: string;
  readingTime?: string;
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
  pageSize?: "Letter" | "A4";
  margins?: Partial<Margins>;
  showHeader?: boolean;
  showFooter?: boolean;
  showCover?: boolean;
};

export const DEFAULTS: DocumentOptions = {
  pageSize: "A4",
  margins: {
    top: "22mm",
    right: "20mm",
    bottom: "25mm",
    left: "20mm",
  },
  showHeader: true,
  showFooter: true,
  showCover: true,
};
