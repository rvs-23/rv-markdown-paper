import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { extractFrontmatter } from "../src/parser/frontmatter.js";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import { generateTypst } from "../src/typst/generate.js";

// Snapshot of the canonical fixture's generated Typst body. The render
// integration test sees pagination and extracted text; this sees the
// exact template calls the generator emits — list markers, directive
// arguments, label placement, endnote collection — and catches
// generator-level regressions without rasterizing anything.
//
// On an intentional change to the generated shape, refresh with:
//   npx vitest run tests/generate.fixture.test.ts -u
const FIXTURE = resolve(__dirname, "..", "examples/editorial-swiss/paper.md");

describe("generated Typst for the editorial-swiss fixture", () => {
  it("matches the committed snapshot", async () => {
    const raw = await readFile(FIXTURE, "utf8");
    const { content, frontmatter } = extractFrontmatter(raw);
    const footnoteMode =
      (frontmatter as { footnotes?: string }).footnotes === "endnotes"
        ? ("endnotes" as const)
        : ("page" as const);
    const tree = parseMarkdownToMdast(content);
    const out = generateTypst(tree, {
      sourceDir: dirname(FIXTURE),
      footnoteMode,
    });
    await expect(out).toMatchFileSnapshot("__snapshots__/editorial-swiss.typ");
  });
});
