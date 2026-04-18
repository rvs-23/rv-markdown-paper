export type Margins = {
  top: string;
  right: string;
  bottom: string;
  left: string;
};

export type PaperTone = "cool-white" | "pure-white";
export type Accent = "graphite" | "forest";
export type BodyFont = "lora" | "inter";
export type HeadingFont = "plex-serif" | "lora";
export type Density = "compact" | "normal";

export type Theme = {
  paperTone: PaperTone;
  accent: Accent;
  bodyFont: BodyFont;
  headingFont: HeadingFont;
  density: Density;
};

export type ThemeLayer = Partial<Theme>;

export type DocumentOptions = {
  title?: string;
  author?: string;
  date?: string;
  pageSize: "Letter" | "A4";
  margins: Margins;
  showHeader: boolean;
  showFooter: boolean;
  theme: Theme;
};

export type DocumentOptionsLayer = {
  title?: string;
  author?: string;
  date?: string;
  pageSize?: "Letter" | "A4";
  margins?: Partial<Margins>;
  showHeader?: boolean;
  showFooter?: boolean;
  theme?: ThemeLayer;
};

export const DEFAULTS: DocumentOptions = {
  pageSize: "Letter",
  margins: {
    top: "1.05in",
    right: "0.95in",
    bottom: "0.95in",
    left: "0.95in",
  },
  showHeader: true,
  showFooter: true,
  theme: {
    paperTone: "cool-white",
    accent: "graphite",
    bodyFont: "lora",
    headingFont: "plex-serif",
    density: "normal",
  },
};

export const PAPER_TONES: readonly PaperTone[] = ["cool-white", "pure-white"] as const;
export const ACCENTS: readonly Accent[] = ["graphite", "forest"] as const;
export const BODY_FONTS: readonly BodyFont[] = ["lora", "inter"] as const;
export const HEADING_FONTS: readonly HeadingFont[] = ["plex-serif", "lora"] as const;
export const DENSITIES: readonly Density[] = ["compact", "normal"] as const;
