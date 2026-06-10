import { describe, expect, it, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";

// End-to-end render check for the canonical editorial fixture. The
// pipeline must produce a 6-page PDF that visually corresponds to
// `examples/editorial-swiss/target.pdf`. We assert:
//
//   - PDF magic header + sane file size (smoke)
//   - exact page count of 6 (page-choreography contract)
//   - per-page text invariants — strings the design REQUIRES on each
//     page, derived from target.pdf via pdftotext. This catches
//     regressions that page count alone can't see: missing cover
//     fields, wrong header range, sections landing on the wrong page,
//     dropped components.
//
// `pdftotext` is used to extract per-page text. Where it isn't
// available, the per-page assertions skip (CI installs poppler).

const FIXTURE = resolve(__dirname, "..", "examples/editorial-swiss/paper.md");

function typstAvailable(): boolean {
  const r = spawnSync("typst", ["--version"], { stdio: "ignore" });
  return r.status === 0;
}

function pdftotextAvailable(): boolean {
  const r = spawnSync("pdftotext", ["-v"], { stdio: "ignore" });
  return r.status === 0 || r.status === 99; // pdftotext -v returns 99 historically
}

function pageText(pdfPath: string, page: number): string {
  const r = spawnSync(
    "pdftotext",
    ["-layout", "-f", String(page), "-l", String(page), pdfPath, "-"],
    { encoding: "utf8" },
  );
  if (r.status !== 0) {
    throw new Error(`pdftotext failed for page ${page}: ${r.stderr}`);
  }
  return r.stdout;
}

// Per-page invariants derived from target.pdf. Each entry asserts that
// the listed substrings appear somewhere on that page. Strings are
// chosen to be unique enough that drift surfaces clearly — `THREADS &
// THE GIL` on p.3 is the §7.1 section eyebrow, `Fig. 7.1` on p.5 is the
// figure caption, etc.
const PAGE_INVARIANTS: Record<number, string[]> = {
  1: [
    "PYTHON IN PRACTICE",
    "EDITION 2",
    "VOLUME I",
    "Thread pools",
    "IN THIS CHAPTER",
    "086",
    "Ch. 07",
    "pp. 085",
  ],
  2: [
    "INTRODUCTION",
    "What you will learn",
    "Pool",
    "Future",
    "Executor",
    "GIL",
    "A note on scope",
  ],
  3: [
    "7. 1 – 7. 2",
    "THREADS & THE GIL",
    "Why a pool",
    "7.1.1",
    "Three reasons to pool",
    "Backpressure for free",
  ],
  4: [
    "SUBMITTING & COLLECTING WORK",
    "minimal executor",
    "fetch_all.py",
    "NOTE",
    "DANGER",
  ],
  5: [
    "SIZING THE POOL",
    "How many workers",
    "Fig. 7.1",
    "Little",
    "(7.1)",
  ],
  6: [
    "7. 5 – 7. 6",
    "EXERCISES",
    "Warm-up",
    "FURTHER READING",
    "ROB PIKE",
    // Endnote 2 comes from a defined-but-unreferenced footnote — its
    // presence pins the orphan-definition path in endnotes mode.
    "timeout=",
  ],
};

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

  // Per-page text invariants. Each page must contain the strings listed
  // in PAGE_INVARIANTS — chosen to catch regressions in cover fields,
  // header range, choreography, and component rendering. Skipped when
  // pdftotext (poppler) isn't installed.
  //
  // Whitespace is collapsed in both sides before comparison so
  // letter-spaced headings (`T H R E A D S` from tracking) match
  // their underlying string (`THREADS`). Match loses word-boundary
  // semantics, which is fine for an invariant check.
  const stripWs = (s: string) => s.replace(/\s+/g, "");
  for (const [pageStr, needles] of Object.entries(PAGE_INVARIANTS)) {
    const page = Number(pageStr);
    it.skipIf(!typstAvailable() || !pdftotextAvailable())(
      `page ${page} contains required content`,
      () => {
        const text = stripWs(pageText(outPath, page));
        for (const needle of needles) {
          expect(
            text,
            `page ${page} should contain "${needle}"`,
          ).toContain(stripWs(needle));
        }
      },
    );
  }

  // Cleanup after all assertions; vitest runs `it`s in order within a
  // describe, so this runs last. afterAll would be cleaner but the
  // version of vitest in the repo flagged it as awkward to import from
  // here — `rm` inline keeps the test file self-contained.
  it.skipIf(!typstAvailable())("cleans up the temp output directory", async () => {
    await rm(outDir, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
