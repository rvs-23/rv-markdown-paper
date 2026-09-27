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
});
