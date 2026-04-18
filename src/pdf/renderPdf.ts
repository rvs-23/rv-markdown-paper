import { chromium } from "playwright";
import type { Margins, Theme } from "../config/options.js";
import { ACCENT_HEX } from "../themes/shikiTheme.js";

export type PdfMetadata = {
  title?: string;
  author?: string;
  date?: string;
};

export type RenderPdfOptions = {
  html: string;
  outputPath: string;
  pageSize: "Letter" | "A4";
  margins: Margins;
  showHeader: boolean;
  showFooter: boolean;
  metadata?: PdfMetadata;
  theme: Theme;
};

const EMPTY_TEMPLATE = "<div></div>";

export async function renderHtmlToPdf(options: RenderPdfOptions): Promise<void> {
  const { html, outputPath, pageSize, margins, showHeader, showFooter, metadata = {}, theme } = options;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: outputPath,
      format: pageSize,
      printBackground: true,
      margin: margins,
      displayHeaderFooter: showHeader || showFooter,
      headerTemplate: showHeader ? buildHeader(metadata, theme, margins) : EMPTY_TEMPLATE,
      footerTemplate: showFooter ? buildFooter(theme, margins) : EMPTY_TEMPLATE,
    });
  } finally {
    await browser.close();
  }
}

function buildHeader(metadata: PdfMetadata, theme: Theme, margins: Margins): string {
  const left = metadata.title ? escapeHtml(metadata.title) : "";
  const right = metadata.author
    ? escapeHtml(metadata.author)
    : metadata.date
      ? escapeHtml(metadata.date)
      : "";
  const accent = ACCENT_HEX[theme.accent];
  return `
    <div style="width: 100%; padding: 0 ${margins.left} 0 ${margins.left}; padding-right: ${margins.right}; box-sizing: border-box; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 8pt; color: ${accent}; letter-spacing: 0.12em; text-transform: uppercase; display: flex; justify-content: space-between; font-weight: 500;">
      <span>${left}</span>
      <span>${right}</span>
    </div>
  `;
}

function buildFooter(theme: Theme, margins: Margins): string {
  const accent = ACCENT_HEX[theme.accent];
  return `
    <div style="width: 100%; padding: 0 ${margins.left}; padding-right: ${margins.right}; box-sizing: border-box; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 8pt; color: ${accent}; text-align: center; letter-spacing: 0.08em; font-weight: 500;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
