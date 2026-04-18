import type { ThemeRegistrationRaw } from "shiki";

export const grayscaleShikiTheme: ThemeRegistrationRaw = {
  name: "grayscale-inverted",
  type: "dark",
  colors: {
    "editor.background": "#0a0a0a",
    "editor.foreground": "#e8e8e8",
  },
  settings: [
    { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: "#777777", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "keyword.control", "keyword.operator.new"], settings: { foreground: "#ffffff", fontStyle: "bold" } },
    { scope: ["string", "string.quoted", "meta.string"], settings: { foreground: "#b8b8b8" } },
    { scope: ["constant.numeric", "constant.language", "constant.language.boolean", "constant.language.null"], settings: { foreground: "#d0d0d0" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call"], settings: { foreground: "#ffffff" } },
    { scope: ["entity.name.class", "entity.name.type", "support.class", "support.type"], settings: { foreground: "#ffffff", fontStyle: "bold" } },
    { scope: ["variable", "variable.other", "meta.definition.variable"], settings: { foreground: "#e8e8e8" } },
    { scope: ["variable.parameter"], settings: { foreground: "#dddddd", fontStyle: "italic" } },
    { scope: ["entity.other.attribute-name", "entity.name.tag"], settings: { foreground: "#cccccc" } },
    { scope: ["keyword.operator", "punctuation", "meta.brace", "punctuation.separator"], settings: { foreground: "#888888" } },
    { scope: ["string.regexp", "constant.character.escape"], settings: { foreground: "#b8b8b8" } },
    { scope: ["markup.bold"], settings: { foreground: "#ffffff", fontStyle: "bold" } },
    { scope: ["markup.italic"], settings: { foreground: "#e8e8e8", fontStyle: "italic" } },
    { scope: ["markup.heading"], settings: { foreground: "#ffffff", fontStyle: "bold" } },
    { scope: ["invalid"], settings: { foreground: "#ffffff", fontStyle: "underline" } },
  ],
};
