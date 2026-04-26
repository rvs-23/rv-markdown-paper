import { describe, expect, it } from "vitest";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";

describe("parseMarkdownToMdast", () => {
  it("normalizes spaced directive opener syntax", () => {
    const tree = parseMarkdownToMdast(`::: note
hello
:::
`);
    const first = tree.children[0];
    expect(first?.type).toBe("containerDirective");
    expect((first as { name?: string }).name).toBe("note");
  });

  it("normalizes class-shorthand directive and extracts attrs", () => {
    const tree = parseMarkdownToMdast(`:::{.margin label="Aside"}
This is margin text.
:::
`);
    const first = tree.children[0] as {
      type: string;
      name?: string;
      data?: { attrs?: { props?: Record<string, string> } };
    };

    expect(first.type).toBe("containerDirective");
    expect(first.name).toBe("margin");
    expect(first.data?.attrs?.props?.label).toBe("Aside");
  });
});
