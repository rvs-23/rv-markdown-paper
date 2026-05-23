# rv-markdown-paper

## Overview

`rv-markdown-paper` turns a Markdown file into a print-quality PDF that follows a fixed editorial design system — neutral-gray paper, single-ink type ramp, three-font system (Archivo body / Instrument Serif italic ornament / JetBrains Mono code), no user-pickable accent colors. The pipeline is:

```
input.md  →  mdast (remark)  →  Typst source  →  PDF (typst compile)
```

The design language is non-negotiable on purpose. Authors write content; the template does the rest. The same Markdown produces the same PDF on every machine because fonts are bundled and Typst runs with `--ignore-system-fonts`.

The intended use case is long-form editorial content — chapters of a book, essay collections, technical documentation that wants to feel like a printed page rather than a website.

## Getting Started

**Prerequisites:** Node.js ≥ 20 and the Typst CLI (≥ 0.12).

```bash
# macOS — both via Homebrew
brew install node typst

# verify
node --version
typst --version
```

**Install and run:**

```bash
git clone https://github.com/rvs-23/rv-markdown-paper.git
cd rv-markdown-paper
npm install

# render one of the bundled demos
npm run mdpdf -- examples/demos/01-hello.md output/01-hello.pdf

# render the canonical fixture
npm run mdpdf -- examples/editorial-swiss/paper.md examples/editorial-swiss/output.pdf
```

The canonical fixture (`examples/editorial-swiss/paper.md`) exercises every supported feature; compare its `output.pdf` against the `mockup.pdf` (browser print of `mockup.html`, the visual design spec) to see what the system is aiming for.

## CLI Usage

```bash
npm run mdpdf -- <input.md> <output.pdf> [flags]
```

| Flag | Argument | Effect |
|---|---|---|
| `--title` | text | Document title (overrides frontmatter) |
| `--subtitle` | text | Subtitle / deck under the title |
| `--section` | text | Kicker above the title, e.g. `LESSON 03` |
| `--author` | text | Document author |
| `--date` | text | Document date |
| `--reading-time` | text | Reading time, e.g. `"14 min"` (auto-estimated if omitted) |
| `--page-size` | `Letter` \| `A4` | Page size — default `A4` |
| `--margin-top` | CSS length | Top margin (`24mm`, `0.85in`, `72pt`) |
| `--margin-right` | CSS length | Right margin |
| `--margin-bottom` | CSS length | Bottom margin |
| `--margin-left` | CSS length | Left margin |
| `--paper-bg` | `#RRGGBB` | Page background; surface, hairline, and danger-foreground derive from it automatically |
| `--no-header` | — | Hide the running header |
| `--no-footer` | — | Hide the running footer |
| `--no-cover` | — | Skip the dedicated cover page (title block goes inline) |
| `--config` | path | Explicit `mdpdf.config.json` path (skips upward search) |

CSS length units accepted: `in`, `cm`, `mm`, `pt`, `px`.

## Library Usage

The package also ships a small library API for embedding the converter in other Node tools — pipelines that fan out many documents, CMS export jobs, build scripts, etc. After `npm install rv-markdown-paper`, import `convertMarkdownToPdf`:

```ts
import { convertMarkdownToPdf } from "rv-markdown-paper";

await convertMarkdownToPdf({
  inputPath:  "docs/chapter-07.md",
  outputPath: "out/chapter-07.pdf",
});
```

That's the minimum viable call: read a Markdown file, write a PDF. Everything else (frontmatter, project config, defaults) is resolved automatically using the same precedence chain as the CLI.

### Override options programmatically

