import { describe, expect, it } from "vitest";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import { generateTypst } from "../src/typst/generate.js";

function gen(md: string): string {
  const tree = parseMarkdownToMdast(md);
  return generateTypst(tree, { sourceDir: "/tmp/mdpdf-tests" }).trimEnd();
}

const MUTED = "#text(fill: c-muted)[";
const UNDERLINE = "#underline(offset: 1.8pt, stroke: 0.5pt)[";

describe("bracketed spans", () => {
  it("renders .muted and .underline spans", () => {
    const out = gen("A [quiet]{.muted} and [ruled]{.underline} word.\n");
    expect(out).toBe(`A ${MUTED}quiet]; and ${UNDERLINE}ruled]; word.`);
  });

  it("keeps inline markup inside a span", () => {
    const out = gen("[**bold** and *it*]{.muted} after\n");
    expect(out).toBe(`${MUTED}#strong[bold]; and #emph[it];]; after`);
  });

  it("applies every known class and nests spans", () => {
    expect(gen("[both]{.muted .underline}\n")).toBe(`${MUTED}${UNDERLINE}both];];`);
    expect(gen("[a [b]{.underline} c]{.muted}\n")).toBe(`${MUTED}a ${UNDERLINE}b]; c];`);
  });

  it("renders unknown classes, .smallcaps and key=value-only spans plainly", () => {
    expect(gen("x [plain]{.nope} y\n")).toBe("x plain y");
    expect(gen("x [plain]{.smallcaps} y\n")).toBe("x plain y");
    expect(gen('x [plain]{lang=fr title="a b"} y\n')).toBe("x plain y");
  });

  it("leaves a malformed attribute bundle as literal text", () => {
    expect(gen("x [1]{.5} y\n")).toBe("x \\[1\\]{.5} y");
  });

  it("rejects a span with an id", () => {
    expect(() => gen("see [this]{#here .muted}\n")).toThrow(/span ids are not supported/);
  });

  it("gives a heading-final span to the span, not the heading", () => {
    const out = gen("## Title [x]{.muted}\n");
    expect(out).toBe(`== Title ${MUTED}x];`);
  });

  it("still lifts heading attributes after a span", () => {
    const out = gen("## Title [x]{.muted} {#sec-t}\n");
    expect(out).toBe(`== Title ${MUTED}x]; <sec-t>`);
  });

  it("leaves escaped brackets literal, in body and heading", () => {
    expect(gen("\\[x]{.muted}\n")).toBe("\\[x\\]{.muted}");
    expect(gen("&#91;x]{.muted}\n")).toBe("\\[x\\]{.muted}");
    expect(gen("## T \\[x]{.muted}\n")).toBe("== T \\[x\\]{.muted}");
  });

  it("treats an escaped backslash before [ as a live bracket", () => {
    expect(gen("\\\\[x]{.muted}\n")).toBe(`\\\\${MUTED}x];`);
  });

  it("never touches inline or fenced code", () => {
    expect(gen("`[a]{.muted}`\n")).toBe("`[a]{.muted}`");
    const fenced = gen("```\n[a]{.muted}\n```\n");
    expect(fenced).toContain("[a]{.muted}");
    expect(fenced).not.toContain("c-muted");
  });

  it("leaves links alone and lets a span contain one", () => {
    expect(gen("[text](https://e.com)\n")).toBe('#link("https://e.com")[text];');
    expect(gen("[see [site](https://e.com)]{.muted}\n")).toBe(
      `${MUTED}see #link("https://e.com")[site];];`,
    );
  });

  it("keeps colon-bearing attribute values intact", () => {
    expect(gen('[x]{.muted k="a:b"} and @fig:none\n')).toBe(`${MUTED}x]; and \\@fig:none`);
  });

  it("works in list items, table cells, blockquotes and footnotes", () => {
    const md = `- item [a]{.muted}
  continued [b]{.muted}

| h |
|---|
| [c]{.muted} |

> quote [d]{.muted}
> next [e]{.muted}

Body[^1].

[^1]: Note [f]{.muted}.
`;
    const out = gen(md);
    for (const t of ["a", "b", "c", "d", "e", "f"]) expect(out).toContain(`${MUTED}${t}];`);
    expect(out).not.toContain("{.muted}");
  });

  it("spans across a footnote reference inside the brackets", () => {
    const out = gen("[see[^1]]{.muted}\n\n[^1]: Body.\n");
    expect(out).toBe(`${MUTED}see#footnote[Body.];];`);
  });
});
