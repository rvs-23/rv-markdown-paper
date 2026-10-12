import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { chmod, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { convertMarkdownToPdf } from "../src/core/convert.js";
import type { DocumentOptionsLayer } from "../src/config/options.js";
import { hasTools, pdfText } from "./helpers.js";

// Markdown the canonical fixture doesn't exercise. Each case renders a
// small document end-to-end and asserts on the extracted PDF text, so a
// case fails both when Typst refuses to compile and when it compiles but
// renders the wrong thing.

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
    // Collapse whitespace so assertions don't depend on line wrapping,
    // unless the case needs to see indentation.
    return layout ? pdfText(output, ["-layout"]) : pdfText(output).replace(/\s+/g, " ");
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

  // Top-left pixel of page 1 at 10 dpi, as [r, g, b].
  async function paperPixel(markdown: string, cli: DocumentOptionsLayer = {}): Promise<number[]> {
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-bg-"));
    try {
      await writeFile(join(dir, "doc.md"), markdown, "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf"), cli });
      const r = spawnSync("pdftoppm", ["-r", "10", "-singlefile", join(dir, "doc.pdf")], {
        maxBuffer: 1 << 24,
      });
      // Binary PPM: four whitespace-terminated header fields, then pixels.
      const ppm = r.stdout as Buffer;
      let offset = 0;
      for (let fields = 0; fields < 4; offset++) {
        if (/\s/.test(String.fromCharCode(ppm[offset]!))) fields++;
      }
      return [...ppm.subarray(offset, offset + 3)];
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("paints the page with --paper-bg", async () => {
    expect(await paperPixel("Hello.\n", { paperBg: "#FFE0C0" })).toEqual([0xff, 0xe0, 0xc0]);
  });

  it("paints the page with a named paper preset from frontmatter", async () => {
    expect(await paperPixel("---\npaperBg: Parchment\n---\nHello.\n")).toEqual([0xf5, 0xee, 0xdd]);
    expect(await paperPixel("---\npaperBg: glacier\n---\nHello.\n")).toEqual([0xfa, 0xfb, 0xfc]);
  });

  it("renders bold and italic that start inside a word", async () => {
    const text = await render("oota**kke** = for the meal; un*believ*able.\n");
    expect(text).toContain("ootakke = for the meal; unbelievable.");
  });

  it("renders Devanagari, Bengali, Kannada, Telugu and emoji through the bundled fallbacks", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-scripts-"));
    try {
      await writeFile(join(dir, "doc.md"), "Hindi नमस्ते, Bengali বাংলা, Kannada ಕನ್ನಡ, Telugu తెలుగు, ok ✅\n", "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf") });
      const fonts = spawnSync("pdffonts", [join(dir, "doc.pdf")], { encoding: "utf8" }).stdout;
      expect(fonts).toContain("NotoSansDevanagari");
      expect(fonts).toContain("NotoSansKannada");
      expect(fonts).toContain("NotoSansTelugu");
      expect(fonts).toContain("NotoSansBengali");
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
      const html = pdfText(join(dir, "doc.pdf"), ["-bbox", "-f", "1", "-l", "1"]);
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
      const html = pdfText(join(dir, "doc.pdf"), ["-bbox"]);
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

  // Header line and footer line of a page, from pdftotext -layout.
  async function chrome(markdown: string, page: number, cli: DocumentOptionsLayer = {}) {
    const text = (await render(markdown, cli, true)).split("\f")[page - 1]!;
    const lines = text.split("\n").filter((l) => l.trim() !== "");
    return { header: lines[0]!.trim(), footer: lines.at(-1)!.replace(/\s+/g, " ").trim() };
  }
  const longBody = `${"Plenty of prose to fill the page and run onto the next one. ".repeat(120)}\n`;

  it("keeps the section number out of the running header", async () => {
    // The big rail numeral already shows 7.1; the header used to repeat
    // it, so the page carried two "7.1" words. Now only the rail's.
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-header-"));
    try {
      const md = `---\nsection: "Notes"\n---\n## 7.1 · Threads {#sec-a}\n\n${longBody}`;
      await writeFile(join(dir, "doc.md"), md, "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf") });
      const html = pdfText(join(dir, "doc.pdf"), ["-bbox", "-f", "2", "-l", "2"]);
      expect(html.match(/>7\.1</g)).toHaveLength(1);
      expect(html).toContain(">Notes<");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("signs the footer with the author's first name", async () => {
    const md = `---\nauthor: "Rishav Sharma"\n---\n${longBody}`;
    expect((await chrome(md, 1)).footer).toBe("AUTHOR · RISHAV 001");
    expect((await chrome(md, 1, { author: "Rv" })).footer).toBe("AUTHOR · RV 001");
  });

  it("leaves the signature out with --no-author, showAuthor: false, or no author", async () => {
    const md = `---\nauthor: "Rishav Sharma"\n---\n${longBody}`;
    expect((await chrome(md, 1, { showAuthor: false })).footer).toBe("001");
    expect((await chrome(`---\nauthor: "Rishav"\nshowAuthor: false\n---\n${longBody}`, 1)).footer).toBe("001");
    expect((await chrome(longBody, 1)).footer).toBe("001");
  });

  it("validates library overrides like frontmatter", async () => {
    // Preset names resolve for library callers too, not only on the CLI.
    expect(await paperPixel("Hello.\n", { paperBg: "parchment" })).toEqual([0xf5, 0xee, 0xdd]);
    // A bad value is a ConfigError naming the field, not raw Typst code.
    const bad = { showHeader: "yes" } as unknown as DocumentOptionsLayer;
    await expect(render("Hello.\n", bad)).rejects.toThrow("cli.showHeader: expected true or false");
    const typo = { papperBg: "parchment" } as unknown as DocumentOptionsLayer;
    await expect(render("Hello.\n", typo)).rejects.toThrow('cli.papperBg: unknown option. Did you mean "paperBg"?');
  });

  it("adds no comma to a cover title that has none", async () => {
    const cover = (title: string) => render(`---\ncover:\n  title: "${title}"\n---\nBody.\n`);
    expect(await cover("Thread pools")).toMatch(/^Thread pools (?!,)/);
    expect(await cover("Thread pools | made plain")).toContain("Thread pools made plain");
    // With a comma, the head keeps it and the tail follows.
    expect(await cover("Thread pools, or a bounded crew.")).toContain("Thread pools, or a bounded crew.");
  });

  it("falls back to the title in the running header", async () => {
    // With no chapter, part or section, page 2's header used to be empty.
    const md = `---\ntitle: "Thread pools"\n---\n${longBody}`;
    expect((await chrome(md, 2)).header).toBe("Thread pools");
    // A section still wins over the title.
    const withSection = `---\ntitle: "Thread pools"\nsection: "Notes"\n---\n${longBody}`;
    expect((await chrome(withSection, 2)).header).toBe("Notes");
  });

  // The watermark's letters, per page. pdftotext extracts the rotated,
  // tracked letters one at a time and out of order, so pick out the tall
  // boxes (far larger than any body text) and read them left to right.
  async function watermarks(markdown: string, cli: DocumentOptionsLayer = {}): Promise<string[]> {
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-wm-"));
    try {
      await writeFile(join(dir, "doc.md"), markdown, "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf"), cli });
      const pages = pdfText(join(dir, "doc.pdf"), ["-bbox"]).split("<page ").slice(1);
      return pages.map((page) =>
        [...page.matchAll(/xMin="([\d.]+)" yMin="([\d.]+)" xMax="[\d.]+" yMax="([\d.]+)">([^<]+)</g)]
          .filter((m) => Number(m[3]) - Number(m[2]) > 60)
          .sort((a, b) => Number(a[1]) - Number(b[1]))
          .map((m) => m[4])
          .join(""),
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("sets a watermark on every page, and none by default", async () => {
    const marked = await watermarks(longBody, { watermark: "Draft" });
    expect(marked.length).toBeGreaterThan(1);
    expect(new Set(marked)).toEqual(new Set(["DRAFT"]));
    // Frontmatter works too; without the option nothing is added.
    expect(await watermarks(`---\nwatermark: "Draft"\n---\nHello.\n`)).toEqual(["DRAFT"]);
    expect(await watermarks("Hello.\n")).toEqual([""]);
  });

  it("keeps the text after a colon in prose and tables", async () => {
    const text = await render("Lunch 5:45–6:15, then 8:15 onward.\n\n| When | What |\n|---|---|\n| 8:00 | Arrive |\n");
    expect(text).toContain("Lunch 5:45–6:15, then 8:15 onward.");
    expect(text).toContain("8:00");
  });

  it("leaves a paragraph's worth of space below a list", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-list-"));
    try {
      const md = "Alpha one.\n\nBravo two.\n\n- Charlie\n- Delta\n\nEcho three.\n";
      await writeFile(join(dir, "doc.md"), md, "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf") });
      const html = pdfText(join(dir, "doc.pdf"), ["-bbox"]);
      const yMin = (word: string) => Number(new RegExp(`yMin="([\\d.]+)"[^>]*>${word}<`).exec(html)![1]);
      // A tight list's gap once collapsed to plain line spacing.
      const paragraphGap = yMin("Bravo") - yMin("Alpha");
      expect(yMin("Echo") - yMin("Delta")).toBeGreaterThanOrEqual(paragraphGap - 0.5);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("moves a tall margin note to the next page with its anchor", async () => {
    // The note used to stay behind beside the page foot and run off it,
    // while the table it belongs to moved on.
    const para = "The fabric should drape cleanly from the waist without pulling at the seams. ".repeat(3);
    const note = Array.from({ length: 30 }, (_, i) => `Noteline${i}`).join("\n\n");
    const rows = Array.from({ length: 6 }, (_, i) => `| Row${i} | Specification ${i} |`).join("\n");
    const md = `${Array(9).fill(para).join("\n\n")}\n\n:::margin\n${note}\n:::\n\n| Element | Spec |\n|---|---|\n${rows}\n`;
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-marg-"));
    try {
      await writeFile(join(dir, "doc.md"), md, "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf") });
      const pages = pdfText(join(dir, "doc.pdf")).split("\f");
      const pageOf = (word: string) => pages.findIndex((p) => p.includes(word));
      expect(pageOf("Noteline0")).toBe(pageOf("Row0"));
      expect(pageOf("Noteline29")).toBe(pageOf("Row0"));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps an image inside a sentence on its line", async () => {
    // A bare Typst image ended the line, so "after" wrapped below it.
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-inline-"));
    try {
      // A 1x1 PNG.
      const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      await writeFile(join(dir, "dot.png"), Buffer.from(png, "base64"));
      await writeFile(join(dir, "doc.md"), "Before ![](dot.png){height=8pt} after.\n", "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf") });
      const html = pdfText(join(dir, "doc.pdf"), ["-bbox"]);
      const yMin = (word: string) => Number(new RegExp(`yMin="([\\d.]+)"[^>]*>${word}<`).exec(html)![1]);
      expect(yMin("after.")).toBeCloseTo(yMin("Before"), 0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  // Word boxes from pdftotext -bbox, for checking where text landed.
  async function wordBoxes(markdown: string): Promise<Array<{ word: string; xMin: number; xMax: number; yMin: number }>> {
    const dir = await mkdtemp(join(tmpdir(), "mdpdf-box-"));
    try {
      await writeFile(join(dir, "doc.md"), markdown, "utf8");
      await convertMarkdownToPdf({ inputPath: join(dir, "doc.md"), outputPath: join(dir, "doc.pdf") });
      const html = pdfText(join(dir, "doc.pdf"), ["-bbox"]);
      return [...html.matchAll(/xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)"[^>]*>([^<]*)</g)].map((m) => ({
        word: m[4]!,
        xMin: Number(m[1]),
        yMin: Number(m[2]),
        xMax: Number(m[3]),
      }));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }

  it("wraps a code line too long for its panel inside the panel, under its indent", async () => {
    // An unbreakable ID ran out of the panel, and a wrapped indented line
    // restarted at the panel's left edge.
    const id = "ri.foundry.main.dataset.3db1ce53-2dfb-4879-98b0-7727c128db65";
    const md = `Intro.\n\n\`\`\`python\nf(\n    readings=Input("${id}"),\n)\n\`\`\`\n`;
    const words = await wordBoxes(md);
    const start = words.find((w) => w.word.startsWith("readings"))!;
    const code = words.filter((w) => Math.abs(w.yMin - start.yMin) < 40);
    // No code runs past the panel, which ends 12pt inside the column:
    // A4 210mm less the 48mm right margin.
    const panelRight = ((210 - 48) * 72) / 25.4 - 12;
    expect(Math.max(...code.map((w) => w.xMax))).toBeLessThan(panelRight + 0.5);
    // The line wrapped, and its continuation sits right of where it began.
    const rest = code.filter((w) => w.yMin > start.yMin + 1 && w.word !== ")");
    expect(rest.length).toBeGreaterThan(0);
    expect(rest[0]!.xMin).toBeGreaterThan(start.xMin);
  });

  it("shrinks a display equation wider than the column so its number stays clear", async () => {
    const md =
      "Intro.\n\n$$\n\\text{compute-seconds} = \\text{compute units} \\times \\text{seconds} \\times \\text{product rate} \\times \\text{factor}\n$$\n";
    const words = await wordBoxes(md);
    const number = words.find((w) => w.word === "(1)")!;
    const last = words.find((w) => w.word === "factor")!;
    expect(last.xMax).toBeLessThan(number.xMin);
  });
});
