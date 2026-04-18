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
    await page.pdf({
      path: outputPath,
      format: pageSize,
      printBackground: true,
      margin: margins,
      displayHeaderFooter: showHeader || showFooter,
      headerTemplate: showHeader ? buildHeader(metadata) : EMPTY_TEMPLATE,
      footerTemplate: showFooter ? buildFooter() : EMPTY_TEMPLATE,
    });
  } finally {
    await browser.close();
  }
}

function buildHeader(metadata: PdfMetadata): string {
  const left = metadata.title ? escapeHtml(metadata.title) : "";
  const right = metadata.author
    ? escapeHtml(metadata.author)
    : metadata.date
      ? escapeHtml(metadata.date)
      : "";
  return `
    <div style="width: 100%; padding: 0 0.85in; box-sizing: border-box; font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace; font-size: 8pt; color: #888; letter-spacing: 0.08em; text-transform: uppercase; display: flex; justify-content: space-between;">
      <span>${left}</span>
      <span>${right}</span>
    </div>
  `;
}

function buildFooter(): string {
  return `
    <div style="width: 100%; font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace; font-size: 8pt; color: #888; text-align: center; letter-spacing: 0.05em;">
      [ <span class="pageNumber"></span> / <span class="totalPages"></span> ]
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
