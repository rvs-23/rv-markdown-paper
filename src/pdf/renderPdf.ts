import { chromium } from "playwright";

export type RenderPdfOptions = {
  html: string;
  outputPath: string;
  pageSize?: "Letter" | "A4";
};

export async function renderHtmlToPdf(options: RenderPdfOptions): Promise<void> {
  const { html, outputPath, pageSize = "Letter" } = options;

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.pdf({
      path: outputPath,
      format: pageSize,
      printBackground: true,
      margin: { top: "0.8in", right: "0.85in", bottom: "0.8in", left: "0.85in" },
    });
  } finally {
    await browser.close();
  }
}
