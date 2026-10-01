# Configuration

Every option the converter takes, where it can be set, and how to call the converter from code.

## Contents

- [Where options come from](#where-options-come-from)
- [All options](#all-options)
- [The cover block](#the-cover-block)
- [The config file](#the-config-file)
- [Library API](#library-api)

## Where options come from

An option can be set in four places. For each option, the first place that sets it wins:

1. **CLI flags**, for one render
2. **Frontmatter**, the YAML at the top of the Markdown file
3. **`mdpdf.config.json`**, found by searching upward from the Markdown file's folder (or passed with `--config <path>`)
4. **Built-in defaults**

So a shared baseline can go in `mdpdf.config.json`, a document can override it in frontmatter, and a single render can override both on the command line.

## All options

Frontmatter keys and config-file keys are the same. Only some options have a CLI flag.

**Document text**

| Key | CLI flag | Meaning |
|---|---|---|
| `title` | `--title` | Document title |
| `subtitle` | `--subtitle` | Line under the title |
| `section` | `--section` | Small label above the title, and the header locator when neither `chapter` nor `part` is set |
| `author` | `--author` | Author. The footer is signed with the first name: `AUTHOR · RISHAV` |
| `date` | `--date` | Date. YAML dates (`2026-04-20`) are accepted. |
| `readingTime` | `--reading-time` | Shown on the cover. Estimated when left out. |

**Book fields**, for documents that are chapters of something larger

| Key | Meaning |
|---|---|
| `chapter` | Chapter number. The header shows `Ch. 07`, and figures and equations are numbered `7.1`. |
| `part` | Part name, used in the header when no chapter is set |
| `series` | Book title, shown in the footer and on the cover |
| `edition` / `editionShort` | `Edition 2 · 2026` / `Edition 2`, for the cover and footer |
| `volume` | Shown on the cover |
| `pageStart` / `pageEnd` | `pageStart` sets the first page's number, which the footer and cover TOC count from. With `pageEnd` too, the cover foot shows `pp. 085 – 098`. `page-start` and `page-end` are accepted too. |

**Layout**

| Key | CLI flag | Default | Meaning |
|---|---|---|---|
| `pageSize` | `--page-size` | `A4` | `A4` or `Letter` |
| `margins` | `--margin-top` etc. | 24 / 22 / 22 / 22 mm | `{ top, right, bottom, left }`, each a length in `mm`, `cm`, `in`, `pt` or `px` |
| `paperBg` | `--paper-bg` | `platinum` | `glacier`, `platinum`, `parchment`, or any `#RRGGBB` |
| `showHeader` | `--no-header` | `true` | Running header |
| `showFooter` | `--no-footer` | `true` | Running footer |
| `showCover` | `--no-cover` | `true` | Dedicated cover page, when a `cover` block is set |
| `showAuthor` | `--no-author` | `true` | Author signature in the footer |
| `footnotes` | none | `page` | `page` for page-bottom footnotes, `endnotes` for a NOTES block at the end |
| `cover` | none | none | The cover page; see below |

`--config <path>` loads a specific config file instead of searching for one.

## The cover block

With a `cover` block in frontmatter, the first page becomes a dedicated cover and the leading `# H1` is dropped.

```yaml
cover:
  kicker: "Part Two · Chapter 07"
  title: "Thread pools, | or how to share a bounded crew."
  subtitle: "From `threading.Thread` to `concurrent.futures`."
  meta:
    Topic: "Thread pools & futures"
    Language: "Python 3.12"
  toc:
    - { id: "7.1", title: "Threads & the GIL", ref: "sec-threads-gil" }
    - { id: "7.2", title: "What a pool is", ref: "sec-pool-is", page: "088" }
```

- **`title`**: text before the first comma is set upright and the rest in serif italic. A `|` in the italic part forces a line break.
- **`subtitle`**: backticks set code.
- **`meta`** is the row of small facts. It accepts a map, as above, or a list of `{ label, value }`.
- **`toc`** entries take their page number from the heading whose id is `ref`. An explicit `page:` overrides that, for entries that point outside this document.
- **Runtime:** when the document has a reading time, it is added to `meta` as "Runtime" unless you wrote one.

## The config file

`mdpdf.config.json` takes the same keys as frontmatter:

```json
{
  "author": "Rishav Sharma",
  "paperBg": "parchment",
  "footnotes": "endnotes"
}
```

An unknown key in this file is an error, because the file holds nothing else. Frontmatter is shared with other tools, so there an unknown key is ignored. The exception is a key that looks like a typo of a real option (`showheader`, `titel`), which prints a "did you mean" warning.

## Library API

The package isn't on the npm registry. Install it from GitHub; npm builds it during install:

```bash
npm install github:rvs-23/rv-markdown-paper
```

`convertMarkdownToPdf` is the whole API. It reads a Markdown file and writes a PDF, resolving frontmatter, config file and defaults exactly as the CLI does:

```ts
import { convertMarkdownToPdf } from "rv-markdown-paper";

await convertMarkdownToPdf({
  inputPath: "chapters/07.md",
  outputPath: "out/07.pdf",
  cli: { paperBg: "parchment", showCover: false },  // optional overrides, highest precedence
  configPath: "./print.config.json",                  // optional; skips the upward search
});
```

`cli` takes any option from the table above, in its frontmatter spelling. A missing `configPath` file is an error. Without `configPath`, finding no config file is fine.

**Errors.** The promise rejects when:

- the input file can't be read, or the frontmatter isn't valid YAML
- a config file is missing (when passed as `configPath`) or isn't valid JSON
- an option fails validation (a `ConfigError`, naming the field)
- the Markdown has a malformed id, an image outside its folder, or a character no font covers
- the Markdown has math that can't be converted, or a footnote that references itself
- Typst fails to compile (its error output becomes the message)

**Batches.** Renders share no state, so they can run concurrently. Each one spawns a Typst process, so for large batches keep concurrency near your CPU count.

`ConfigError` is exported, so you can tell a bad document from a failed compile:

```ts
import { ConfigError, convertMarkdownToPdf } from "rv-markdown-paper";

try {
  await convertMarkdownToPdf({ inputPath, outputPath });
} catch (err) {
  if (err instanceof ConfigError) console.error("Fix the document:", err.message);
  else throw err;
}
```

**Types.** `ConvertOptions`, `DocumentOptions`, `DocumentOptionsLayer`, `Cover`, `MetaPair`, `TocEntry` and `Margins` are exported for TypeScript users.

Typst must be on `PATH` wherever the library runs.
