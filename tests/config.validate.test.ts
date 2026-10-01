import { describe, expect, it, vi } from "vitest";
import { ConfigError, validateOptions } from "../src/config/validate.js";

describe("validateOptions", () => {
  it("accepts cover.meta object syntax and preserves insertion order", () => {
    const out = validateOptions(
      {
        cover: {
          meta: {
            TOPIC: "Thread pools",
            LANGUAGE: "Python 3.12",
          },
        },
      },
      "frontmatter",
    );

    expect(out.cover?.meta).toEqual([
      { label: "TOPIC", value: "Thread pools" },
      { label: "LANGUAGE", value: "Python 3.12" },
    ]);
  });

  it("throws ConfigError for invalid margin unit with source path", () => {
    expect(() =>
      validateOptions(
        {
          margins: {
            top: "24abc",
          },
        },
        "frontmatter",
      ),
    ).toThrowError(ConfigError);

    expect(() =>
      validateOptions(
        {
          margins: {
            top: "24abc",
          },
        },
        "frontmatter",
      ),
    ).toThrow(/frontmatter\.margins\.top/);
  });
});

describe("validateOptions unknown keys", () => {
  it("throws on an unknown key in strict mode, suggesting the near miss", () => {
    expect(() => validateOptions({ showheader: false }, "mdpdf.config.json", { strictKeys: true }))
      .toThrow('mdpdf.config.json.showheader: unknown option. Did you mean "showHeader"?');
  });

  it("warns on a frontmatter typo but stays silent on unrelated keys", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      validateOptions({ titel: "X", tags: ["a"], aliases: ["b"] }, "frontmatter");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]![0]).toContain('Did you mean "title"?');
    } finally {
      warn.mockRestore();
    }
  });
});

describe("validateOptions paperBg", () => {
  it("resolves preset names, in any case, to their hex", () => {
    expect(validateOptions({ paperBg: "parchment" }, "fm").paperBg).toBe("#F5EEDD");
    expect(validateOptions({ paperBg: "Glacier" }, "fm").paperBg).toBe("#FAFBFC");
    expect(validateOptions({ paperBg: "platinum" }, "fm").paperBg).toBe("#F4F4F4");
  });

  it("still takes any #RRGGBB, upper-cased", () => {
    expect(validateOptions({ paperBg: "#ffe0c0" }, "fm").paperBg).toBe("#FFE0C0");
  });

  it("rejects anything else, listing the choices", () => {
    expect(() => validateOptions({ paperBg: "gold" }, "fm")).toThrow(
      'fm.paperBg: expected glacier, platinum, parchment, or a #RRGGBB hex color, got "gold".',
    );
    // Object prototype names are not presets.
    expect(() => validateOptions({ paperBg: "constructor" }, "fm")).toThrow(/expected glacier/);
  });
});

describe("validateOptions showAuthor", () => {
  it("accepts a boolean and rejects anything else", () => {
    expect(validateOptions({ showAuthor: false }, "fm").showAuthor).toBe(false);
    expect(() => validateOptions({ showAuthor: "no" }, "fm")).toThrow("fm.showAuthor: expected true or false");
  });
});

describe("library entry", () => {
  it("exports ConfigError so callers can check for it", async () => {
    const lib = await import("../src/index.js");
    expect(lib.ConfigError).toBe(ConfigError);
    expect(() => validateOptions({ pageSize: "A5" }, "fm")).toThrow(lib.ConfigError);
  });
});
