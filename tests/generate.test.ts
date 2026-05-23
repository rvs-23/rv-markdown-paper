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

  it("emits a weak pagebreak before a heading carrying {.pagebreak}", () => {
    // Opt-in section-break: any heading annotated with `pagebreak`
    // emits `#pagebreak(weak: true)` ahead of its marker. The editorial
    // fixture uses this on `## 7.5 · Exercises {.pagebreak}` to match
    // the mockup's six-page layout.
    const md = `## Intro

Body of intro section.

## Next Section {.pagebreak}

Body of the next section.
`;
    const tree = parseMarkdownToMdast(md);
    const out = generateTypst(tree, { sourceDir: "/tmp/mdpdf-tests" });
    const lines = out.split("\n");
    const breakIdx = lines.findIndex((l) => l.includes("#pagebreak"));
    const nextHeadingIdx = lines.findIndex(
      (l, i) => i > breakIdx && /^==\s+Next Section/.test(l),
    );
    expect(breakIdx).toBeGreaterThanOrEqual(0);
    expect(nextHeadingIdx).toBe(breakIdx + 1);
  });
});
