import type { ThemeRegistrationRaw } from "shiki";

// Grayscale code panel: dark background, ink-black and white tonal range,
// italic comments, bold keywords. No color, no accent — distinguishable
// tokens come from weight and italics alone.
export const shikiTheme: ThemeRegistrationRaw = {
  name: "rv-mono",
  type: "dark",
  colors: {
    "editor.background": "#111113",
    "editor.foreground": "#e8e8e8",
  },
  settings: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#7a7a7a", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.control", "keyword.operator.new"], settings: { foreground: "#ffffff", fontStyle: "bold" } },
    { scope: ["string", "string.quoted", "meta.string"], settings: { foreground: "#c8c8c8" } },
    { scope: ["string.regexp", "constant.character.escape"], settings: { foreground: "#c8c8c8" } },
    { scope: ["constant.numeric", "constant.language", "constant.language.boolean", "constant.language.null"], settings: { foreground: "#d8d8d8" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#ffffff" } },
    { scope: ["entity.name.class", "entity.name.type", "support.class", "support.type"], settings: { foreground: "#ffffff", fontStyle: "bold" } },
    { scope: ["variable", "variable.other", "meta.definition.variable"], settings: { foreground: "#e8e8e8" } },
    { scope: ["variable.parameter"], settings: { foreground: "#dcdcdc", fontStyle: "italic" } },
    { scope: ["entity.other.attribute-name", "entity.name.tag"], settings: { foreground: "#d0d0d0" } },
    { scope: ["keyword.operator", "punctuation", "meta.brace", "punctuation.separator"], settings: { foreground: "#909090" } },
    { scope: ["markup.bold"], settings: { foreground: "#ffffff", fontStyle: "bold" } },
    { scope: ["markup.italic"], settings: { foreground: "#e8e8e8", fontStyle: "italic" } },
    { scope: ["markup.heading"], settings: { foreground: "#ffffff", fontStyle: "bold" } },
    { scope: ["invalid"], settings: { foreground: "#ffffff", fontStyle: "underline" } },
  ],
};
