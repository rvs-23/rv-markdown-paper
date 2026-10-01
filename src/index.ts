// Public library entry. Consumers `npm install rv-markdown-paper` and
// import { convertMarkdownToPdf } from "rv-markdown-paper". The CLI
// (`mdpdf`) at src/cli/index.ts is the other public surface.

export { convertMarkdownToPdf } from "./core/convert.js";
export type { ConvertOptions } from "./core/convert.js";
// Thrown for an invalid option or attribute, so callers can tell a bad
// document from a failed compile with `err instanceof ConfigError`.
export { ConfigError } from "./config/validate.js";
export type {
  DocumentOptions,
  DocumentOptionsLayer,
  Cover,
  MetaPair,
  TocEntry,
  Margins,
} from "./config/options.js";
