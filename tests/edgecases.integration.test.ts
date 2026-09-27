import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";
import type { DocumentOptionsLayer } from "../src/config/options.js";

// Markdown the canonical fixture doesn't exercise. Each case renders a
// small document end-to-end and asserts on the extracted PDF text, so a
// case fails both when Typst refuses to compile and when it compiles but
// renders the wrong thing.

const hasTools =
  spawnSync("typst", ["--version"], { stdio: "ignore" }).status === 0 &&
  [0, 99].includes(spawnSync("pdftotext", ["-v"], { stdio: "ignore" }).status ?? -1);

async function render(
  markdown: string,
  cli: DocumentOptionsLayer = {},
  layout = false,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mdpdf-edge-"));
  try {
    const input = join(dir, "doc.md");
    const output = join(dir, "doc.pdf");
    await writeFile(input, markdown, "utf8");
    await convertMarkdownToPdf({ inputPath: input, outputPath: output, cli });
    const args = layout ? ["-layout", output, "-"] : [output, "-"];
    const r = spawnSync("pdftotext", args, { encoding: "utf8" });
    // Collapse whitespace so assertions don't depend on line wrapping,
    // unless the case needs to see indentation.
    return layout ? r.stdout : r.stdout.replace(/\s+/g, " ");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!hasTools)("edge-case rendering", () => {
  it("keeps an escaped `1.` at paragraph start as text, not a list", async () => {
    const text = await render("Intro.\n\n1\\. not a list\n", {}, true);
    // A Typst enum would indent the line relative to the paragraph above.
    const indentOf = (needle: string) =>
      text.split("\n").find((l) => l.includes(needle))!.search(/\S/);
    expect(indentOf("not a list")).toBe(indentOf("Intro."));
  });

  it("renders `//` inside cover subtitle text", async () => {
    const text = await render(
      '---\ncover:\n  title: "Hello"\n  subtitle: "either a // b or c"\n---\nBody.\n',
    );
    expect(text).toContain("either a // b or c");
  });
});
