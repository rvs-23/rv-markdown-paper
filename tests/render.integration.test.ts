import { describe, expect, it, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";

// End-to-end render check for the canonical editorial fixture: the
// pipeline must produce a 6-page PDF that visually corresponds to
// `examples/editorial-swiss/mockup.pdf`. Page-count is the strictest
// assertion we can make without a pixel-level harness; if the cover,
// opener-page isolation, or the §7.5 `.pagebreak` annotation regresses,
// the count will drift and this test will fail with a useful diff.

const FIXTURE = resolve(__dirname, "..", "examples/editorial-swiss/paper.md");

function typstAvailable(): boolean {
  const r = spawnSync("typst", ["--version"], { stdio: "ignore" });
  return r.status === 0;
}

describe("render integration: editorial-swiss fixture", () => {
  let outDir: string;
  let outPath: string;
  let pdfBuffer: Buffer;

  beforeAll(async () => {
    if (!typstAvailable()) return;
    outDir = await mkdtemp(join(tmpdir(), "mdpdf-integration-"));
    outPath = join(outDir, "output.pdf");
    await convertMarkdownToPdf({ inputPath: FIXTURE, outputPath: outPath });
    pdfBuffer = await readFile(outPath);
  }, 60_000);

  it.skipIf(!typstAvailable())(
    "produces a PDF starting with the %PDF- magic header",
    () => {
      expect(pdfBuffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    },
  );

  it.skipIf(!typstAvailable())("produces a PDF of sane size (≥50 KB)", async () => {
    const s = await stat(outPath);
    expect(s.size).toBeGreaterThanOrEqual(50_000);
  });

  it.skipIf(!typstAvailable())("renders the fixture as exactly 6 pages", () => {
    // The PDF stores the page count in the root `/Type /Pages /Count N`
    // entry. The first `/Count` in the file is the document-wide one;
    // later `/Count` entries belong to outline / annotation trees, so we
    // scan top-down and return the first hit.
    const text = pdfBuffer.toString("latin1");
    const match = text.match(/\/Type\s*\/Pages[^]*?\/Count\s+(\d+)/);
    expect(match, "could not locate /Pages /Count in the PDF").not.toBeNull();
    const pageCount = Number(match![1]);
    expect(pageCount).toBe(6);
  });

  // Cleanup after all assertions; vitest runs `it`s in order within a
  // describe, so this runs last. afterAll would be cleaner but the
  // version of vitest in the repo flagged it as awkward to import from
  // here — `rm` inline keeps the test file self-contained.
  it.skipIf(!typstAvailable())("cleans up the temp output directory", async () => {
    await rm(outDir, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
