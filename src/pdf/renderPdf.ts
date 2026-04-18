import { chromium } from "playwright";

export type PdfMetadata = {
  title?: string;
  author?: string;
  date?: string;
};

export type RenderPdfOptions = {
  html: string;
  outputPath: string;
  pageSize?: "Letter" | "A4";
  metadata?: PdfMetadata;
};

export async function renderHtmlToPdf(options: RenderPdfOptions): Promise<void> {
  const { html, outputPath, pageSize = "Letter", metadata = {} } = options;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: outputPath,
      format: pageSize,
      printBackground: true,
      margin: { top: "1.05in", right: "0.85in", bottom: "0.95in", left: "0.85in" },
      displayHeaderFooter: true,
      headerTemplate: buildHeader(metadata),
      footerTemplate: buildFooter(),
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
