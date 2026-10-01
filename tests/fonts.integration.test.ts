import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";
import { hasTypst } from "./helpers.js";

// Typst renders a character no font covers as nothing and exits 0, so
// these check the converter refuses such documents before Typst runs,
// and still renders the scripts the bundled fonts do cover.

// Renders a document and reports the error (if any) and whether a PDF
// was written, so a rejection can be checked to leave no output behind.
async function render(markdown: string): Promise<{ error?: Error; written: boolean }> {
  const dir = await mkdtemp(join(tmpdir(), "mdpdf-fonts-"));
  try {
    const input = join(dir, "doc.md");
    const output = join(dir, "doc.pdf");
    await writeFile(input, markdown, "utf8");
    let error: Error | undefined;
    try {
      await convertMarkdownToPdf({ inputPath: input, outputPath: output });
    } catch (e) {
      error = e as Error;
    }
    return { error, written: existsSync(output) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!hasTypst)("font coverage", () => {
  it("rejects CJK, naming the character and its source line, without writing a PDF", async () => {
    const md = '---\ntitle: "Greeting"\n---\n\nIntro.\n\nSay 你好 today.\n';
    const { error, written } = await render(md);
    expect(error?.message).toMatch(/你 +U\+4F60 +line 7/);
    expect(written).toBe(false);
  });

  it("rejects Arabic in the frontmatter", async () => {
    const { error } = await render('---\ntitle: "مرحبا"\n---\n\nBody.\n');
    expect(error?.message).toMatch(/U\+0645 +frontmatter \(title\)/);
  });

  it("renders Latin, Greek, Devanagari, Kannada and emoji", async () => {
    const { error, written } = await render("Hello λ नमस्ते ಕನ್ನಡ ✅ and <!-- 你 --> in an HTML comment.\n");
    expect(error).toBeUndefined();
    expect(written).toBe(true);
  });

  it("renders the Kannada notes", async () => {
    const out = await mkdtemp(join(tmpdir(), "mdpdf-fonts-notes-"));
    try {
      const output = join(out, "notes.pdf");
      await convertMarkdownToPdf({
        inputPath: join(import.meta.dirname, "..", "examples", "kannada-notes", "notes.md"),
        outputPath: output,
      });
      expect(existsSync(output)).toBe(true);
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });
});
