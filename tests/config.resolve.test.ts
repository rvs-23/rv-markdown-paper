import { describe, expect, it } from "vitest";
import { DEFAULTS } from "../src/config/options.js";
import { resolveOptions } from "../src/config/resolve.js";

describe("resolveOptions", () => {
  it("uses precedence CLI > frontmatter > project > defaults", () => {
    const out = resolveOptions({
      cli: {
        title: "CLI title",
        pageSize: "Letter",
      },
      frontmatter: {
        title: "Frontmatter title",
        pageSize: "A4",
      },
      project: {
        title: "Project title",
        pageSize: "A4",
      },
    });

    expect(out.title).toBe("CLI title");
    expect(out.pageSize).toBe("Letter");
  });

  it("merges partial margins and falls back to defaults", () => {
    const out = resolveOptions({
      cli: {
        margins: {
          left: "30mm",
        },
      },
      frontmatter: {
        margins: {
          top: "25mm",
        },
      },
      project: null,
    });

    expect(out.margins).toEqual({
      top: "25mm",
      right: DEFAULTS.margins.right,
      bottom: DEFAULTS.margins.bottom,
      left: "30mm",
    });
  });
});
