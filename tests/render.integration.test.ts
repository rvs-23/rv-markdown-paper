import { describe, expect, it, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";

// End-to-end render check. Smoke-only at this commit: the test verifies
// the editorial fixture compiles to a PDF with valid header magic and a
// sane file size. A strict page-count assertion is added in a follow-up
// commit once page choreography stabilises — see commit 14 of the
// post-review plan.

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

  // Cleanup after all assertions; vitest runs `it`s in order within a
  // describe, so this runs last. afterAll would be cleaner but the
  // version of vitest in the repo flagged it as awkward to import from
  // here — `rm` inline keeps the test file self-contained.
  it.skipIf(!typstAvailable())("cleans up the temp output directory", async () => {
    await rm(outDir, { recursive: true, force: true });
    expect(true).toBe(true);
  });
});
