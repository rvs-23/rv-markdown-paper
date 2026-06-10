import { describe, expect, it } from "vitest";
import { estimateReadingTime } from "../src/core/readingTime.js";
import { parseMarkdownToMdast } from "../src/parser/parseMarkdown.js";

describe("estimateReadingTime", () => {
  it("floors at 1 min for empty and short documents", () => {
    expect(estimateReadingTime(parseMarkdownToMdast(""))).toBe("1 min");
    expect(estimateReadingTime(parseMarkdownToMdast("A few words only.\n"))).toBe("1 min");
  });

  it("rounds to the nearest minute at 230 wpm", () => {
    // 460 words → exactly 2 minutes.
    const words = Array(460).fill("word").join(" ");
    expect(estimateReadingTime(parseMarkdownToMdast(words))).toBe("2 min");
    // 300 words → 1.30 min → rounds to 1.
    const fewer = Array(300).fill("word").join(" ");
    expect(estimateReadingTime(parseMarkdownToMdast(fewer))).toBe("1 min");
  });
});
