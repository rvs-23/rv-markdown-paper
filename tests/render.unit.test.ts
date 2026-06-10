import { describe, expect, it } from "vitest";
import { derivePaletteTyp } from "../src/typst/render.js";

describe("derivePaletteTyp", () => {
  it("passes the paper colour through and tracks danger-fg to it", () => {
    const out = derivePaletteTyp("#F4F4F4");
    expect(out).toContain('#let c-paper     = rgb("#F4F4F4")');
    expect(out).toContain('#let c-danger-fg = rgb("#F4F4F4")');
  });

  it("derives surface and hairline darker than the paper", () => {
    const out = derivePaletteTyp("#E8E8E8");
    const get = (token: string) => {
      const m = out.match(new RegExp(`#let ${token}\\s*= rgb\\("#([0-9A-F]{6})"\\)`));
      expect(m, `token ${token} missing`).not.toBeNull();
      return parseInt(m![1]!, 16);
    };
    const paper = get("c-paper");
    const surface = get("c-surface");
    const surface2 = get("c-surface-2");
    const hairline = get("c-hairline");
    expect(surface).toBeLessThan(paper);
    expect(surface2).toBeLessThan(surface);
    expect(hairline).toBeLessThan(surface2);
  });

  it("keeps the ink ramp independent of the paper colour", () => {
    const a = derivePaletteTyp("#FFFFFF");
    const b = derivePaletteTyp("#D0D0D0");
    for (const token of ["c-ink ", "c-ink-2", "c-ink-3", "c-muted", "c-mute-2", "c-danger-bg"]) {
      const lineA = a.split("\n").find((l) => l.includes(token));
      const lineB = b.split("\n").find((l) => l.includes(token));
      expect(lineA).toBe(lineB);
    }
  });

  it("rejects shorthand and malformed hex values", () => {
    expect(() => derivePaletteTyp("#FFF")).toThrow(/invalid hex/);
    expect(() => derivePaletteTyp("F4F4F4")).toThrow(/invalid hex/);
    expect(() => derivePaletteTyp("#GGGGGG")).toThrow(/invalid hex/);
  });
});
