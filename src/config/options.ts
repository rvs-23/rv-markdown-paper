export type Margins = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

export type DocumentOptions = {
  title?: string;
  author?: string;
  date?: string;
  pageSize: "Letter" | "A4";
  margins: Margins;
  showHeader: boolean;
  showFooter: boolean;
};

export type DocumentOptionsLayer = {
  title?: string;
  author?: string;
  date?: string;
  pageSize?: "Letter" | "A4";
  margins?: Partial<Margins>;
  showHeader?: boolean;
  showFooter?: boolean;
};

export const DEFAULTS: DocumentOptions = {
  pageSize: "Letter",
  margins: {
    top: "1in",
    right: "0.9in",
    bottom: "1in",
    left: "0.9in",
  },
  showHeader: true,
  showFooter: true,
};
