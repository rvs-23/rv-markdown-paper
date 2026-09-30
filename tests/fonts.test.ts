import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import {
  assertFontCoverage,
  bundledFontCoverage,
  collectOptionText,
  collectRenderedText,
  readCmapCoverage,
} from "../src/typst/fonts.js";
import { DEFAULTS } from "../src/config/options.js";

const FONTS = join(import.meta.dirname, "..", "assets", "fonts");
const cp = (ch: string) => ch.codePointAt(0)!;

function textOf(markdown: string, mode: "page" | "endnotes" = "page"): string {
  return collectRenderedText(parseMarkdownToMdast(markdown), mode)
    .map((t) => t.text)
    .join("|");
}

describe("readCmapCoverage", () => {
  it("reads a TrueType cmap", () => {
    const archivo = readCmapCoverage(readFileSync(join(FONTS, "Archivo-Regular.ttf")));
    expect(archivo.has(cp("A"))).toBe(true);
    expect(archivo.has(cp("λ"))).toBe(false);
  });

  it("reads a CFF OpenType cmap", () => {
    const libertinus = readCmapCoverage(readFileSync(join(FONTS, "LibertinusSerif-Regular.otf")));
    expect(libertinus.has(cp("λ"))).toBe(true);
  });

  it("unions every bundled font", () => {
    const all = bundledFontCoverage();
    expect(all.has(cp("A"))).toBe(true);
    expect(all.has(cp("क"))).toBe(true);
    expect(all.has(cp("ಕ"))).toBe(true);
    expect(all.has(cp("✅"))).toBe(true);
    expect(all.has(cp("你"))).toBe(false);
    expect(all.has(cp("م"))).toBe(false);
  });
});

describe("collectRenderedText", () => {
  it("collects text, code, alt and directive attributes", () => {
    const md = [
      "# Head *em*",
      "",
      "Text `code` ![alt text](x.png) <b>between tags</b>",
      "",
      "``` {.python filename=\"main.py\"}",
      "print(1)",
      "```",
      "",
      ':::exbox{title="Box title"}',
      "Inside.",
      ":::",
    ].join("\n");
    const text = textOf(md);
    for (const s of ["Head ", "em", "code", "alt text", "print(1)", "main.py", "Box title", "Inside.", "between tags"]) {
      expect(text).toContain(s);
    }
  });

  it("skips raw html and math", () => {
    const text = textOf("A <!-- 你 --> <span title=\"你\"> and $\\alpha$.\n\n<div>好</div>\n\n$$\nx^2\n$$\n");
    expect(text).not.toMatch(/你|好|alpha|x\^2/);
  });

  it("skips unreferenced footnotes in page mode only", () => {
    const md = "Body[^a].\n\n[^a]: Used.\n\n[^b]: Orphan.\n";
    expect(textOf(md, "page")).toContain("Used.");
    expect(textOf(md, "page")).not.toContain("Orphan.");
    expect(textOf(md, "endnotes")).toContain("Orphan.");
  });

  it("reports source lines shifted past the frontmatter", () => {
    const texts = collectRenderedText(parseMarkdownToMdast("One.\n\nTwo.\n"), "page", 3);
    expect(texts.find((t) => t.text === "Two.")?.where).toBe("line 6");
  });
});

describe("collectOptionText", () => {
  it("collects rendered option strings, including the cover", () => {
    const texts = collectOptionText({
      ...DEFAULTS,
      title: "T",
      chapter: 7,
      cover: {
        kicker: "K",
        meta: [{ label: "ML", value: "MV" }],
        toc: [{ id: "1.1", title: "Toc", ref: "sec-x" }],
      },
    });
    expect(texts.map((t) => t.text)).toEqual(["T", "K", "ML", "MV", "1.1", "Toc"]);
    expect(texts[0]!.where).toBe("frontmatter (title)");
  });
});

describe("assertFontCoverage", () => {
  it("accepts covered scripts and invisible characters", () => {
    const text = "Hello λ Жук नमस्ते ಕನ್ನಡ ✅ 1️⃣ 👩‍💻 soft­hyphen\t\n";
    expect(() => assertFontCoverage([{ text, where: "line 1" }])).not.toThrow();
  });

  it("accepts decomposed text that NFC composes", () => {
    expect(() => assertFontCoverage([{ text: "é", where: "line 1" }])).not.toThrow();
  });

  it("names each uncovered character once, with its first location", () => {
    let message = "";
    try {
      assertFontCoverage([
        { text: "Hi 你好", where: "line 3" },
        { text: "你 مرحبا", where: "line 9" },
      ]);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain("你  U+4F60  line 3");
    expect(message).toContain("م  U+0645  line 9");
    expect(message.match(/U\+4F60/g)).toHaveLength(1);
  });
});
