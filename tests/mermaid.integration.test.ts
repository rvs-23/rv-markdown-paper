import { describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";
import { hasTools, pdfText } from "./helpers.js";

// mermaid-cli is optional, so these run only where `mmdc` is installed.
const hasMmdc = spawnSync("mmdc", ["--version"], { stdio: "ignore" }).status === 0;

async function render(markdown: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mdpdf-mermaid-test-"));
  try {
    await writeFile(join(dir, "doc.md"), markdown, "utf8");
    await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf") });
    return pdfText(join(dir, "doc.pdf")).replace(/\s+/g, " ");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!hasTools || !hasMmdc)("Mermaid with mermaid-cli", () => {
  it("draws a diagram, with its labels as text", async () => {
    const text = await render('```mermaid\nflowchart LR\n  a["Markdown"] --> b["Diagram"]\n```\n');
    expect(text).toContain("Markdown");
    expect(text).toContain("Diagram");
    // Drawn, not printed: the source's arrow is gone.
    expect(text).not.toContain("-->");
  });

  it("fails with Mermaid's message on a broken diagram", async () => {
    await expect(render("```mermaid\nflowchart LR\n  a -->\n```\n")).rejects.toThrow(
      "A Mermaid diagram failed to draw",
    );
  });
});

describe.skipIf(!hasTools || hasMmdc)("Mermaid without mermaid-cli", () => {
  it("prints the diagram as code and says how to draw it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const text = await render("```mermaid\nflowchart LR\n  a --> b\n```\n");
      expect(text).toContain("a --> b");
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("brew install mermaid-cli"));
    } finally {
      warn.mockRestore();
    }
  });
});
