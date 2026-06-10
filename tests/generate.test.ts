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

  it("collects endnotes in reference order with deduped numbering", () => {
    const md = `First[^b] then[^a] and again[^b].

[^a]: Body of a.

[^b]: Body of b.
`;
    const tree = parseMarkdownToMdast(md);
    const out = generateTypst(tree, {
      sourceDir: "/tmp/mdpdf-tests",
      footnoteMode: "endnotes",
    });

    // [^b] is referenced first → endnote 1; the repeat reuses 1.
    expect(out).toContain("First#endnote-ref(1)");
    expect(out).toContain("then#endnote-ref(2)");
    expect(out).toContain("again#endnote-ref(1)");
    expect(out).toContain("#endnotes(([Body of b.], [Body of a.]))");
    expect(out).not.toContain("#footnote[");
  });

  it("appends defined-but-unreferenced footnotes to the endnotes block", () => {
    // Regression: an orphan definition (defined, never referenced) was
    // silently dropped — the canonical fixture's [^as-completed-timeout]
    // is exactly this shape and target.pdf lists it in NOTES.
    const md = `Only one reference[^used].

[^used]: Referenced body.

[^orphan]: Orphan body.
`;
    const tree = parseMarkdownToMdast(md);
    const out = generateTypst(tree, {
      sourceDir: "/tmp/mdpdf-tests",
      footnoteMode: "endnotes",
    });

    expect(out).toContain("#endnotes(([Referenced body.], [Orphan body.]))");
  });

  it("keeps page mode on native footnotes and drops orphans there", () => {
    const md = `Only one reference[^used].

[^used]: Referenced body.

[^orphan]: Orphan body.
`;
    const tree = parseMarkdownToMdast(md);
    const out = generateTypst(tree, {
      sourceDir: "/tmp/mdpdf-tests",
      footnoteMode: "page",
    });

    expect(out).toContain("#footnote[Referenced body.]");
    expect(out).not.toContain("Orphan body.");
    expect(out).not.toContain("#endnotes(");
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
