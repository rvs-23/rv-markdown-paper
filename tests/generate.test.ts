import { describe, expect, it } from "vitest";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import { generateTypst } from "../src/typst/generate.js";

function gen(md: string, footnoteMode?: "page" | "endnotes"): string {
  const tree = parseMarkdownToMdast(md);
  return generateTypst(tree, { sourceDir: "/tmp/mdpdf-tests", footnoteMode });
}

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

describe("generateTypst: tables", () => {
  it("emits weighted fr columns per the 3-column heuristic", () => {
    const out = gen(`| A | B | C |\n| --- | --- | --- |\n| 1 | 2 | 3 |\n`);
    expect(out).toContain("columns: (2fr, 1fr, 2fr)");
    expect(out).toContain("table.header([A], [B], [C])");
  });

  it("emits the 4-column spec and honours authored alignment", () => {
    const out = gen(
      `| W | G | C | Why |\n| :-- | :-- | --: | :-- |\n| a | b | c | d |\n`,
    );
    expect(out).toContain("columns: (2.2fr, 1.6fr, 1fr, 2fr)");
    expect(out).toContain("align: (left, left, right, left)");
  });
});

describe("generateTypst: lists", () => {
  it("routes task lists through #task-list / #task-item", () => {
    const out = gen(`- [x] done thing\n- [ ] open thing\n`);
    expect(out).toContain("#task-list(");
    expect(out).toContain("task-item(true, [done thing])");
    expect(out).toContain("task-item(false, [open thing])");
    // No native bullet for task rows.
    expect(out).not.toMatch(/^- /m);
  });

  it("renders definition lists as the 60pt/1fr hairline grid", () => {
    const out = gen(`Pool\n:   A fixed-size set of workers.\n`);
    expect(out).toContain("columns: (60pt, 1fr)");
    expect(out).toContain("[Pool]");
    expect(out).toContain("[A fixed-size set of workers.]");
  });
});

describe("generateTypst: directives", () => {
  it("extracts the bold prefix of :::margin as the label", () => {
    const out = gen(`::: margin\n**Stack size.** Tunable via the API.\n:::\n`);
    expect(out).toContain('#marg(label: "Stack size", )');
    expect(out).toContain("Tunable via the API.");
    expect(out).not.toContain("*Stack size.*");
  });

  it("maps :::exbox attributes and consumes the bold-prefix title", () => {
    const out = gen(
      `::: {.exbox number="01" tag="submit / result"}\n**Warm-up.**\nBody text.\n:::\n`,
    );
    expect(out).toContain(
      '#exbox(number: "01", title: "Warm-up", tag: "submit / result", )',
    );
    expect(out).toContain("Body text.");
  });

  it("extracts the trailing em-dash paragraph of :::epigraph as cite", () => {
    const out = gen(
      `::: epigraph\nConcurrency is not parallelism.\n\n— Rob Pike (2012)\n:::\n`,
    );
    expect(out).toContain('#epigraph(cite: "Rob Pike (2012)", )');
    expect(out).not.toContain("— Rob Pike");
  });

  it("splits the dropcap letter from the body", () => {
    const out = gen(`::: dropcap\nA thread pool is a bounded crew.\n:::\n`);
    expect(out).toContain('#dropcap("A")');
    expect(out).toContain("thread pool is a bounded crew.");
  });

  it("maps admonition names to template calls", () => {
    const out = gen(`::: warning\nNever do this.\n:::\n`);
    expect(out).toContain("#warning[");
  });
});

describe("generateTypst: cross-references and math", () => {
  it("resolves [@label] for known labels and leaves unknown ones literal", () => {
    const out = gen(
      `$$ N = \\lambda \\cdot W $$ {#eq:little}\n\nSee [@eq:little] but not [@eq:missing].\n`,
    );
    expect(out).toContain("@eq:little");
    expect(out).toContain("\\[\\@eq:missing\\]");
  });

  it("translates LaTeX symbols and labels display math", () => {
    const out = gen(`$$ N = \\lambda \\cdot W $$ {#eq:little}\n`);
    expect(out).toContain("$ N = lambda dot.op W $ <eq:little>");
  });

  it("falls back to plain text for unresolved intra-doc links", () => {
    const out = gen(`See [Ch. 8 · asyncio](#ch-missing).\n`);
    expect(out).toContain("Ch. 8 · asyncio");
    expect(out).not.toContain("#link(<ch-missing>)");
  });
});

describe("generateTypst: inline code", () => {
  it("grows the fence beyond the longest backtick run in the value", () => {
    const out = gen("Run `` a`b `` now.\n");
    expect(out).toContain("``a`b``");
  });

  it("pads values that start or end with a backtick", () => {
    const out = gen("Quote ``` `tick ``` here.\n");
    expect(out).toContain("`` `tick``");
  });
});
