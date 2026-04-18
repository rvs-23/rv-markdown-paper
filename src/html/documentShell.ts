import type { Theme } from "../config/options.js";
import { GOOGLE_FONTS_HREF, STYLESHEET } from "../themes/styles.js";

export type DocumentShellOptions = {
  title?: string;
  baseUrl?: string;
  theme: Theme;
};

export function wrapInDocumentShell(htmlBody: string, options: DocumentShellOptions): string {
  const { title = "Document", baseUrl, theme } = options;
  const baseTag = baseUrl ? `    <base href="${escapeAttribute(baseUrl)}" />\n` : "";
  const themeAttrs = [
    `data-paper-tone="${theme.paperTone}"`,
    `data-accent="${theme.accent}"`,
    `data-body-font="${theme.bodyFont}"`,
    `data-heading-font="${theme.headingFont}"`,
    `data-density="${theme.density}"`,
  ].join(" ");

  return `<!doctype html>
<html lang="en" ${themeAttrs}>
  <head>
    <meta charset="utf-8" />
${baseTag}    <title>${escapeAttribute(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href="${GOOGLE_FONTS_HREF}" />
    <style>${STYLESHEET}</style>
  </head>
  <body>
    <main class="document">
${htmlBody}
    </main>
  </body>
</html>`;
}

function escapeAttribute(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
