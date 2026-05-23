import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DEFAULTS } from "../src/config/options.js";
import { loadConfigFromPath, resolveOptions } from "../src/config/resolve.js";

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

  it("loadConfigFromPath reads a config from an explicit path", () => {
    const dir = mkdtempSync(join(tmpdir(), "mdpdf-config-test-"));
    const configPath = join(dir, "custom-config.json");
    writeFileSync(
      configPath,
      JSON.stringify({ title: "From custom path", pageSize: "Letter" }),
    );
    try {
      const layer = loadConfigFromPath(configPath);
      expect(layer.title).toBe("From custom path");
      expect(layer.pageSize).toBe("Letter");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loadConfigFromPath throws when the file does not exist", () => {
    expect(() => loadConfigFromPath("/no/such/file.json")).toThrow(
      /Config file not found/,
    );
  });
});
