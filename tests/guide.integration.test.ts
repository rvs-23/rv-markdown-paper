import { describe, expect, it } from "vitest";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";
import { hasTools, pdfText } from "./helpers.js";

// docs/markdown-guide.md is handed to people and agents as the syntax
// reference, so every ```markdown example in it must actually render,
// and render as the feature it documents.
// Frontmatter examples render as their own documents; the rest are
// joined into one body.

const ROOT = resolve(__dirname, "..");
function markdownExamples(guide: string): string[] {
  // Outer fence of 3+ backticks tagged `markdown`, closed by the same run.
  return [...guide.matchAll(/^(`{3,})markdown\n([\s\S]*?)^\1$/gm)].map((m) => m[2]!);
}

function squash(text: string): string {
  return text.toLowerCase().replace(/\s+/g, "");
}

async function renderIn(dir: string, name: string, markdown: string): Promise<void> {
  await writeFile(join(dir, `${name}.md`), markdown, "utf8");
  await convertMarkdownToPdf({ inputPath: join(dir, `${name}.md`), outputPath: join(dir, `${name}.pdf`) });
}

describe.skipIf(!hasTools)("markdown guide examples", () => {
  it("all render", async () => {
    const guide = await readFile(join(ROOT, "docs/markdown-guide.md"), "utf8");
    const examples = markdownExamples(guide);
    expect(examples.length).toBeGreaterThan(15);

    const dir = await mkdtemp(join(tmpdir(), "mdpdf-guide-"));
    try {
      await mkdir(join(dir, "figures"));
      await copyFile(
        join(ROOT, "examples/editorial-swiss/figures/pool-queue.svg"),
        join(dir, "figures/pool-queue.svg"),
      );
      const frontmatter = examples.filter((e) => e.startsWith("---\n") && e.trim() !== "---");
      const body = examples.filter((e) => !frontmatter.includes(e));
      for (const [i, fm] of frontmatter.entries()) {
        await renderIn(dir, `frontmatter-${i}`, `${fm}\n# Title\n\nBody.\n`);
      }
      await renderIn(dir, "body", `Intro paragraph.\n\n${body.join("\n\n")}`);

      // Rendering without error isn't enough: a feature that silently
      // degraded to plain text would still compile. Each marker below
      // only appears when its feature went through the real component.
      // Compared case- and space-insensitively, since tracked labels
      // extract as "S TA C K" and eyebrows are uppercased.
      const text = squash(pdfText(join(dir, "body.pdf")));
      const markers = [
        "ootakke",                        // intraword bold
        "5.fifthitem6.sixthitem",         // list start number
        "✓donetask",                      // task checkbox
        "—donaldknuth",                   // epigraph attribution line
        "notebackground", "tiparecommendation", "warningsomething", "dangertheone", // callout labels
        "fetch_all.py",                   // code-block header strip
        "fig.1workerspull",               // figure caption numbering
        "asfig.1shows",                   // figure cross-reference
        "by(1),",                         // equation cross-reference
        "poolscapmemory.1",               // footnote marker
        "1eachthreadreserves",            // footnote body
        "stacksize",                      // margin-note label
        "thetypstdocsandremarkboth",      // reference-style links
        "somequieterasidetextandanunderlinedphrase.", // spans, brackets gone
        "01submitandcollect", "warm-up",  // exercise box number, title, tag
        "ch.7·introduction",              // eyebrow
        "7.4·sizingthepool",              // section eyebrow with numeral
      ];
      for (const marker of markers) expect(text, marker).toContain(marker);

      const cover = squash(pdfText(join(dir, `frontmatter-${frontmatter.findIndex((f) => f.includes("cover:"))}.pdf`)));
      expect(cover).toContain("threadpools,orhowtoshare");
      expect(cover).toContain("threadpools&futures");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
