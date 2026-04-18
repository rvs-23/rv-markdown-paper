import { chromium } from "playwright";
import type { Margins } from "../config/options.js";

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
};

const EMPTY_TEMPLATE = "<div></div>";

export async function renderHtmlToPdf(options: RenderPdfOptions): Promise<void> {
  const { html, outputPath, pageSize, margins, showHeader, showFooter, metadata = {} } = options;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    // Make sure webfonts are fully loaded before rendering, otherwise Chromium
    // prints with fallback faces and the type system looks wrong.
    await page.evaluate("document.fonts.ready");
    await page.pdf({
      path: outputPath,
      format: pageSize,
      printBackground: true,
      margin: margins,
      displayHeaderFooter: showHeader || showFooter,
      headerTemplate: showHeader ? buildHeader(metadata, margins) : EMPTY_TEMPLATE,
      footerTemplate: showFooter ? buildFooter(margins) : EMPTY_TEMPLATE,
    });
  } finally {
    await browser.close();
  }
}

function buildHeader(metadata: PdfMetadata, margins: Margins): string {
  const left = metadata.title ? escapeHtml(metadata.title) : "";
  const right = metadata.author
    ? escapeHtml(metadata.author)
    : metadata.date
      ? escapeHtml(metadata.date)
      : "";
  return `
    <div style="width: 100%; padding-left: ${margins.left}; padding-right: ${margins.right}; box-sizing: border-box; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 8pt; color: #666; letter-spacing: 0.1em; text-transform: uppercase; display: flex; justify-content: space-between;">
      <span>${left}</span>
      <span>${right}</span>
    </div>
  `;
}

function buildFooter(margins: Margins): string {
  return `
    <div style="width: 100%; padding-left: ${margins.left}; padding-right: ${margins.right}; box-sizing: border-box; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 8pt; color: #666; text-align: center; letter-spacing: 0.06em;">
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
