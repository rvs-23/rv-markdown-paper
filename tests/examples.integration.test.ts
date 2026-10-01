import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";
import { hasTools, pdfText } from "./helpers.js";

// Every committed example, rendered fresh: no page may be nearly empty.
// A heading stranded above a block that jumped to the next page leaves a
// page with little more than the running header and footer (~50
// characters) and the heading, well under the threshold; the sparsest
// legitimate page today has several hundred. The cover and the last page
// are exempt, since they can be short by design.

const ROOT = resolve(__dirname, "..");
const MIN_CHARS = 150;

async function examples(): Promise<string[]> {
  const demos = (await readdir(join(ROOT, "examples/demos")))
    .filter((f) => f.endsWith(".md"))
    .map((f) => join(ROOT, "examples/demos", f));
  return [
    ...demos,
    join(ROOT, "examples/editorial-swiss/paper.md"),
    join(ROOT, "examples/kannada-notes/notes.md"),
  ];
}

function pageTexts(pdf: string): string[] {
  return pdfText(pdf).split("\f").slice(0, -1);
}

describe.skipIf(!hasTools)("committed examples", () => {
  it("have no nearly empty pages", async () => {
    const out = await mkdtemp(join(tmpdir(), "mdpdf-examples-"));
    try {
      const sparse: string[] = [];
      for (const md of await examples()) {
        const pdf = join(out, `${basename(md, ".md")}.pdf`);
        await convertMarkdownToPdf({ inputPath: md, outputPath: pdf });
        const hasCover = /^cover:/m.test(await readFile(md, "utf8"));
        const pages = pageTexts(pdf);
        pages.forEach((text, i) => {
          const isLast = i === pages.length - 1;
          const isCover = hasCover && i === 0;
          const chars = text.replace(/\s/g, "").length;
          if (!isLast && !isCover && chars < MIN_CHARS) {
            sparse.push(`${basename(md)} page ${i + 1}: ${chars} characters`);
          }
        });
      }
      expect(sparse).toEqual([]);
    } finally {
      await rm(out, { recursive: true, force: true });
    }
  });
});
