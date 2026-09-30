import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";
import type { DocumentOptionsLayer } from "../src/config/options.js";

// Markdown the canonical fixture doesn't exercise. Each case renders a
// small document end-to-end and asserts on the extracted PDF text, so a
// case fails both when Typst refuses to compile and when it compiles but
// renders the wrong thing.

const hasTools =
  spawnSync("typst", ["--version"], { stdio: "ignore" }).status === 0 &&
  [0, 99].includes(spawnSync("pdftotext", ["-v"], { stdio: "ignore" }).status ?? -1);

async function render(
  markdown: string,
  cli: DocumentOptionsLayer = {},
  layout = false,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mdpdf-edge-"));
  try {
    const input = join(dir, "doc.md");
    const output = join(dir, "doc.pdf");
    await writeFile(input, markdown, "utf8");
    await convertMarkdownToPdf({ inputPath: input, outputPath: output, cli });
    const args = layout ? ["-layout", output, "-"] : [output, "-"];
    const r = spawnSync("pdftotext", args, { encoding: "utf8" });
    // Collapse whitespace so assertions don't depend on line wrapping,
    // unless the case needs to see indentation.
    return layout ? r.stdout : r.stdout.replace(/\s+/g, " ");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!hasTools)("edge-case rendering", () => {
  it("keeps an escaped `1.` at paragraph start as text, not a list", async () => {
    const text = await render("Intro.\n\n1\\. not a list\n", {}, true);
    // A Typst enum would indent the line relative to the paragraph above.
    const indentOf = (needle: string) =>
      text.split("\n").find((l) => l.includes(needle))!.search(/\S/);
    expect(indentOf("not a list")).toBe(indentOf("Intro."));
  });

  it("renders `//` inside cover subtitle text", async () => {
    const text = await render(
      '---\ncover:\n  title: "Hello"\n  subtitle: "either a // b or c"\n---\nBody.\n',
    );
    expect(text).toContain("either a // b or c");
  });

  it("keeps links whose URL contains `@host:port` or `{k:v}`", async () => {
    const text = await render(
      "See [site](https://user@host:8080/path) and [api](http://a.com/{k:v}).\n",
    );
    expect(text).toContain("See site and api.");
  });

  it("renders inline code that contains backticks", async () => {
    const text = await render("A ``a`b`` and ````x```y```` then ``c`d``.method.\n");
    // The inline-code chip's padding shows up as a space in pdftotext.
    expect(text).toMatch(/A a`b and x```y then c`d ?\.method\./);
  });

  it("keeps text glued to an inline call from extending it", async () => {
    const text = await render("A ~~x~~(y) and [l](https://e.com).z and n[^1].Next\n\n[^1]: Note.\n");
    expect(text).toContain("A x(y) and l.z and n");
    expect(text).toContain(".Next");
  });

  it("keeps the H1 when a configured cover is switched off", async () => {
    const md = '---\ncover:\n  title: "Cover title"\n---\n# Thread pools\n\nBody.\n';
    expect(await render(md, { showCover: false })).toContain("Thread pools");
    expect(await render(md)).not.toContain("Thread pools");
  });

  it("honours an ordered list's start number", async () => {
    const text = await render("5. five\n6. six\n");
    expect(text).toMatch(/5\.\s*five\s*6\.\s*six/);
  });

  it("renders real LaTeX math", async () => {
    const text = await render("Area $ab + c$ and $\\frac{a}{b}$ and $\\sqrt{x}$.\n");
    expect(text).not.toContain("frac");
    expect(text).not.toContain("sqrt");
  });

  it("refuses Typst code smuggled into math", async () => {
    await expect(render("$#text(red)[pwned]$\n")).rejects.toThrow(/raw # or "/);
    await expect(render('$\\text{" #panic() "}$\n')).rejects.toThrow(/raw # or "/);
  });

  it("names the formula when LaTeX can't be converted", async () => {
    await expect(render("$\\nosuchcommand x$\n")).rejects.toThrow(/\\nosuchcommand/);
  });

  it("renders from a read-only source dir and writes nothing beside the markdown", async () => {
    const src = await mkdtemp(join(tmpdir(), "mdpdf-ro-"));
    const out = await mkdtemp(join(tmpdir(), "mdpdf-ro-out-"));
    try {
      await writeFile(join(src, "doc.md"), "Hello.\n", "utf8");
      await chmod(src, 0o555);
      await convertMarkdownToPdf({
        inputPath: join(src, "doc.md"),
        outputPath: join(out, "doc.pdf"),
      });
      expect(await readdir(src)).toEqual(["doc.md"]);
    } finally {
      await chmod(src, 0o755);
      await rm(src, { recursive: true, force: true });
      await rm(out, { recursive: true, force: true });
    }
  });

  it("paints the page with --paper-bg", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-bg-"));
    try {
      await writeFile(join(dir, "doc.md"), "Hello.\n", "utf8");
      await convertMarkdownToPdf({
        inputPath: join(dir, "doc.md"),
        outputPath: join(dir, "doc.pdf"),
        cli: { paperBg: "#FFE0C0" },
      });
      // Rasterise at 10 dpi and read the top-left pixel of the binary PPM.
      const r = spawnSync("pdftoppm", ["-r", "10", "-singlefile", join(dir, "doc.pdf")], {
        maxBuffer: 1 << 24,
      });
      const ppm = r.stdout as Buffer;
      let offset = 0;
      for (let fields = 0; fields < 4; offset++) {
        if (/\s/.test(String.fromCharCode(ppm[offset]!))) fields++;
      }
      expect([...ppm.subarray(offset, offset + 3)]).toEqual([0xff, 0xe0, 0xc0]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("renders bold and italic that start inside a word", async () => {
    const text = await render("oota**kke** = for the meal; un*believ*able.\n");
    expect(text).toContain("ootakke = for the meal; unbelievable.");
  });

  it("renders Devanagari, Kannada and emoji through the bundled fallbacks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-scripts-"));
    try {
      await writeFile(join(dir, "doc.md"), "Hindi नमस्ते, Kannada ಕನ್ನಡ, ok ✅\n", "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf") });
      const fonts = spawnSync("pdffonts", [join(dir, "doc.pdf")], { encoding: "utf8" }).stdout;
      expect(fonts).toContain("NotoSansDevanagari");
      expect(fonts).toContain("NotoSansKannada");
      expect(fonts).toContain("NotoEmoji");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("lets a table taller than the remaining page break across pages", async () => {
    const rows = Array.from({ length: 60 }, (_, i) => `| row ${i} | value ${i} |`).join("\n");
    const text = await render(`## Heading\n\nIntro.\n\n| Key | Value |\n|---|---|\n${rows}\n`, {}, true);
    const pages = text.split("\f");
    // The first rows share page 1 with the heading instead of moving on.
    expect(pages[0]).toContain("row 0");
    // The header row repeats on the continuation page.
    expect(pages[1]).toMatch(/Key\s+Value/);
  });

  // Right edge (pt) of the rightmost word on page 1, via pdftotext -bbox.
  async function rightEdge(markdown: string, cli: DocumentOptionsLayer = {}): Promise<number> {
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-edge-x-"));
    try {
      await writeFile(join(dir, "doc.md"), markdown, "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf"), cli });
      const html = spawnSync("pdftotext", ["-bbox", "-f", "1", "-l", "1", join(dir, "doc.pdf"), "-"], {
        encoding: "utf8",
      }).stdout;
      return Math.max(...[...html.matchAll(/xMax="([\d.]+)"/g)].map((m) => Number(m[1])));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  const prose = `${"A long line of ordinary prose that wraps. ".repeat(40)}\n`;
  const mm = (n: number) => (n * 72) / 25.4;

  it("reserves the rail only when the document uses it", async () => {
    // A4 is 210mm; left margin 22mm. Rail: right margin 62mm. None: 48mm.
    const withRail = await rightEdge(`:::margin\nSide note.\n:::\n\n${prose}`);
    const without = await rightEdge(prose);
    expect(without).toBeGreaterThan(mm(210 - 62) + 5);
    expect(without).toBeLessThanOrEqual(mm(210 - 48) + 1);
    // With the rail the note itself sits in the rail, so only check the
    // body column didn't widen past the rail's outer edge.
    expect(withRail).toBeLessThanOrEqual(mm(210 - 22) + 1);
  });

  it("honours --margin-right", async () => {
    const edge = await rightEdge(prose, { margins: { right: "50mm" } });
    expect(edge).toBeLessThanOrEqual(mm(210 - 50 - 26) + 1);
    expect(edge).toBeGreaterThan(mm(210 - 50 - 26) - 20);
  });

  it("sizes table columns to their content", async () => {
    // A one-character column next to a prose column: the fixed per-count
    // weights gave "#" the widest share and squeezed the prose.
    const prose = "a long explanation that needs most of the line to avoid wrapping";
    const rows = Array.from({ length: 4 }, (_, i) => `| ${i} | Label ${i} | ${prose} |`).join("\n");
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-cols-"));
    try {
      await writeFile(join(dir, "doc.md"), `| # | Pattern | Rule |\n|---|---|---|\n${rows}\n`, "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf") });
      const html = spawnSync("pdftotext", ["-bbox", join(dir, "doc.pdf"), "-"], { encoding: "utf8" }).stdout;
      const xMin = (word: string) => Number(new RegExp(`xMin="([\\d.]+)"[^>]*>${word}<`).exec(html)![1]);
      const hash = xMin("#");
      const pattern = xMin("Pattern");
      const rule = xMin("Rule");
      // "#" column narrower than "Pattern", which is narrower than the room left for "Rule".
      expect(pattern - hash).toBeLessThan(rule - pattern);
      expect(pattern - hash).toBeLessThan(40);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("renders reference-style links instead of dropping them", async () => {
    const text = await render("Read [the spec][spec] and [spec] today.\n\n[spec]: https://example.com\n");
    expect(text).toContain("Read the spec and spec today.");
  });
});
