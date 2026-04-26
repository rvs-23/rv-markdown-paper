import { describe, expect, it } from "vitest";
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