The `cli` field on `ConvertOptions` accepts any partial of the document option layer — same shape as frontmatter. CLI-equivalent values land here, so anything from the [CLI Usage](#cli-usage) table is settable in code:

```ts
import { convertMarkdownToPdf } from "rv-markdown-paper";

await convertMarkdownToPdf({
  inputPath:  "docs/chapter-07.md",
  outputPath: "out/chapter-07.pdf",
  cli: {
    title: "Thread pools",
    pageSize: "Letter",
    paperBg: "#E8E8E8",
    showCover: false,
    margins: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
  },
});
```

These programmatic values override frontmatter and project config, matching CLI precedence (CLI > frontmatter > project > defaults).

### Use an explicit config file

By default the loader walks up from the input file's directory looking for an `mdpdf.config.json`. To bypass the search and load a specific file:

```ts
await convertMarkdownToPdf({
  inputPath:  "docs/chapter-07.md",
  outputPath: "out/chapter-07.pdf",
  configPath: "./build/print.config.json",
});
```

A missing file at the given path throws — explicit paths are user errors, unlike the upward search which silently returns null when nothing is found.

### Batch render

Nothing about the converter is stateful between calls, so concurrent renders are safe:

```ts
import { convertMarkdownToPdf } from "rv-markdown-paper";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const files = (await readdir("docs")).filter((f) => f.endsWith(".md"));

await Promise.all(
  files.map((f) =>
    convertMarkdownToPdf({
      inputPath:  join("docs", f),
      outputPath: join("out", f.replace(/\.md$/, ".pdf")),
    }),
  ),
);
```

Typst is the bottleneck — each render spawns a `typst compile` subprocess that takes ~100 ms per page. For very large batches, throttle concurrency to your CPU count.

### TypeScript types

All public types are exported:

```ts
import type {
  ConvertOptions,
  DocumentOptions,
  DocumentOptionsLayer,
  Cover,
  MetaPair,
  TocEntry,
  Margins,
} from "rv-markdown-paper";
```

| Type | Shape |
|---|---|
| `ConvertOptions` | `{ inputPath, outputPath, cli?, configPath? }` |
| `DocumentOptionsLayer` | Partial of all resolvable fields — same as YAML frontmatter |
| `Cover` | `{ kicker?, title?, subtitle?, meta?, toc? }` |
| `MetaPair` | `{ label, value }` — one cell of the cover meta row |
| `TocEntry` | `{ id, title, ref?, page? }` — one row of the cover TOC |
| `Margins` | `{ top, right, bottom, left }` — CSS length strings |

### Errors

`convertMarkdownToPdf` rejects (never throws synchronously) on:

- Input file missing or unreadable
- Frontmatter / config validation failures (`ConfigError` — message names the offending field)
- Invalid attribute IDs in the Markdown source (e.g. `{#bad>id}` — fail-fast at parse time)
- Image paths escaping the source directory, or remote/data URIs
- Typst compile errors (the binary's stderr is bubbled up, tail-buffered to 64 KB)

Catch them with normal `try/await`:

```ts
try {
  await convertMarkdownToPdf({ inputPath, outputPath });
} catch (err) {
  console.error("render failed:", err);
  process.exit(1);
}
```

### Runtime prerequisites

The library shells out to `typst compile`, so the consuming process needs the Typst binary on `PATH` at run time (same requirement as the CLI). Bundled fonts ship inside the published package; nothing else needs to be installed.

## Configuration Precedence

Options resolve in this order — first match wins:

1. **CLI flags**
2. **Frontmatter** (YAML at the top of the Markdown file)
3. **`mdpdf.config.json`** (searched upward from the input file's directory; or pass `--config <path>`)
4. **Built-in defaults**

This lets you set a baseline in `mdpdf.config.json`, override per-document in frontmatter, and override per-render on the command line.

**Minimal frontmatter:**

```yaml
---
title: "Thread Pools"
subtitle: "Or how to share a bounded crew."
author: "Rishav Sharma"
date: "2026-04-20"
pageSize: "A4"
showHeader: true
showFooter: true
showCover: true
paperBg: "#E8E8E8"
---
```

**Full frontmatter** (every supported field):

```yaml
---
# document chrome
title: "Thread Pools"
subtitle: "Or how to share a bounded crew."
section: "Chapter 07"
author: "Rishav Sharma"
date: "2026-04-20"
readingTime: "75 min read"

# editorial-book fields
chapter: 7
part: "Two"
edition: "Edition 2 · 2026"
volume: "Volume I"
pageStart: 85
pageEnd: 98

# layout
pageSize: "A4"
margins: { top: "24mm", right: "22mm", bottom: "22mm", left: "22mm" }
showHeader: true
showFooter: true
showCover: true
paperBg: "#E8E8E8"

# dedicated cover (optional — when set, the cover replaces the editorial title block)
cover:
  kicker: "Part Two · Chapter 07"
  title: "Thread pools, or how to share a bounded crew."
  subtitle: "From `threading.Thread` to `concurrent.futures` — when a pool helps."
  meta:
    - { label: "Topic",    value: "Thread pools & futures" }
    - { label: "Language", value: "Python 3.12" }
    - { label: "Runtime",  value: "75 min read" }
  toc:
    - { id: "7.1", title: "Threads & the GIL",       ref: "sec-threads-gil", page: "086" }
    - { id: "7.2", title: "What a pool actually is", ref: "sec-pool-is",     page: "088" }
---
```

## Feature Support

The parser accepts GitHub-flavored Markdown plus a small, deliberate set of Pandoc-dialect extensions: `{#id .class key=value}` attribute bundles, `:::name`-style fenced divs, math, and definition lists.

### Quick reference

| Feature | Markdown syntax | Renders as |
|---|---|---|
| Heading + label | `## Section {#sec-intro}` | Tracked uppercase eyebrow + hairline rule (H2 maps to section marker, H3 is the display heading at 21pt) |
| Bold | `**text**` | Archivo 600 |
| Italic | `*text*` | Archivo Italic (body italic stays sans — Instrument Serif italic is reserved for ornament) |
| Strikethrough | `~~text~~` | Muted ink + strike |
| Inline code | `` `code` `` | JetBrains Mono on a surface-fill chip |
| Link | `[text](url)` | Underlined hairline |
| Footnote | `text[^1]` + `[^1]: body` | Native Typst footnote at page bottom |
| Unordered list | `- item` | Dash bullet |
| Ordered list | `1. item` | Numeric counter |
| Task list | `- [x] done` / `- [ ] todo` | Ink-bordered checkbox; checked is ink-filled with paper-colored tick + muted body |
| Definition list | `Term`\n`:   definition` | 2-col grid with hairline-bordered rows |
| Blockquote | `> ...` | Hairline left rule, Instrument Serif italic body |
| Pull quote | `:::epigraph` … `:::` | Hairline top + bottom rules, italic-serif body |
| Table | GFM pipe syntax | First column sans, mono tabular body, zebra-stripe, ragged-right |
| Code block | ` ```lang ` fence | Surface-fill panel, mono body, syntax-highlighted in the grayscale theme |
| Code block + filename | `` ```python {filename="x.py" lang-label="Python 3.12"} `` | Adds a header strip above the panel with filename L, lang-label R |
| Figure | `![caption](path)` | Image + hairline-divided caption with italic-serif `Fig. N.M` lead |
| Figure cross-ref | `![cap](p){#fig:x}` + `[@fig:x]` | Resolves to "Fig. N.M" inline |
| Inline math | `$x^2$` | Native Typst math |
| Display math | `$$ N = \lambda \cdot W $$ {#eq:y}` | Centered with hairline frame; `[@eq:y]` resolves to `(N.M)` |
| Note callout | `:::note` … `:::` | Surface fill, ink-3 left rule, tracked label |
| Tip callout | `:::tip` … `:::` | Surface fill, full-ink 2pt left rule |
| Warning callout | `:::warning` … `:::` | Warmer surface, ink-2 left rule, hairline top + bottom |
| Danger callout | `:::danger` … `:::` | Ink-fill block, paper-colored text — the only inversion in the system |
| Eyebrow label | `:::eyebrow` … `:::` | 9pt tracked uppercase ink-3 |
| Dropcap paragraph | `:::dropcap` … `:::` | First grapheme as 52pt italic-serif, floated left |
| Exercise box | `:::{.exbox number="01" tag="Warm-up"}` … `:::` | Hairline top, 32pt italic-serif numeral, sans tracked tag right |
| Marginalia | `:::{.margin label="..."}` … `:::` | Right-rail note auto-aligned to its anchor paragraph |
| Page-break opt-in | `## Section {.pagebreak}` | Forces the section onto a fresh page |
| Chapter opener | `## Heading {#chapter-opener}` | Structural — page-isolates the dropcap intro and suppresses the running header on that page |

Every feature listed here is exercised by the canonical fixture at [`examples/editorial-swiss/paper.md`](examples/editorial-swiss/paper.md). Open it side-by-side with the [`output.pdf`](examples/editorial-swiss/output.pdf) (or the design target [`mockup.pdf`](examples/editorial-swiss/mockup.pdf)) to see each in context.

### Examples

| Path | Demonstrates |
|---|---|
| [`examples/demos/01-hello.md`](examples/demos/01-hello.md) | Minimum viable page — just the type system |
| [`examples/demos/02-typography.md`](examples/demos/02-typography.md) | Headings, emphasis, blockquote, links, rule |
| [`examples/demos/03-structured.md`](examples/demos/03-structured.md) | Ordered/nested/task lists + table |
| [`examples/demos/04-code.md`](examples/demos/04-code.md) | Grayscale syntax across TypeScript / Python / Bash |
| [`examples/demos/05-admonitions.md`](examples/demos/05-admonitions.md) | All four callout flavours, stacked |
| [`examples/demos/06-full-paper.md`](examples/demos/06-full-paper.md) | A small essay using callouts, figure, lists, code |
| [`examples/demos/07-oversized-admonition.md`](examples/demos/07-oversized-admonition.md) | Regression fixture for `breakable: false` admonitions |
| [`examples/editorial-swiss/`](examples/editorial-swiss/) | Canonical chapter fixture — `paper.md` source, `output.pdf` render, `mockup.html`/`mockup.pdf` visual target, `figures/` assets |

## Technical Details

### Stack used

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 20, TypeScript with strict typing |
| CLI | [`commander`](https://github.com/tj/commander.js) |
| YAML | [`gray-matter`](https://github.com/jonschlinkert/gray-matter) |
| Markdown parse | [`unified`](https://unifiedjs.com/) + `remark-parse` + `remark-gfm` + `remark-directive` + `remark-math` + `remark-definition-list` |
| Typesetting | [Typst](https://typst.app/) compiler (external binary on `PATH`) |
| Code highlighting | Typst's built-in syntect highlighter, driven by the bundled [`theme.tmTheme`](src/typst/theme.tmTheme) (grayscale only) |
| Fonts | Archivo (sans), Instrument Serif (ornament italic), JetBrains Mono (code) — all OFL-1.1, bundled in [`assets/fonts/`](assets/fonts/) and loaded with `--ignore-system-fonts` |
| Tests | [`vitest`](https://vitest.dev/), with a render integration test that compiles the canonical fixture and asserts page count |
| Lint / Types | `eslint` (flat config), `tsc --noEmit` |
| CI | GitHub Actions — typecheck + lint + test + build on every push and PR ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) |

### Pipeline

```
src/
  cli/         Commander entry, flag validation
  config/      Options types, precedence resolver, validator
  core/        Pipeline orchestrator + reading-time estimator
  parser/      Frontmatter split, Markdown → mdast, Pandoc-attribute lift
  typst/       Palette tokens, design template, mdast → Typst generator,
               typst-compile subprocess runner
```

The four pipeline stages live in [`src/core/convert.ts`](src/core/convert.ts):

1. **Frontmatter** — `gray-matter` splits YAML off the top.
2. **Parse** — Markdown → mdast via the remark plugin chain. A pre-parse pass normalises Pandoc-dialect surface forms (`::: name`, `:::{.class}`, attribute colons) so the canonical fixture parses without invoking Pandoc.
3. **Generate** — [`src/typst/generate.ts`](src/typst/generate.ts) walks the mdast and emits Typst directly. Footnotes are pre-collected and inlined at reference sites; cross-references degrade to plain text when unresolved; LaTeX math symbols map to Typst equivalents.
4. **Compile** — [`src/typst/render.ts`](src/typst/render.ts) writes the generated body alongside [`template.typ`](src/typst/template.typ), [`palette.typ`](src/typst/palette.typ), and [`theme.tmTheme`](src/typst/theme.tmTheme) into a temp directory, then spawns `typst compile` with `--root <sourceDir>`, `--font-path assets/fonts`, and `--ignore-system-fonts`.

### Design principles

1. **One design language, no themes.** The output looks the same on every machine and from every author. There is no theme registry, no accent palette, no light/dark toggle.
2. **Single-ink ramp.** Body is `#11131A` near-ink on a `#E8E8E8` paper. Secondary text steps through ink-2 / ink-3 / muted / mute-2 — five levels of the same gray. The only color event in the whole system is the `:::danger` admonition, which inverts to paper-on-ink. Color inversion is reserved precisely because nothing else inverts.
3. **Three fonts, one rule per font.** Archivo for body, UI, headings, captions, tables, admonitions. Instrument Serif **italic only**, ornament only — folio, dropcap, pull quotes, equation numbers, figcaption labels. JetBrains Mono for code and tabular numerics. Body italic stays in the Archivo family; the serif italic is too loud for prose.
4. **The template is the design.** The TypeScript pipeline only emits semantic markup; every visual decision lives in [`src/typst/template.typ`](src/typst/template.typ). To restyle the system you edit the template, not the converter.
5. **Deterministic output.** Bundled fonts loaded with `--ignore-system-fonts` mean a Typst version + this repo = byte-identical PDFs across machines. Mismatched system fonts cannot silently substitute.
6. **Fail loud.** Invalid attribute IDs throw at parse time. Remote image URLs are rejected before reaching the compiler. Missing fonts surface as a Typst error, not a silent substitution. The principle: errors with clear messages beat silent drift.
7. **Page count is a contract.** The integration test renders the canonical fixture and asserts it compiles to exactly 6 pages. Page choreography regressions fail CI.

### Security posture

- Image paths must resolve inside the source markdown's directory tree; remote URLs, `data:` URIs, absolute paths, and `..`-escapes are rejected at generate time.
- Typst runs with `--root <sourceDir>` so the compiler cannot read files outside the document tree.
- Attribute IDs validate against `^[A-Za-z][A-Za-z0-9_:-]*$`; anything outside the grammar throws `ConfigError` before any Typst is generated, closing a label-injection path.
- Typst stderr is tail-buffered to 64 KB so a runaway compile can't exhaust memory.

### Development

```bash
npm run mdpdf    # render via tsx (no build step)
npm run test     # vitest — unit + render integration
npm run typecheck
npm run lint
npm run build    # tsc + asset copy → dist/
```

When you change the rendering path (template, generator, render.ts, fonts, palette), re-render every committed PDF in the same commit:

```bash
for md in examples/demos/*.md; do
  npm run mdpdf -- "$md" "${md%.md}.pdf"
done
npm run mdpdf -- examples/editorial-swiss/paper.md examples/editorial-swiss/output.pdf
```

The committed PDFs are the visual regression surface; they only have value when they all reflect the same pipeline state.

### Distribution

The package builds to `dist/` and exposes both a CLI (`bin: { "mdpdf": ... }`) and a library entry (`exports`). After `npm install rv-markdown-paper` you get the `mdpdf` binary on your `PATH` and can `import { convertMarkdownToPdf } from "rv-markdown-paper"` — see [Library Usage](#library-usage) for the full API.

## AI stack used for development

This project was built and is maintained as a collaboration with Claude Code — primarily Claude Opus 4.7 (1M-context) running in the terminal CLI. The AI was used end-to-end: design discussion, implementation, refactors, debugging, test authoring, and writing this README.

External quality control: independent code reviews by Claude (Opus 4.7) and the OpenAI Codex agent. Both reviews live in the author's notes and drove a multi-commit cleanup pass — captured in commit history under `Visual cleanup pass`, `Harden …`, `Add render-integration test`, and `Package as installable CLI + library`.

Human review of every commit before push. No code lands without the author reading the diff. AI is the operator, not the decider.

## License

MIT
