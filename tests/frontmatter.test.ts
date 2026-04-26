import { describe, expect, it } from "vitest";
import { extractFrontmatter } from "../src/parser/frontmatter.js";

describe("extractFrontmatter", () => {
  it("parses valid frontmatter and returns remaining markdown content", () => {
    const input = `---
title: "Thread pools"
pageSize: "A4"
showHeader: true
---

# Intro

Body text.
`;

    const out = extractFrontmatter(input);
    expect(out.frontmatter.title).toBe("Thread pools");
    expect(out.frontmatter.pageSize).toBe("A4");
    expect(out.content.trimStart()).toMatch(/^# Intro/);
  });

  it("throws a readable error for invalid YAML", () => {
    const input = `---
title: [broken
---
content
`;

    expect(() => extractFrontmatter(input)).toThrow(/Invalid frontmatter YAML/);
  });
});
