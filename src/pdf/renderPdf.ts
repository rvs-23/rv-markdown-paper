import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Browser } from "playwright";
import { PDFDocument } from "pdf-lib";
import type { Margins } from "../config/options.js";

export type PdfMetadata = {
  title?: string;
  section?: string;
  author?: string;
  date?: string;
};

export type RenderPdfOptions = {
  html: string;
  // Optional cover HTML. When present we render it as a separate PDF with
  // header/footer disabled and prepend it to the body PDF. This is the only
  // way to reliably suppress Playwright's running header on the first page —
  // Chromium's print engine paints the header iframe independent of any CSS
  // @page :first margin override.
  coverHtml?: string;
  outputPath: string;
  pageSize: "Letter" | "A4";
  margins: Margins;
  showHeader: boolean;
  showFooter: boolean;
  metadata?: PdfMetadata;
};

const EMPTY_TEMPLATE = "<div></div>";

export async function renderHtmlToPdf(options: RenderPdfOptions): Promise<void> {
  const { html, coverHtml, outputPath, pageSize, margins, showHeader, showFooter, metadata = {} } = options;

  const browser = await chromium.launch();
  try {
    if (coverHtml) {
      const coverPdf = await renderHtmlBytes(browser, coverHtml, {
        pageSize,
        margins,
        displayHeaderFooter: false,
        headerTemplate: EMPTY_TEMPLATE,
        footerTemplate: EMPTY_TEMPLATE,
      });
      const bodyPdf = await renderHtmlBytes(browser, html, {
        pageSize,
        margins,
        displayHeaderFooter: showHeader || showFooter,
        headerTemplate: showHeader ? buildHeader(metadata, margins) : EMPTY_TEMPLATE,
        footerTemplate: showFooter ? buildFooter(margins) : EMPTY_TEMPLATE,
      });
      const merged = await mergePdfs([coverPdf, bodyPdf]);
      await writeFile(outputPath, merged);
    } else {
      const pdf = await renderHtmlBytes(browser, html, {
        pageSize,
        margins,
        displayHeaderFooter: showHeader || showFooter,
        headerTemplate: showHeader ? buildHeader(metadata, margins) : EMPTY_TEMPLATE,
        footerTemplate: showFooter ? buildFooter(margins) : EMPTY_TEMPLATE,
      });
      await writeFile(outputPath, pdf);
    }
  } finally {
    await browser.close();
  }
}

type RenderOneOptions = {
  pageSize: "Letter" | "A4";
  margins: Margins;
  displayHeaderFooter: boolean;
  headerTemplate: string;
  footerTemplate: string;
};

async function renderHtmlBytes(
  browser: Browser,
  html: string,
  options: RenderOneOptions,
): Promise<Uint8Array> {
  // Write the HTML to a temp file and navigate to it rather than using
  // page.setContent. setContent runs the page on about:blank, whose null
  // origin blocks file:// subresource loads — so images referenced with a
  // relative path (resolved via the document's <base href>) silently fail.
  // Loading via file:// puts the document and its siblings in the same
  // origin and the images render.
  const tempDir = await mkdtemp(join(tmpdir(), "mdpdf-"));
  const tempHtml = join(tempDir, "document.html");
  await writeFile(tempHtml, html, "utf8");

  const page = await browser.newPage();
  try {
    await page.goto(pathToFileURL(tempHtml).href, { waitUntil: "networkidle" });
    // Make sure webfonts are fully loaded before rendering, otherwise Chromium
    // prints with fallback faces and the type system looks wrong.
    await page.evaluate("document.fonts.ready");
    const bytes = await page.pdf({
      format: options.pageSize,
      printBackground: true,
      margin: options.margins,
      displayHeaderFooter: options.displayHeaderFooter,
      headerTemplate: options.headerTemplate,
      footerTemplate: options.footerTemplate,
    });
    return bytes;
  } finally {
    await page.close();
    await unlink(tempHtml).catch(() => undefined);
  }
}

async function mergePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  for (const bytes of parts) {
    const src = await PDFDocument.load(bytes);
    const pages = await out.copyPages(src, src.getPageIndices());
    for (const p of pages) out.addPage(p);
  }
  return out.save();
}

function buildHeader(metadata: PdfMetadata, margins: Margins): string {
  const left = metadata.section ?? "";
  const center = metadata.title ?? "";
  const right = metadata.date ?? metadata.author ?? "";

  const cellStyle =
    "flex: 1 1 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;";
  // IBM Plex Serif uppercase echoes the title block's typeface — the running
  // header reads as a small reprise of the title, not as a separate mono
  // system voice. Letter-spacing is loose enough that small caps–like
  // legibility survives at 7.5pt.
  const wrapStyle = [
    "width: 100%",
    "box-sizing: border-box",
    `padding-left: ${margins.left}`,
    `padding-right: ${margins.right}`,
    "padding-bottom: 5pt",
    "border-bottom: 0.5pt solid #c8c8c8",
    "font-family: 'IBM Plex Serif', 'Lora', Georgia, serif",
    "font-size: 7.5pt",
    "font-weight: 600",
    "color: #5a5a5a",
    "letter-spacing: 0.14em",
    "text-transform: uppercase",
    "display: flex",
    "align-items: baseline",
  ].join("; ");

  return `
    <div style="${wrapStyle};">
      <span style="${cellStyle} text-align: left;">${escapeHtml(left)}</span>
      <span style="${cellStyle} text-align: center; padding: 0 1em;">${escapeHtml(center)}</span>
      <span style="${cellStyle} text-align: right;">${escapeHtml(right)}</span>
    </div>
  `;
}

function buildFooter(margins: Margins): string {
  const style = [
    "width: 100%",
    "box-sizing: border-box",
    `padding-left: ${margins.left}`,
    `padding-right: ${margins.right}`,
    "padding-top: 6pt",
    "text-align: center",
    "font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace",
    "font-size: 7.5pt",
    "color: #5a5a5a",
    "letter-spacing: 0.08em",
  ].join("; ");
  return `
    <div style="${style};">
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
