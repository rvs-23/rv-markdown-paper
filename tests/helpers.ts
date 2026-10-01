import { spawnSync } from "node:child_process";

// External tools the render tests need. Without Typst nothing renders;
// without pdftotext (poppler) the tests can't read a PDF back.
export const hasTypst = spawnSync("typst", ["--version"], { stdio: "ignore" }).status === 0;
// `pdftotext -v` exits 99 on older poppler releases.
export const hasPdftotext = [0, 99].includes(
  spawnSync("pdftotext", ["-v"], { stdio: "ignore" }).status ?? -1,
);
export const hasTools = hasTypst && hasPdftotext;

/**
 * Extracts a PDF's text with pdftotext.
 *
 * Args:
 *   pdf: Path to the PDF.
 *   args: Extra pdftotext flags, e.g. ["-layout"], ["-bbox"] or ["-f", "2", "-l", "2"].
 *
 * Returns:
 *   The text (or bbox HTML), pages separated by form feeds.
 */
export function pdfText(pdf: string, args: string[] = []): string {
  return spawnSync("pdftotext", [...args, pdf, "-"], { encoding: "utf8" }).stdout;
}
