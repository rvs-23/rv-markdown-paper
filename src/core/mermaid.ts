import { execFile, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { Code, Nodes, Root } from "mdast";
import { FONTS_DIR } from "../typst/render.js";

const execFileAsync = promisify(execFile);

// Mermaid's neutral theme keeps a diagram in the page's one ink. Labels
// are plain SVG text, not HTML, which Typst can't draw, and are laid out
// in Archivo, the face Typst then sets them in.
const CONFIG = {
  theme: "neutral",
  htmlLabels: false,
  flowchart: { htmlLabels: false },
  themeVariables: { fontFamily: "Archivo" },
};

/** What the generator needs to set a drawn diagram. */
export type MermaidDrawing = { svg: string; widthPt: number };

/**
 * Draws every ```mermaid block as a diagram, using mermaid-cli.
 *
 * mermaid-cli (`mmdc`) runs a headless browser, so it is not a dependency.
 * When it isn't installed, diagrams print as code and a warning says how
 * to install it. A drawn block keeps its source and gains the SVG in
 * `data.mermaid`, which the generator sets as a figure. All diagrams are
 * drawn in one run, because each run starts a browser.
 *
 * Args:
 *   tree: The parsed document.
 *
 * Throws:
 *   Error: When mermaid-cli fails on a diagram, with its message.
 */
export async function drawMermaid(tree: Root): Promise<void> {
  const blocks: Code[] = [];
  const collect = (node: Nodes): void => {
    if (node.type === "code" && node.lang === "mermaid") blocks.push(node);
    if ("children" in node) node.children.forEach(collect);
  };
  collect(tree);
  if (blocks.length === 0) return;

  if (spawnSync("mmdc", ["--version"], { stdio: "ignore" }).status !== 0) {
    const count = blocks.length === 1 ? "1 Mermaid diagram" : `${blocks.length} Mermaid diagrams`;
    console.warn(`mdpdf: ${count} printed as code. To draw them, install mermaid-cli: brew install mermaid-cli`);
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), "mdpdf-mermaid-"));
  try {
    const font = pathToFileURL(join(FONTS_DIR, "Archivo-Regular.ttf")).href;
    await writeFile(join(dir, "config.json"), JSON.stringify(CONFIG));
    await writeFile(join(dir, "font.css"), `@font-face { font-family: "Archivo"; src: url("${font}"); }\n`);
    const markdown = blocks.map((b) => `\`\`\`mermaid\n${b.value}\n\`\`\`\n`).join("\n");
    await writeFile(join(dir, "in.md"), markdown);
    try {
      await execFileAsync(
        "mmdc",
        ["-i", "in.md", "-o", "out.md", "-e", "svg", "-c", "config.json", "-C", "font.css", "-b", "transparent", "-q"],
        { cwd: dir },
      );
    } catch (err) {
      const { stdout = "", stderr = "" } = err as { stdout?: string; stderr?: string };
      throw new Error(`A Mermaid diagram failed to draw:\n${mermaidMessage(`${stderr}\n${stdout}`)}`);
    }
    for (const [i, block] of blocks.entries()) {
      const svg = await readFile(join(dir, `out-${i + 1}.svg`), "utf8");
      block.data = { ...block.data, mermaid: { svg, widthPt: naturalWidth(svg) } } as Code["data"];
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// The SVG's own width, from Mermaid's `max-width: 547.5px`, in points.
function naturalWidth(svg: string): number {
  const px = /max-width:\s*([\d.]+)px/.exec(svg)?.[1];
  return px ? Number(px) * 0.75 : 400;
}

// mmdc follows its error with a long browser stack trace; keep the message.
function mermaidMessage(output: string): string {
  const lines = output.split("\n");
  const start = lines.findIndex((l) => l.startsWith("Error:"));
  const message = start < 0 ? lines : lines.slice(start);
  const end = message.findIndex((l) => /^\s*at |\(https?:|\(file:/.test(l));
  return (end < 0 ? message : message.slice(0, end)).join("\n").replace(/^Error:\s*/, "").trim();
}
