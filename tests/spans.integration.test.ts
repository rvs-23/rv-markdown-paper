import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";

// Bracketed spans end to end: each case compiles a small document (so the
// emitted `c-muted` / `#underline` calls must resolve) and checks the
// extracted text shows the span content without its `[…]{…}` syntax.

const hasTools =
  spawnSync("typst", ["--version"], { stdio: "ignore" }).status === 0 &&
  [0, 99].includes(spawnSync("pdftotext", ["-v"], { stdio: "ignore" }).status ?? -1);

async function render(markdown: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mdpdf-spans-"));
  try {
    const input = join(dir, "doc.md");
    const output = join(dir, "doc.pdf");
    await writeFile(input, markdown, "utf8");
    await convertMarkdownToPdf({ inputPath: input, outputPath: output, cli: {} });
    const r = spawnSync("pdftotext", [output, "-"], { encoding: "utf8" });
    return r.stdout.replace(/\s+/g, " ");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!hasTools)("bracketed span rendering", () => {
  it("renders span text without brackets or braces", async () => {
    const text = await render(
      "A [quiet **bold** aside]{.muted}, a [ruled]{.underline} word " +
        "and [plain]{.smallcaps} text.\n",
    );
    expect(text).toContain("A quiet bold aside, a ruled word and plain text.");
    expect(text).not.toMatch(/[[\]{}]/);
  });

  it("renders a span at the end of a heading", async () => {
    const text = await render("## Heading [note]{.muted}\n\nBody.\n");
    expect(text).toMatch(/Heading note Body/i);
    expect(text).not.toMatch(/[[\]{}]/);
  });

  it("keeps escaped brackets and code literal", async () => {
    const text = await render("Literal \\[x]{.muted} and `[y]{.muted}` here.\n");
    expect(text).toContain("Literal [x]{.muted} and [y]{.muted} here.");
  });

  it("rejects a span with an id", async () => {
    await expect(render("See [this]{#here}.\n")).rejects.toThrow(
      /span ids are not supported/,
    );
  });
});
