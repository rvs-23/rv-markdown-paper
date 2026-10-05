import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import { generateTypst, usesRail } from "../src/typst/generate.js";

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
  it("emits md-table with header, rows and each column's longest words", () => {
    const out = gen(`| Key | Long description |\n| --- | --- |\n| a | short words here |\n| bb | unbreakable-token |\n`);
    expect(out).toContain("#md-table(\n  ([Key], [Long description],),");
    expect(out).toContain("    ([a], [short words here],),");
    expect(out).toContain('(("Key", "bb"), ("description", "unbreakable-token"),)');
  });

  it("pads short rows and honours authored alignment", () => {
    const out = gen(`| W | G | C |\n| :-- | :-- | --: |\n| a |\n`);
    expect(out).toContain("    ([a], [], [],),");
    expect(out).toContain("align: (left, left, right)");
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
  it("uses a plain backtick span when the value has no backtick", () => {
    expect(gen("Run `a.b` now.\n")).toContain("Run `a.b` now.");
  });

  it("switches to a terminated #raw call when the value contains a backtick", () => {
    expect(gen("Run `` a`b `` now.\n")).toContain('Run #raw("a`b"); now.');
    expect(gen("Quote ``` `tick ``` here.\n")).toContain('#raw("`tick");');
  });
});

describe("generateTypst: thematic break", () => {
  it("emits a rule between paragraphs", () => {
    expect(gen("One\n\n---\n\nTwo\n")).toContain("One\n\n#rule()\n\nTwo");
  });
});

describe("generateTypst: footnote cycles", () => {
  it("names the cycle instead of overflowing the stack", () => {
    expect(() => gen("A[^a]\n\n[^a]: see[^b]\n\n[^b]: back[^a]\n")).toThrow(
      "Footnote [^a] references itself: [^a] → [^b] → [^a]",
    );
  });

  it("allows a cycle in endnotes mode, where bodies are not inlined", () => {
    expect(() => gen("A[^a]\n\n[^a]: loop[^a]\n", "endnotes")).not.toThrow();
  });
});

describe("generateTypst: dropcap", () => {
  it("keeps opening punctuation with the first letter", () => {
    expect(gen(":::dropcap\n“A quote begins.\n:::\n")).toContain('#dropcap("“A")');
    expect(gen(':::dropcap\n"Plain quotes too."\n:::\n')).toContain('#dropcap("\\"P")');
  });

  it("lifts a whole grapheme, not half of it", () => {
    expect(gen(":::dropcap\ne\u0301clair text\n:::\n")).toContain('#dropcap("e\u0301")');
  });
});

describe("usesRail", () => {
  const rail = (md: string) => usesRail(parseMarkdownToMdast(md));

  it("is false for plain documents and non-dotted headings", () => {
    expect(rail("## 1. History\n\nText.\n")).toBe(false);
  });

  it("is true for a :::margin note, even nested", () => {
    expect(rail(":::note\n:::margin\nSide.\n:::\n:::\n")).toBe(true);
  });

  it("is true for a dotted H2 section numeral", () => {
    expect(rail("## 7.1 · Threads\n")).toBe(true);
  });
});

describe("image sizes", () => {
  it("fills the column by default", () => {
    expect(gen("![Cap](a.png)\n")).toContain('a.png", width: 100%)');
  });

  it("takes width and height from attributes", () => {
    expect(gen("![Cap](a.png){width=50%}\n")).toContain('a.png", width: 50%)');
    expect(gen("![Cap](a.png){height=8cm}\n")).toContain('a.png", height: 8cm)');
    expect(gen("![Cap](a.png){width=60mm height=4cm}\n")).toContain(
      'a.png", width: 60mm, height: 4cm, fit: "contain")',
    );
    // A bare number is CSS pixels, as in Pandoc and Obsidian.
    expect(gen("Inline ![](a.png){height=40}\n")).toContain('a.png", height: 30pt));');
  });

  it("takes an Obsidian embed's size", () => {
    const dir = mkdtempSync(join(tmpdir(), "mdpdf-size-"));
    try {
      writeFileSync(join(dir, "photo.jpg"), "");
      const embed = (md: string) => generateTypst(parseMarkdownToMdast(md), { sourceDir: dir });
      expect(embed("![[photo.jpg|300]]\n")).toContain('photo.jpg", width: 225pt)');
      expect(embed("![[photo.jpg|300x200]]\n")).toContain('photo.jpg", width: 225pt, height: 150pt, fit: "contain")');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects a size that isn't a length", () => {
    expect(() => gen("![Cap](a.png){width=big}\n")).toThrow('Image size "big" for a.png');
    expect(() => gen("![Cap](a.png){height=50%}\n")).toThrow("can't be a percentage");
  });
});
