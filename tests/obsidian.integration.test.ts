import { describe, expect, it } from "vitest";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";
import { hasTools, pdfText } from "./helpers.js";

// A note written the Obsidian way should render with none of its syntax
// showing, and an embedded image should be found the way Obsidian finds
// it: by name, in a folder below the note.

const FIGURE = resolve(__dirname, "../examples/editorial-swiss/figures/pool-queue.svg");

const NOTE = `---
tags: [demo]
---
# Meeting notes

See [[Projects/scheduler|the scheduler]] and [[Design Notes#Projects]].

> [!tip] Remember
> Callouts look like **this**.

Some ==marked text== here. %%A hidden comment.%% ^para-1

![[diagram.svg|400]]
`;

async function inVault(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "mdpdf-obsidian-"));
  try {
    await writeFile(join(dir, "note.md"), NOTE, "utf8");
    await run(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const render = (dir: string) =>
  convertMarkdownToPdf({ inputPath: join(dir, "note.md"), outputPath: join(dir, "note.pdf") });

describe.skipIf(!hasTools)("Obsidian notes", () => {
  it("render without their syntax, finding an embed in a subfolder", async () => {
    await inVault(async (dir) => {
      await mkdir(join(dir, "attachments"));
      await copyFile(FIGURE, join(dir, "attachments/diagram.svg"));
      await render(dir);
      const text = pdfText(join(dir, "note.pdf")).replace(/\s+/g, " ");
      expect(text).toContain("See the scheduler and Design Notes › Projects.");
      expect(text).toContain("TIP Remember Callouts look like this.");
      expect(text).toContain("Some marked text here.");
      // The figure's own labels prove the embed rendered.
      expect(text).toContain("submitters");
      for (const syntax of ["[[", "[!tip]", "==", "%%", "^para-1", "hidden comment"]) {
        expect(text, syntax).not.toContain(syntax);
      }
    });
  });

  it("say where an embedded image must live when it isn't found", async () => {
    await inVault(async (dir) => {
      await expect(render(dir)).rejects.toThrow(
        /Embedded image not found: !\[\[diagram\.svg\]\]\nIt must be in the note's folder or a folder below it/,
      );
    });
  });
});
