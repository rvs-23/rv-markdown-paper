import type { ThemeRegistrationRaw } from "shiki";
import type { Accent, PaperTone } from "../config/options.js";

export const ACCENT_HEX: Record<Accent, string> = {
  graphite: "#334155",
  forest: "#2d5a3d",
};

export const CODE_BG: Record<PaperTone, string> = {
  "cool-white": "#eef0f3",
  "pure-white": "#f4f4f5",
};

export function buildShikiTheme(paperTone: PaperTone, accent: Accent): ThemeRegistrationRaw {
  const bg = CODE_BG[paperTone];
  const fg = "#18181b";
  const muted = "#71717a";
  const punct = "#52525b";
  const subtle = "#3f3f46";
  const accentHex = ACCENT_HEX[accent];

  return {
    name: `paper-${paperTone}-${accent}`,
    type: "light",
    colors: {
      "editor.background": bg,
      "editor.foreground": fg,
    },
    settings: [
      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: muted, fontStyle: "italic" } },
      { scope: ["keyword", "storage", "storage.type", "keyword.control", "keyword.operator.new"], settings: { foreground: accentHex, fontStyle: "bold" } },
      { scope: ["string", "string.quoted", "meta.string"], settings: { foreground: subtle } },
      { scope: ["string.regexp", "constant.character.escape"], settings: { foreground: subtle } },
      { scope: ["constant.numeric", "constant.language", "constant.language.boolean", "constant.language.null"], settings: { foreground: "#27272a" } },
      { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: fg, fontStyle: "bold" } },
      { scope: ["entity.name.class", "entity.name.type", "support.class", "support.type"], settings: { foreground: accentHex, fontStyle: "bold" } },
      { scope: ["variable", "variable.other", "meta.definition.variable"], settings: { foreground: fg } },
      { scope: ["variable.parameter"], settings: { foreground: subtle, fontStyle: "italic" } },
      { scope: ["entity.other.attribute-name", "entity.name.tag"], settings: { foreground: accentHex } },
      { scope: ["keyword.operator", "punctuation", "meta.brace", "punctuation.separator"], settings: { foreground: punct } },
      { scope: ["markup.bold"], settings: { foreground: fg, fontStyle: "bold" } },
      { scope: ["markup.italic"], settings: { foreground: fg, fontStyle: "italic" } },
      { scope: ["markup.heading"], settings: { foreground: fg, fontStyle: "bold" } },
      { scope: ["invalid"], settings: { foreground: accentHex, fontStyle: "underline" } },
    ],
  };
}
