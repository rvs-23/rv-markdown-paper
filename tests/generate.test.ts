import { describe, expect, it } from "vitest";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import { generateTypst } from "../src/typst/generate.js";

describe("generateTypst", () => {
  it("renders footnote references inline from collected definitions", () => {
    const md = `Paragraph with note[^1].

[^1]: Footnote body.
`;
    const tree = parseMarkdownToMdast(md);
    const out = generateTypst(tree, { sourceDir: "/tmp/mdpdf-tests" });

    expect(out).toContain("#footnote[");
    expect(out).toContain("Footnote body.");
  });

  it("rejects image paths that escape source directory", () => {
    const md = `![caption](../secrets.png)`;
    const tree = parseMarkdownToMdast(md);

    expect(() =>
      generateTypst(tree, { sourceDir: "/tmp/mdpdf-tests/safe" }),
    ).toThrow(/escapes the source directory/);
  });
});
