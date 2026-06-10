import { describe, expect, it } from "vitest";
import { parseAttrString } from "../src/parser/attributes.js";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import { ConfigError } from "../src/config/validate.js";
import type { Heading, Code, Paragraph, Image } from "mdast";

type WithAttrs = {
  data?: { attrs?: { id?: string; classes?: string[]; props?: Record<string, string> } };
};

describe("parseAttrString", () => {
  it("parses a full bundle: id, classes, quoted and bare props", () => {
    const attrs = parseAttrString('#sec-intro .pagebreak .wide key=val tag="Warm up"');
    expect(attrs).toEqual({
      id: "sec-intro",
      classes: ["pagebreak", "wide"],
      props: { key: "val", tag: "Warm up" },
    });
  });

  it("handles escaped quotes inside quoted values", () => {
    const attrs = parseAttrString('label="a \\"quoted\\" word"');
    expect(attrs?.props?.label).toBe('a "quoted" word');
  });

  it("returns null for content it cannot parse", () => {
    expect(parseAttrString("")).toBeNull();
    expect(parseAttrString("???")).toBeNull();
    expect(parseAttrString('key="unterminated')).toBeNull();
  });

  it("rejects ids outside the conservative grammar", () => {
    expect(() => parseAttrString("#bad>id")).toThrow(ConfigError);
    expect(() => parseAttrString("#1starts-with-digit")).toThrow(ConfigError);
  });

  it("rejects classes outside the grammar", () => {
    expect(() => parseAttrString(".bad[class]")).toThrow(ConfigError);
  });

  it("accepts Pandoc-crossref style colons in ids", () => {
    expect(parseAttrString("#eq:little")?.id).toBe("eq:little");
    expect(parseAttrString("#fig:pool-queue")?.id).toBe("fig:pool-queue");
  });
});

describe("attribute lifting through the parser", () => {
  it("strips a trailing {#id .class} bundle off a heading", () => {
    const tree = parseMarkdownToMdast("## 7.3 · Submitting {#sec-submitting .pagebreak}\n");
    const h = tree.children[0] as Heading & WithAttrs;
    expect(h.type).toBe("heading");
    expect(h.data?.attrs?.id).toBe("sec-submitting");
    expect(h.data?.attrs?.classes).toEqual(["pagebreak"]);
    const text = h.children.map((c) => ("value" in c ? c.value : "")).join("");
    expect(text).toBe("7.3 · Submitting");
  });

  it("lifts code-fence info-string attributes and promotes the language", () => {
    const md = '``` {.python filename="x.py" lang-label="Python 3.12"}\nprint(1)\n```\n';
    const tree = parseMarkdownToMdast(md);
    const code = tree.children[0] as Code & WithAttrs;
    expect(code.type).toBe("code");
    expect(code.lang).toBe("python");
    expect(code.meta).toBeNull();
    expect(code.data?.attrs?.props?.filename).toBe("x.py");
    expect(code.data?.attrs?.props?.["lang-label"]).toBe("Python 3.12");
  });

  it("attaches a trailing bundle to the preceding image", () => {
    const tree = parseMarkdownToMdast("![cap](figures/a.png){#fig:a}\n");
    const para = tree.children[0] as Paragraph;
    const img = para.children[0] as Image & WithAttrs;
    expect(img.type).toBe("image");
    expect(img.data?.attrs?.id).toBe("fig:a");
    // The {#fig:a} text node is consumed, so the generator's
    // single-image-paragraph -> #figure promotion still fires.
    expect(para.children).toHaveLength(1);
  });

  it("fails fast on an invalid id in source markdown", () => {
    expect(() => parseMarkdownToMdast("## Heading {#bad>id}\n")).toThrow(ConfigError);
  });
});
