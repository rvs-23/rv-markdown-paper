import { describe, expect, it } from "vitest";
import { escapeMarkup, escapeString } from "../src/typst/escape.js";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import { generateTypst } from "../src/typst/generate.js";

describe("escapeMarkup", () => {
  // Every character Typst's markup mode can reinterpret. Each must come
  // back with a leading backslash so it renders as a literal glyph.
  const specials: Array<[string, string]> = [
    ["\\", "\\\\"],
    ["*", "\\*"],
    ["_", "\\_"],
    ["`", "\\`"],
    ["$", "\\$"],
    ["#", "\\#"],
    ["@", "\\@"],
    ["<", "\\<"],
    [">", "\\>"],
    ["[", "\\["],
    ["]", "\\]"],
    ["~", "\\~"],
    ["/", "\\/"],
  ];

  it.each(specials)("escapes %j", (input, expected) => {
    expect(escapeMarkup(input)).toBe(expected);
  });

  it("escapes ~ inside running text (Typst nbsp shorthand)", () => {
    expect(escapeMarkup("Thread creation is ~100 μs")).toBe(
      "Thread creation is \\~100 μs",
    );
  });

  it("escapes // so it cannot start a Typst line comment", () => {
    expect(escapeMarkup("see https://example.com for details")).toBe(
      "see https:\\/\\/example.com for details",
    );
  });

  it("escapes line-start enum/list/term triggers", () => {
    expect(escapeMarkup("- not a bullet")).toBe("\\- not a bullet");
    expect(escapeMarkup("+ not an enum")).toBe("\\+ not an enum");
    expect(escapeMarkup("= not a heading")).toBe("\\= not a heading");
  });

  it("collapses soft line breaks into spaces", () => {
    expect(escapeMarkup("one\ntwo")).toBe("one two");
  });

  it("passes ordinary prose through untouched", () => {
    expect(escapeMarkup("plain text, with punctuation.")).toBe(
      "plain text, with punctuation.",
    );
  });
});

describe("escapeString", () => {
  it("escapes backslashes and double quotes only", () => {
    expect(escapeString('a\\b"c')).toBe('a\\\\b\\"c');
    expect(escapeString("~/*_`$#@<>[]")).toBe("~/*_`$#@<>[]");
  });
});

describe("escaping through the generator", () => {
  it("preserves a literal tilde in body text", () => {
    // Regression: `~` unescaped became a Typst non-breaking space, so
    // "~100 μs" rendered as " 100 μs" in the editorial fixture (§7.1.1).
    const tree = parseMarkdownToMdast("Thread creation is ~100 μs.\n");
    const out = generateTypst(tree, { sourceDir: "/tmp/mdpdf-tests" });
    expect(out).toContain("\\~100 μs");
  });
});
