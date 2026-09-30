import { describe, expect, it } from "vitest";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";
import { ConfigError } from "../src/config/validate.js";

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

  it("preserves colons inside directive attribute values", () => {
    // Colons survived only on `value`/`lang`/`meta`/`children` before — the
    // restorer didn't walk `node.attributes`, so `Sec: 1` came out as
    // `Sec<placeholder>1` (the literal placeholder byte). This asserts the
    // recursive restoration through `node.attributes`.
    const tree = parseMarkdownToMdast(`:::{.margin label="Sec: 1"}
body
:::
`);
    const first = tree.children[0] as {
      data?: { attrs?: { props?: Record<string, string> } };
    };
    expect(first.data?.attrs?.props?.label).toBe("Sec: 1");
  });

  it("accepts colon-bearing IDs like #eq:little", () => {
    // Pandoc-style crossref IDs use a colon. The conservative ID grammar
    // (^[A-Za-z][A-Za-z0-9_:-]*$) keeps these working; parsing must not
    // throw.
    expect(() =>
      parseMarkdownToMdast(`## Section {#sec-foo}

$$ a + b = c $$ {#eq:little}
`),
    ).not.toThrow();
  });

  it("rejects invalid IDs with a ConfigError at parse time", () => {
    // Permissive parser used to accept any non-whitespace token, including
    // `<`, `>`, quotes — which break Typst emission or open injection.
    // The new grammar rejects with a ConfigError surfaced during parse
    // (extractAttributes is invoked from inside parseMarkdownToMdast), so
    // the error reaches the user before any Typst is generated.
    expect(() => parseMarkdownToMdast(`## Bad {#foo>bar}
`)).toThrow(ConfigError);
    expect(() => parseMarkdownToMdast(`## Bad {#foo>bar}
`)).toThrow(/foo>bar/);
  });
});

describe("colon protection leaves link destinations intact", () => {
  it("does not rewrite `@host:port` or `{k:v}` inside URLs", () => {
    const tree = parseMarkdownToMdast(
      "[a](https://user@host:8080/p) [b](http://x.com/{k:v})",
    );
    const para = tree.children[0] as { children: Array<{ type: string; url?: string }> };
    const urls = para.children.filter((c) => c.type === "link").map((c) => c.url);
    expect(urls).toEqual(["https://user@host:8080/p", "http://x.com/{k:v}"]);
  });
});

describe("reference-style links and images", () => {
  const md = `See [full][r], [collapsed][], [r] and [missing][nope].

![A figure][img]

[r]: https://example.com
[collapsed]: #sec-x
[img]: figures/pic.png
`;

  it("rewrites every reference form into the inline node it stands for", () => {
    const tree = parseMarkdownToMdast(md);
    const para = tree.children[0] as { children: Array<{ type: string; url?: string; value?: string }> };
    const links = para.children.filter((c) => c.type === "link").map((c) => c.url);
    expect(links).toEqual(["https://example.com", "#sec-x", "https://example.com"]);
    // No definition, so remark leaves it as text, and so do we.
    expect(para.children.at(-1)!.value).toBe(" and [missing][nope].");
    const figure = tree.children[1] as { children: Array<{ type: string; url?: string; alt?: string }> };
    expect(figure.children[0]).toMatchObject({ type: "image", url: "figures/pic.png", alt: "A figure" });
  });

  it("drops the definitions themselves", () => {
    expect(parseMarkdownToMdast(md).children.map((c) => c.type)).toEqual(["paragraph", "paragraph"]);
  });
});
