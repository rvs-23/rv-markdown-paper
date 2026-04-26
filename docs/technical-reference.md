# Technical Reference

## 1. Scope

`rv-markdown-paper` is a CLI converter that transforms Markdown into Typst and compiles a PDF with a fixed Editorial+Swiss layout. The conversion pipeline is deterministic by design: it uses bundled fonts from `assets/fonts` and invokes Typst with `--ignore-system-fonts`.

## 2. Runtime Requirements

- `Node.js >= 20`
- `typst` CLI available on `PATH`

The CLI command is:

```bash
npm run mdpdf -- <input.md> <output.pdf>
```

## 3. Pipeline Internals

Entry function: `convertMarkdownToPdf` in `src/core/convert.ts`.

1. Read source file and split frontmatter/content in `src/parser/frontmatter.ts`.
2. Parse Markdown into mdast via `src/parser/parseMarkdown.ts`.
3. Normalize Pandoc-style directive syntax before mdast parse in `parseMarkdown.ts`.
4. Extract Pandoc-style attributes (`{#id .class key=value}`) in `src/parser/attributes.ts`.
5. Resolve options using `src/config/resolve.ts`.
6. Generate Typst source from mdast in `src/typst/generate.ts`.
7. Build Typst preamble and invoke `typst compile` in `src/typst/render.ts`.

## 4. Option Resolution Model

Resolved order:

1. CLI options
2. Frontmatter options
3. `mdpdf.config.json` found by upward directory search
4. `DEFAULTS` from `src/config/options.ts`

Validation layer:

- Implemented in `src/config/validate.ts`.
- Throws `ConfigError` with source-qualified field names.
- Accepts both `page-start`/`page-end` and camelCase `pageStart`/`pageEnd`.

## 5. Supported Content Model

Core Markdown support:

- GFM (`remark-gfm`)
- Directives (`remark-directive`)
- Math (`remark-math`)
- Definition lists (`remark-definition-list`)

Extended behavior in generator:

- Heading IDs map to Typst labels.
- `chapter-opener` heading is structural metadata, not rendered as heading text.
- Footnote definitions are collected and emitted at reference sites.
- Cross references (`@fig:x`, `[@eq:y]`) render as Typst refs only when label exists.
- Unknown/unresolved refs degrade to plain text.

Directive mapping:

- `:::note` / `:::tip` / `:::warning` / `:::danger` / `:::warn` / `:::system` -> Typst admonition macros.
- `:::eyebrow` -> eyebrow macro.
- `:::dropcap` -> dropcap macro with first grapheme split.
- `:::epigraph` -> epigraph macro.
- `:::margin` -> marginalia macro, optional `label` prop.
- `:::{.exbox number="..." tag="..."}` -> exercise box macro.

## 6. Typst Compilation Layer

`src/typst/render.ts`:

- Creates a temp working directory under the source directory.
- Copies `template.typ` and `theme.tmTheme` into temp dir.
- Emits preamble with `#show: paper.with(...)`.
- Compiles with:
  - `--root <sourceDir>`
  - `--font-path <assets/fonts>`
  - `--ignore-system-fonts`
- Captures stderr with a bounded 64KB tail buffer.

## 7. Image and Path Safety

`resolveImagePath` in `src/typst/generate.ts` enforces:

- No remote image URLs.
- No `data:` image URIs.
- No absolute image paths.
- No relative paths that escape source directory via `..`.
- Final image path converted to root-relative Typst path under `--root`.

## 8. Development Surface

Main areas to edit:

- Styling/layout: `src/typst/template.typ`
- Markdown-to-Typst semantics: `src/typst/generate.ts`
- Parser normalization/attribute behavior: `src/parser/parseMarkdown.ts`, `src/parser/attributes.ts`
- Option model and validation: `src/config/options.ts`, `src/config/validate.ts`, `src/config/resolve.ts`
- CLI behavior: `src/cli/index.ts`

## 9. Known Engineering Gaps

- No automated test suite in repository.
- No CI workflow for `typecheck`, `lint`, and conversion regression checks.
- CLI version string in `src/cli/index.ts` is currently hardcoded and can drift from `package.json`.

