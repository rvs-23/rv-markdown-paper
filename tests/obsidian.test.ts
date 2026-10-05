import { describe, expect, it } from "vitest";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import { generateTypst } from "../src/typst/generate.js";

function gen(md: string): string {
  return generateTypst(parseMarkdownToMdast(md), { sourceDir: "/tmp/mdpdf-tests" });
}

describe("Obsidian callouts", () => {
  it("maps a callout onto the matching design callout, title in bold", () => {
    const out = gen("> [!tip] Remember\n> Body **text**.\n");
    expect(out).toContain("#tip[");
    expect(out).toContain("#strong[Remember];");
    expect(out).toContain("Body #strong[text];.");
    expect(out).not.toContain("[!tip]");
  });

  it("folds Obsidian's other types onto the four callouts", () => {
    expect(gen("> [!bug] x\n> y\n")).toContain("#danger[");
    expect(gen("> [!question]\n> y\n")).toContain("#warning[");
    expect(gen("> [!success]+ x\n> y\n")).toContain("#tip[");
    expect(gen("> [!info]- Folded\n> y\n")).toContain("#note[");
    expect(gen("> [!made-up] x\n> y\n")).toContain("#note[");
  });

  it("leaves an ordinary blockquote alone", () => {
    expect(gen("> Just a quote.\n")).toContain("#quote(block: true)[");
  });
});

describe("Obsidian wikilinks", () => {
  it("renders the alias, or the note's name", () => {
    const out = gen("See [[People/Taylor|Taylor]], [[Kannada notes]] and [[Design Notes#Projects]].\n");
    expect(out).toBe("See Taylor, Kannada notes and Design Notes › Projects.\n");
  });

  it("renders a note embed as its name and an image embed as a figure", () => {
    expect(gen("![[Another note]]\n")).toBe("Another note\n");
    // The test source dir doesn't exist, so the lookup reports the embed.
    expect(() => gen("![[diagram.png|300]]\n")).toThrow("Embedded image not found: ![[diagram.png]]");
  });

  it("never touches code", () => {
    expect(gen("Use `[[x]]` and `==y==`.\n")).toBe("Use `[[x]]` and `==y==`.\n");
    expect(gen("```\n[[x]] ==y== %%z%%\n```\n")).toContain("[[x]] ==y== %%z%%");
  });
});

describe("Obsidian highlights, comments and block ids", () => {
  it("marks ==text==, including across other markup", () => {
    expect(gen("A ==marked== word.\n")).toBe("A #mark[marked]; word.\n");
    expect(gen("A ==very **bold** mark== here.\n")).toBe("A #mark[very #strong[bold]; mark]; here.\n");
  });

  it("leaves spaced or unclosed == as typed", () => {
    expect(gen("If a == b then c == d.\n")).toBe("If a == b then c == d.\n");
    expect(gen("An ==unclosed marker.\n")).toBe("An ==unclosed marker.\n");
  });

  it("drops %%comments%% and trailing ^block ids", () => {
    expect(gen("Shown %%hidden%% shown. ^para-1\n")).toBe("Shown  shown.\n");
  });

  it("hides a comment whatever it contains", () => {
    // A bare URL used to swallow the closing %%, and markup split the
    // comment into pieces, so both printed.
    expect(gen("Before %%Trousers: https://in.pinterest.com/pin/1%% after.\n")).toBe("Before  after.\n");
    expect(gen("A %%see **this** and [that](https://x.com)%% B.\n")).toBe("A  B.\n");
    expect(gen("Top\n\n%%\nBlock with https://e.com\n\nand a gap\n%%\n\nBottom\n")).toBe("Top\n\nBottom\n");
  });

  it("keeps a paragraph whole around a comment line", () => {
    expect(gen("Line one\n%%a note%%\nline two.\n")).toBe("Line one line two.\n");
  });

  it("leaves code and an unclosed %% as typed", () => {
    expect(gen("Use `%%x%%` here.\n")).toBe("Use `%%x%%` here.\n");
    expect(gen("An %%unclosed marker.\n")).toBe("An %%unclosed marker.\n");
  });
});
