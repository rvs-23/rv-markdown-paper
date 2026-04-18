import type { ThemeRegistrationRaw } from "shiki";

export const grayscaleShikiTheme: ThemeRegistrationRaw = {
  name: "grayscale",
  type: "light",
  colors: {
    "editor.background": "#f2f2f2",
    "editor.foreground": "#111111",
  },
  settings: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#888888", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.control", "keyword.operator.new"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["string", "string.quoted", "meta.string"], settings: { foreground: "#444444" } },
    { scope: ["constant.numeric", "constant.language", "constant.language.boolean", "constant.language.null"], settings: { foreground: "#333333" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#000000" } },
    { scope: ["entity.name.class", "entity.name.type", "support.class", "support.type"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["variable", "variable.other", "meta.definition.variable"], settings: { foreground: "#111111" } },
    { scope: ["variable.parameter"], settings: { foreground: "#222222", fontStyle: "italic" } },
    { scope: ["entity.other.attribute-name", "entity.name.tag"], settings: { foreground: "#333333" } },
    { scope: ["keyword.operator", "punctuation", "meta.brace", "punctuation.separator"], settings: { foreground: "#666666" } },
    { scope: ["string.regexp", "constant.character.escape"], settings: { foreground: "#555555" } },
    { scope: ["markup.bold"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["markup.italic"], settings: { foreground: "#111111", fontStyle: "italic" } },
    { scope: ["markup.heading"], settings: { foreground: "#000000", fontStyle: "bold" } },
    { scope: ["invalid"], settings: { foreground: "#000000", fontStyle: "underline" } },
  ],
};
