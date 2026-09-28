import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";

// MARKDOWN-GUIDE.md is handed to people and agents as the syntax
// reference, so every ```markdown example in it must actually render.
// Frontmatter examples render as their own documents; the rest are
// joined into one body.

const ROOT = resolve(__dirname, "..");
const hasTypst = spawnSync("typst", ["--version"], { stdio: "ignore" }).status === 0;

function markdownExamples(guide: string): string[] {
  // Outer fence of 3+ backticks tagged `markdown`, closed by the same run.
  return [...guide.matchAll(/^(`{3,})markdown\n([\s\S]*?)^\1$/gm)].map((m) => m[2]!);
}

async function renderIn(dir: string, name: string, markdown: string): Promise<void> {
  await writeFile(join(dir, `${name}.md`), markdown, "utf8");
  await convertMarkdownToPdf({ inputPath: join(dir, `${name}.md`), outputPath: join(dir, `${name}.pdf`) });
}

describe.skipIf(!hasTypst)("MARKDOWN-GUIDE.md examples", () => {
  it("all render", async () => {
    const guide = await readFile(join(ROOT, "MARKDOWN-GUIDE.md"), "utf8");
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
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
