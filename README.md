# rv-markdown-paper

`rv-markdown-paper` converts Markdown into print-quality PDF using a fixed Editorial+Swiss design system built on Typst. The converter accepts GFM plus Pandoc-style attributes/directives, resolves document options from CLI/frontmatter/project config, generates Typst from mdast, and compiles with bundled fonts (`Archivo`, `Instrument Serif`, `JetBrains Mono`) so output is deterministic across machines.

## Getting Started

1. Install runtime prerequisites.

```bash
node --version
typst --version
```

Install `Node.js >= 20` and install Typst if needed:

```bash
brew install typst
```

2. Install project dependencies.

```bash
git clone https://github.com/rvs-23/rv-markdown-paper.git
cd rv-markdown-paper
npm install
```

3. Run one conversion.

```bash
npm run mdpdf -- examples/demos/01-hello.md output/01-hello.pdf
```

## CLI Usage

Run:

```bash
npm run mdpdf -- <input.md> <output.pdf>
```

Supported flags:

- `--title <text>`
- `--subtitle <text>`
- `--section <text>`
- `--author <text>`
- `--date <text>`
- `--reading-time <text>`
- `--page-size <Letter|A4>`
- `--margin-top <length>`
- `--margin-right <length>`
- `--margin-bottom <length>`
- `--margin-left <length>`
- `--no-header`
- `--no-footer`
- `--no-cover`

Use CSS length units for margins: `in`, `cm`, `mm`, `pt`, `px`.

## Configuration Precedence

Resolve options in this order:

1. CLI flags
2. Markdown frontmatter
3. `mdpdf.config.json` (searched upward from the input file directory)
4. Internal defaults

Use this minimal frontmatter example:

```yaml
---
title: "Thread Pools"
subtitle: "Or how to share a bounded crew."
author: "Rishav Sharma"
date: "2026-04-20"
pageSize: "A4"
margins:
  top: "24mm"
  right: "22mm"
  bottom: "22mm"
  left: "22mm"
showHeader: true
showFooter: true
showCover: true
---
```

## Supported Markdown Features

- Headings with IDs, for example `## Section {#sec-intro}`
- Pandoc-style fenced directives, for example `:::note`, `:::dropcap`, `:::margin`, `:::{.exbox ...}`
- Attribute bundles on headings/images/math/code, for example `{#id .class key=value}`
- Math via `remark-math`, including inline and display blocks
- Figure and equation references, for example `[@fig:queue]`, `[@eq:latency]`
- Footnotes
- Definition lists
- Task lists
- Tables
- Code fences with extra metadata (`filename`, `lang-label`)

## Architecture

Pipeline entrypoint: `src/core/convert.ts`.

1. Parse frontmatter with `src/parser/frontmatter.ts`.
2. Parse Markdown to mdast with `src/parser/parseMarkdown.ts`.
3. Lift Pandoc attributes with `src/parser/attributes.ts`.
4. Generate Typst with `src/typst/generate.ts`.
5. Compile PDF through Typst with `src/typst/render.ts`.

Keep visual styling in `src/typst/template.typ`. Keep compiler theme tokens in `src/typst/theme.tmTheme`.

## Security and Runtime Constraints

- Resolve image paths relative to the source markdown directory.
- Reject remote URLs, `data:` URIs, absolute paths, and path-escape attempts for images.
- Run Typst with `--root <sourceDir>` and bundled font paths for deterministic, constrained builds.

## Development

```bash
npm run mdpdf
npm run typecheck
npm run lint
```

## Technical Documentation

- [`examples/editorial-swiss/`](examples/editorial-swiss/) — canonical fixture for the design language. `paper.md` is the source document; `output.pdf` is what the pipeline produces; `mockup.html` is the executable design spec and `mockup.pdf` is its browser print — the visual target. Diff `output.pdf` against `mockup.pdf`. `figures/` holds image assets.
- [`examples/demos/`](examples/demos/) — short progressive demos exercising one capability at a time. Numbered `01-hello` through `07-oversized-admonition`; `05-admonitions` is the per-component fixture for the four callout flavours and `07` is the page-break regression fixture.

## License

MIT
