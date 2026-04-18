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
    top: "1.05in",
    right: "0.85in",
    bottom: "0.95in",
    left: "0.85in",
  },
  showHeader: true,
  showFooter: true,
};
