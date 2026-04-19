import type { ThemeRegistrationRaw } from "shiki";

// Light code panel: warm off-white background, wide grayscale token range,
// token identity conveyed by weight + italics + tone (not color).
//
//   #000   bold      — keywords, functions, types, numbers (strong signals)
//   #1a1a1a normal   — identifiers / variables (body ink)
//   #4a4a4a normal   — strings, regexes (readable but clearly quoted)
//   #6a6a6a italic   — parameters (softly de-emphasized)
//   #8a8a8a italic   — comments (most muted, still readable)
//   #808080          — punctuation and operators (structural, not semantic)
export const shikiTheme: ThemeRegistrationRaw = {
  name: "rv-paper",
  type: "light",
  colors: {
    "editor.background": "#f5f4f0",
    "editor.foreground": "#1a1a1a",
  },
  settings: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#8a8a8a", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.control", "keyword.operator.new"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["string", "string.quoted", "meta.string"], settings: { foreground: "#4a4a4a" } },
    { scope: ["string.regexp", "constant.character.escape"], settings: { foreground: "#4a4a4a" } },
    { scope: ["constant.numeric", "constant.language", "constant.language.boolean", "constant.language.null"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["entity.name.class", "entity.name.type", "support.class", "support.type"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["variable", "variable.other", "meta.definition.variable"], settings: { foreground: "#1a1a1a" } },
    { scope: ["variable.parameter"], settings: { foreground: "#6a6a6a", fontStyle: "italic" } },
    { scope: ["entity.other.attribute-name", "entity.name.tag"], settings: { foreground: "#2a2a2a" } },
    { scope: ["keyword.operator", "punctuation", "meta.brace", "punctuation.separator"], settings: { foreground: "#808080" } },
    { scope: ["markup.bold"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["markup.italic"], settings: { foreground: "#1a1a1a", fontStyle: "italic" } },
    { scope: ["markup.heading"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["invalid"], settings: { foreground: "#000000", fontStyle: "underline" } },
  ],
};
