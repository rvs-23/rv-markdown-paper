# Code Review: rv-markdown-paper

**Reviewed:** 2026-04-19
**Repository:** git@github.com:rvs-23/rv-markdown-paper.git
**Local path:** /Users/rishavsharma/Documents/Projects/rv-markdown-paper

---

## 1. Project Overview

`rv-markdown-paper` is a TypeScript-based Markdown-to-PDF converter that leverages Typst for typesetting. The tool applies a disciplined, grayscale design system (serif body + headings, monospace for code) with no user-customizable colors. The architecture follows a four-stage pipeline:

1. **Frontmatter extraction** (gray-matter, `src/parser/frontmatter.ts:10`)
2. **Markdown parsing** (remark, `src/parser/parseMarkdown.ts:8`)
3. **mdast-to-Typst code generation** (`src/typst/generate.ts:40`)
4. **Typst compilation** via shell subprocess (`src/typst/render.ts:98`)

Configuration is resolved via precedence: CLI flags > frontmatter YAML > project-level `mdpdf.config.json` > defaults (`src/config/resolve.ts:36–64`). Entry point is `src/cli/index.ts`, which validates CLI arguments and orchestrates the conversion in `src/core/convert.ts`.

**The design system lives in Typst, not TypeScript.** `src/typst/template.typ` (300 lines) defines every visual decision: typography scale, color values, cover block, meta row, running header/footer, callout styling, table chrome. The TypeScript side only emits markup and a `#show: paper.with(...)` call. Fonts are bundled locally under `assets/fonts` and loaded with `--ignore-system-fonts` (`src/typst/render.ts:14, 109`), so font swaps require dropping files there, not installing system-wide. **For a design refactor, `template.typ` + the bundled fonts are the surface to edit — the TS pipeline rarely needs to change.**

---

## 2. Strengths

- **Clean architecture & separation of concerns**: Each module has a single responsibility — parsing, config, code generation, rendering. The config precedence resolver (`src/config/resolve.ts`) is elegantly implemented with a simple `pick()` helper.
- **Type safety & strictness**: `tsconfig.json` enables `strict: true` with `noUncheckedIndexedAccess` and `noImplicitOverride` (`tsconfig.json:10–12`), plus comprehensive use of union types for config validation (`src/config/options.ts`).
- **Robust input validation**: CLI parsers (`src/cli/index.ts:75–85`) and config validators (`src/config/validate.ts`) both validate CSS lengths and page sizes with clear error messages naming the source: `"frontmatter.pageSize: expected 'Letter' or 'A4', got 'A5'."` (`src/config/validate.ts:55`).
- **Thoughtful markdown-to-Typst generation**: Handles complex edge cases — longest-backtick-run detection for code-fence collisions (`src/typst/generate.ts:102–104, 277–278`), soft-line-break collapsing (`src/typst/escape.ts:23–24`), callout marker detection (`src/typst/generate.ts:155–189`).
- **Inclusive features**: Task lists, blockquote callouts (`[!NOTE]`), figure captions, strikethrough all work out of the box. Examples (`examples/01-hello.md` → `05-full-paper.md`) demonstrate progressive complexity.
- **Reliable temp directory cleanup**: Uses try/finally with recursive rm to ensure temp files are always deleted (`src/typst/render.ts:25–43`).

---

## 3. Bugs & Correctness Issues

### HIGH severity

- **Path traversal in image URLs** — `src/typst/generate.ts:300–304` resolves image paths with `resolvePath(ctx.sourceDir, url)`. A Markdown file containing `![](../../../etc/passwd)` yields an absolute path passed to Typst. Because Typst runs with `--root /`, any file on disk is readable; an attacker controlling Markdown can exfiltrate arbitrary files if the resulting PDF is examined. **Mitigate:** validate resolved paths stay within a safe tree.
- **Typst code injection surface** — `src/typst/render.ts:76` builds a Typst string with `quote(s.replace(/\\/g, "\\\\").replace(/"/g, '\\"'))`. Correct for string literals *inside* quotes. However, if a field (e.g., document title) is ever rendered in a context where `#` or `[` is interpreted as markup before the quote (preamble construction, line 50), an attacker could inject arbitrary Typst. Current template appears safe because all preamble strings are quoted, but this is fragile.

### MEDIUM severity

- **Unreliable heading depth stripping** — `src/core/convert.ts:56–65` strips a leading `# H1` if its normalized text matches the config title. `normalize()` collapses whitespace and lowercases, so `# The Title` with config `title: "the  title"` still matches. But special characters (apostrophes, em dashes) may break equality. Structural decisions based on fuzzy string match are risky.
- **Unbounded stderr buffering** — `src/typst/render.ts:116–117` appends all stderr into a string without a cap. A Typst error storm grows memory without limit. Cap at ~64 KB.
- **Remote images silently fail** — `src/typst/generate.ts:300–304` passes URLs and `data:` URIs through to Typst unchanged, but Typst's `#image()` only reads local files. `![](https://example.com/foo.png)` in markdown will produce a Typst error at compile time (at best) or a blank figure (at worst). Fix: either fetch + cache remote images pre-compile, or fail fast with a clear message before calling Typst.

### LOW severity

- **Unnecessary `any` cast** — `src/typst/generate.ts:147` casts `child as RootContent`. Types already guarantee `child` is `BlockContent`; the cast hides potential bugs.
- **Dead code** — `src/typst/generate.ts:320` has `void dirname;` — imported but unused.
- **Version mismatch** — `src/cli/index.ts:11` hardcodes `version: "0.1.0"` while `package.json:3` is `0.2.0`. Read from package.json at runtime instead.
- **Silent markdown drops** — several common node types render as empty strings with no warning:
  - `thematicBreak` (`---` / `***`) → dropped by design (`src/typst/generate.ts:73–76`)
  - `html` blocks and inline HTML → dropped (`src/typst/generate.ts:77–79, 270–271`)
  - Footnotes (`[^1]` / `[^1]: …`) → remark-gfm parses these into `footnoteReference` / `footnoteDefinition` nodes, which hit the `default: return ""` case (`src/typst/generate.ts:80–82, 272–274`) and silently vanish, even though GFM is enabled
  - Definitions and reference-style links fall into the same default-return-empty trap
  Either document these as unsupported or warn when they're dropped. Currently a user writes `---` or a footnote, sees nothing in the PDF, and has no idea why.
- **Tree mutation in `stripRedundantLeadingH1`** — `src/core/convert.ts:60` calls `tree.children.shift()` to mutate the mdast tree in place. Works because the tree is throwaway, but a subtle side effect; a pure filter would be clearer.

---

## 4. Security Concerns

- **Shell injection (low, mitigated)** — `src/typst/render.ts:100–112` uses `spawn()` with an argument array, avoiding shell injection. File paths are user-controlled; validate to be safe.
- **YAML DoS** — `src/parser/frontmatter.ts:13` passes user YAML to `gray-matter` without a length limit. A 10 MB frontmatter block is parsed into memory unchecked. Add a size cap.
- **Output path traversal** — `src/core/convert.ts:21` accepts `outputPath` without checking for escape sequences (`../../../sensitive.pdf`). If the tool runs with elevated privileges, attacker-controlled output paths could overwrite system files.

---

## 5. Code Quality

- **Verbose import block** — `src/typst/generate.ts` imports 24 mdast types individually (lines 2–23). Readable but heavy; consider a namespace import.
- **Magic numbers** — `src/core/readingTime.ts:7` has `WORDS_PER_MINUTE = 230` (good). Elsewhere, defaults would benefit from the same treatment.
- **Verbose default merging** — `src/config/resolve.ts:42–63` uses `pick(...) ?? DEFAULTS.*` for every field. `{ ...DEFAULTS, ...resolved }` would be cleaner.
- **Weak callout narrowing** — `src/typst/generate.ts:173` extracts `match[1]!` and casts to `CalloutKind` without exhaustiveness checking. Unknown types compile but crash at runtime. Use a validated enum.
- **ESLint permissive on unused imports** — `eslint.config.js` only warns on unused *variables* with `argsIgnorePattern`, not imports.

---

## 6. TypeScript & Tooling

- **Strict, but could be stricter** — `tsconfig.json` enables `strict: true` and `noUncheckedIndexedAccess`. Missing: `exactOptionalPropertyTypes`, `noPropertyAccessFromIndexSignature`.
- **ESLint gaps** — Only warns (not errors) on unused variables. No rules for:
  - Disallowing bare `any`
  - Enforcing exhaustive switch statements
  - Catching unused imports
  - Enforcing async/await over Promise chains
- **No `.nvmrc`** — `package.json` specifies `engines: ">=20"`, but Node 18 devs aren't warned until runtime.
- **No CI** — No GitHub Actions, no pre-commit hooks. Relies on developers running `npm run typecheck` and `npm run lint` manually.

---

## 7. Dependencies

Minimal, well-chosen runtime deps:
- `commander@^14.0.3` — CLI parsing (current)
- `gray-matter@^4.0.3` — YAML extraction (older but stable)
- `mdast-util-to-string@^4.0.0`, `remark-parse@^11.0.0`, `remark-gfm@^4.0.1`, `unified@^11.0.5` — all current
- Dev deps (TypeScript 6.0.3, ESLint 10.2.1, tsx 4.21.0) are current.
- Lockfile committed — good for reproducibility.
- **External Typst binary** required (documented in README line 13). Unavoidable — no Node module provides it.
- License: MIT (`package.json:15`).

**Distribution gaps worth noting:**
- **No `bin` field in `package.json`** — the CLI self-identifies as `mdpdf` (`src/cli/index.ts:9`) but nothing in `package.json` exposes a CLI entry point. Running the tool outside the repo requires `npx tsx src/cli/index.ts …`. A one-line `"bin": { "mdpdf": "./dist/cli/index.js" }` (plus a build step) would make `npm i -g` work.
- **No `main` / `exports` field** — the package can't be imported as a library either. Not a bug for personal use; matters if you ever want to embed `convertMarkdownToPdf()` in another tool.
- **No build step** — `scripts` only has `typecheck` and `lint`; `dev` runs via `tsx`. There's no `build` or `prepack` to emit JS, so `bin`/`exports` wouldn't point at anything real until one is added.

---

## 8. Testing & CI

- **No tests exist.** No `.test.ts`, `.spec.ts`, or `__tests__` directory anywhere.
- **No CI pipeline.** No `.github/workflows`.
- **Manual testing only.** Examples (`01–05.md`) ship with expected PDFs (README line 103), but no regression harness.
- **High-risk untested areas**:
  - Markdown → Typst escaping (`, `$`, `[` in all contexts)
  - Config precedence (does CLI truly override frontmatter?)
  - Image path resolution (`../` handling)
  - Reading time estimation edge cases
  - Error message quality

---

## 9. Documentation

- **README is excellent** — 146 lines covering installation, CLI usage, configuration layers, examples, and a clear four-stage pipeline description.
- **Inline documentation sparse**:
  - `src/cli/index.ts` — no function-level comments
  - `src/typst/generate.ts` — a few good block comments (lines 35–31 on `MARKUP_SPECIAL_RE`, 99–101 on backtick collision), but `renderInline()` / `renderBlock()` lack doc
  - `src/config/resolve.ts` — no explanation of the precedence algorithm
- **Frontmatter example in README** (lines 61–75) is helpful and exhaustive.
- **No API documentation** — If this is also a library, `convertMarkdownToPdf` (`src/core/convert.ts:19`) lacks a JSDoc.

---

## 10. Performance

- **Sync I/O in config load** — `src/config/resolve.ts:18` uses `readFileSync()`. Not critical for a CLI, but the rest of the pipeline is async.
- **Reading time estimation** — O(n) split over the whole tree (`src/core/readingTime.ts:10–11`). Fast even at 10k words. No concern.
- **Typst compilation is subprocess-based** — ~100 ms per page. No parallelization or caching; each file compiled independently. Fine for single-file use.

---

## 11. Top 5 Prioritized Recommendations

| # | Recommendation | Impact | Effort |
|---|---------------|--------|--------|
| 1 | **Add unit tests** — escaping (`src/typst/escape.ts`), config resolution (`src/config/resolve.ts`), image path resolution (`src/typst/generate.ts:300–304`). Target 70%+ coverage with Vitest. Catches path traversal + injection bugs before users do. | HIGH | 4–6h |
| 2 | **Validate resolved image paths** — In `src/typst/generate.ts:300–304`, reject paths that escape the document's directory. Add security test. | HIGH (security) | 1h |
| 3 | **Harden Typst injection safety** — Audit all `quote()` calls in `src/typst/render.ts:76`. Ensure preamble values are always quoted. Consider a builder. | MEDIUM (security) | 2h |
| 4 | **Add GitHub Actions CI** — `.github/workflows/ci.yml` running `typecheck`, `lint`, `test`. Fail PRs on failure. | MEDIUM | 1h |
| 5 | **Fix version mismatch & dead code** — Sync `src/cli/index.ts:11` with `package.json`, remove `void dirname;` (`src/typst/generate.ts:320`), promote unused-var ESLint rule to error. | LOW | 30m |

---

## 12. Design Mandate — Editorial + Swiss

> **Refactor directive (strict).** The codebase is to be refactored to implement this design exactly. This is **not** a layered addition, a new theme option, or a backward-compatible extension. The existing grayscale-only `paper` template, the current Typst preamble, and the remark/gray-matter markdown pipeline are **replaced entirely**. The new design defined below is the only supported output going forward.

**Reference files (live alongside this MD in `Plans/`):**
- `D_EditorialSwiss.html` — source HTML mockup with all CSS rules. **Canonical visual spec.**
- `D_EditorialSwiss.pdf` — rendered PDF (Chrome print-to-PDF from the HTML). **Target output.**
- `editorial-swiss-reference.md` — canonical Pandoc-markdown source that, once the refactor ships, must compile to a PDF visually matching `D_EditorialSwiss.pdf`. This is both the integration-test fixture and the authoring-schema-of-record: every custom directive, every frontmatter field, every markdown construct the tool needs to support appears here.
- `figures/pool-queue.svg` — the one figure referenced by the canonical markdown.

### 12.1 Design identity

The design is a deliberate mash-up of **Editorial** (magazine typesetting: dropcaps, pull quotes, giant display numerals, folios in italic) and **Swiss / International style** (tight grids, hairlines, uppercase tracked eyebrows, generous whitespace, sans discipline). The name in the file ("Editorial + Swiss") captures the dual voice.

**Governing rules:**

1. **Single-ink system.** There is no real accent color. The palette is a warm paper ground (`#EFEDE7`), a three-value ink ramp (`#11131A` / `#2A2D36` / `#4A4D57`), three mute tones for secondary text, three hairline/surface warm-grays, and a near-ink "accent" (`#1F2A3A`) used only for code syntax highlighting. The only true color event in the entire document is the **`.danger` admonition**, which inverts to page-colored text on ink background. That inversion is load-bearing: it earns its status as "the warning you cannot miss" by being the only place in the system where color flips.

2. **Three-font type voice, with one rule per font.**
   - **Archivo** (sans) — body, UI, headings, captions, tables, admonitions. Weights 400 / 500 / 600 / 700. This is the workhorse.
   - **Instrument Serif** — **ITALIC ONLY, ornament only.** Never upright, never for running prose. Used for folios, pull quotes, exercise numerals, figcaption tags, equation numbers, ordered-list numerals, the dropcap, cover-title italic fragments, and the cover-sub tagline. This rule is explicitly codified in the CSS source (`:root` comment block, `D_EditorialSwiss.html:15–19`) and must be preserved in the Typst port.
   - **JetBrains Mono** — code (block and inline) and tabular numeric data in tables (via `font-variant-numeric: tabular-nums` + `tnum` feature). Never used for prose.

3. **Warm paper, not white.** The page background is `#EFEDE7`, not `#FFFFFF`. The body (screen) background `#D8D6CF` is slightly darker — the stack view shows pages as paper sitting on a slightly darker surface. In PDF output, the page background is rendered directly. Body text is `#11131A` — near-black but not pure black, so the ink doesn't fight the warm paper.

### 12.2 Color system

Every value with its semantic role. These are the only colors in the system — no others should be introduced.

| Token | Hex | Role |
|---|---|---|
| `--ink` | `#11131A` | Primary text, headings, body prose, task-box borders, accent admonition labels |
| `--ink2` | `#2A2D36` | Secondary text, muted prose (opener's later paragraphs), admonition body, dt terms, warning border-left |
| `--ink3` | `#4A4D57` | Tertiary — eyebrows, kickers, note admonition border-left |
| `--muted` | `#686C76` | Footer L, running header L-ish, caption body, muted paragraphs, del/strikethrough, figcaption body, pull-quote cite |
| `--mute2` | `#8B8E97` | Meta keys (cover-meta, meta-list keys), h3 `.n` numeral prefix, chap-list .pg, running header R, sig-numeral |
| `--hairline` | `#C5C2BC` | All thin rules — running header/footer borders, list-row dividers, admonition non-accent borders, figure frame, blockquote rule (ordinary blockquote only) |
| `--surface` | `#E4E1DA` | Inline-code background, code-block background, note admonition background, tip admonition background, figure placeholder, table zebra-stripe background |
| `--surface2` | `#DBD8D1` | Code-block filename-bar background, warning admonition background (distinct from note) |
| `--page` | `#EFEDE7` | Page background; also the **text color on the `.danger` admonition inversion** |
| `--accent` | `#1F2A3A` | Inline-code text color; code-syntax `.k` (keywords) and `.d` (definitions); near-ink dark blue — reads as "ink with intent," not as color |
| `--accent-soft` | `#4F5B6E` | Code-syntax `.c` (comments, italic) and `.s` (strings) |

**Rule of additions:** if a component needs a color not in this table, you are doing it wrong. Either use an existing ink/mute/hairline value or reconsider the component.

### 12.3 Typography system

**Three font stacks** (exact CSS declarations in `D_EditorialSwiss.html:20–22`):

```
--sans:  "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
--mono:  "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
--serif: "Instrument Serif", "Iowan Old Style", Palatino, Georgia, serif;
```

**Complete serif-italic usage catalog** (every location where Instrument Serif italic appears — the full set of places "ornament voice" is heard):

1. **Folio** (page number, running footer) — 14pt, lh 1
2. **Cover-foot .vol** ("Ch. 07") — 13pt
3. **Cover-title `.lite` fragments** ("or how to share" / "a bounded crew.") — 44pt italic interleaved with 44pt upright sans ("Thread pools,")
4. **Cover-sub** (tagline) — 17pt, lh 1.25
5. **Cover chap-list .pg** (page numbers in the "In this chapter" list) — 12pt
6. **Dropcap** (`::first-letter` on opener's first paragraph) — 58pt, lh 0.88, float left
7. **Ordered list numerals** (`ol > li::before`) — 11pt
8. **h6** (rare informal sub-sub-head) — 9.5pt
9. **Blockquote italic emphasis** — inherits from markup, not styled specifically
10. **Pull quote body** — 20pt, lh 1.24, max 42ch
11. **Figcaption `.fn`** ("Fig. 7.1") — 10pt
12. **Math-display `.tag`** (equation numbers, "(7.1)") — 10pt
13. **Exercise `.en`** ("01", "02", "03") — 34pt, lh 0.85 — the single largest ornament usage in the system
14. **Exercise `.etag`** ("Warm-up", "Sizing", "Trap") — 14pt
15. **Footnote reference `sup.fnref`** — 0.78em superscript inline
16. **Footnote numerals** (`footnotes ol li::before`) — 10pt

**Complete type scale** (every size in the system):

| Role | Font | Size | Weight | Line height | Tracking | Transform | Color |
|---|---|---|---|---|---|---|---|
| Chapter title (cover) | Sans | 44pt | 500 | 1.02 | −.022em | — | ink |
| Chapter title (body) | Sans | 44pt | 500 | 1.02 | −.02em | — | ink |
| Cover sub | Serif italic | 17pt | 400 | 1.25 | — | — | ink2 |
| Pull quote body | Serif italic | 20pt | 400 | 1.24 | −.005em | — | ink |
| h2 (section headline) | Sans | 21pt | 500 | 1.18 | −.012em | — | ink |
| h3 (sub-head) | Sans | 14pt | 500 | — | −.003em | — | ink |
| h3 `.n` (numeral prefix) | Sans | 14pt | 400 | — | — | — | mute2 |
| Folio | Serif italic | 14pt | 400 | 1 | — | — | ink |
| Cover-foot vol | Serif italic | 13pt | 400 | — | — | — | ink |
| chap-list .pg | Serif italic | 12pt | 400 | — | — | — | muted |
| Body p | Sans | 10.5pt | 400 | 1.56 | — | — | ink |
| Dropcap paragraph | Sans | 11pt | 400 | 1.62 | — | — | ink |
| Ordered-list numeral | Serif italic | 11pt | 400 | — | — | — | ink2 |
| Unordered/ordered list | Sans | 10.5pt | 400 | 1.55 | — | — | ink |
| Nested list | Sans | 10pt | 400 | — | — | — | ink / muted |
| h5 (inline sub) | Sans | 10.5pt | 500 | — | — | — | ink |
| h6 (informal) | Serif italic | 9.5pt | 500 | — | — | — | ink2 |
| dl (definition list) | Sans | 10pt | 400 / 500 dt | 1.55 | — | — | ink / ink2 |
| Blockquote (ordinary) | Sans | 10.5pt | 400 | 1.55 | — | — | ink2 |
| Admonition body | Sans | 10pt | 400 | 1.5 | — | — | ink |
| Admonition label | Sans | 8pt | 500 | — | .18em | UPPER | ink |
| Table (default) | Sans | 9.5pt | 400 | — | — | — | ink |
| Table thead th | Sans | 8.5pt | 500 | — | .02em | — | ink2 |
| Table tbody td | Mono (tnum) | 9.3pt | 400 | — | — | — | ink |
| Table tbody td.first | Sans | 9.3pt | 400 | — | — | — | ink |
| Code block source | Mono | 8.6pt | 400 | 1.6 | — | — | ink |
| Code block filename | Sans | 8pt | 500 | — | — | — | ink2 |
| Code block .lang | Mono | 7.5pt | 400 | — | — | — | mute2 |
| Inline code | Mono | 0.88em | 400 | — | — | — | accent |
| Math display | (native) | 11pt | — | — | — | — | ink |
| Math `.tag` (eq #) | Serif italic | 10pt | 400 | — | — | — | muted |
| Figure figcaption | Sans | 8.5pt | 400 | — | — | — | muted |
| Figcaption `.fn` | Serif italic | 10pt | 400 | — | — | — | ink |
| Footnote body | Sans | 8.5pt | 400 | 1.45 | — | — | ink2 |
| Footnote numeral | Serif italic | 10pt | 400 | — | — | — | ink |
| Footnote ref (sup) | Serif italic | 0.78em | 400 | 0 | — | — | ink |
| Exercise numeral | Serif italic | 34pt | 400 | 0.85 | −.015em | — | ink |
| Exercise tag | Serif italic | 14pt | 400 | — | — | — | ink2 |
| Exercise meta | Sans | 8pt | 500 | — | .14em | UPPER | muted |
| Eyebrow | Sans | 9pt | 500 | — | .16em | UPPER | ink3 |
| Kicker | Sans | 9pt | 500 | — | .16em | UPPER | ink3 |
| h4 (category head) | Sans | 9pt | 500 | — | .06em | UPPER | ink2 |
| Cover edition strip | Sans | 8pt | 500 | — | .16em | UPPER | muted |
| Running header L/R | Sans | 8.5pt | 500 | — | .02em / .04em | — | ink2 / mute2 |
| Running footer L | Sans | 8.5pt | 400 | — | — | — | muted |
| Sig-numeral (giant) | Sans | 60pt | 300 | 1 | −.02em | — | mute2 |
| Marginalia body | Sans | 8.5pt | 400 | 1.45 | — | — | muted |
| Marginalia `.n` label | Sans | 7.5pt | 500 | — | .14em | UPPER | ink2 |

**Archivo weights required:** 400, 500, 600, 700 (files to ship in `assets/fonts/`).
**Instrument Serif required:** italic (primary); upright should also be shipped as a fallback for Typst's font-lookup even though it's never explicitly used — otherwise mixed-content runs can trigger font-resolution warnings.
**JetBrains Mono weights required:** 400, 500.

### 12.4 Page geometry

- **Page size:** A4 (210 × 297 mm)
- **Page padding:** 24 mm top, 22 mm right, 22 mm bottom, 22 mm left
- **Main grid:** two-column — `1fr / 35mm` with 5 mm column gap. Main prose column on left, marginalia rail on right (35 mm wide).
- **Exceptions:** cover page and opener page are single-column (no marginalia rail, `display: block` override).
- **Measure for body prose (opener):** `max-width: 58ch` enforced via `.prose` class.
- **Measure for pull quote:** `max-width: 42ch`.
- **Measure for cover-sub:** `max-width: 34ch`.
- **Measure for cover-title:** `max-width: 14ch`.
- **Measure for h1.ch-title:** `max-width: 18ch`.

### 12.5 Page chrome (template-driven, NOT markdown)

Everything in this section is emitted by the template on every page. The author never writes any of this in markdown.

- **Running header (`.rh`)** — positioned absolute, top 14 mm, L/R 22 mm. Left: "Ch. 07 — Thread pools" (8.5pt sans, weight 500, tracking .02em, ink2). Right: section range "7.1 – 7.2" (8.5pt sans 500 tracking .04em mute2). Hairline border-bottom 0.4pt `--hairline`, padding-bottom 3pt. Suppressed on the opener and cover pages.
- **Running footer (`.rf`)** — positioned absolute, bottom 12 mm, L/R 22 mm. Left: edition line ("Python in Practice · Edition 2") in 8.5pt sans muted. Right: folio (page number) in **14pt Instrument Serif italic ink**. Hairline border-top 0.4pt, padding-top 3pt.
- **Sig-numeral (`.sig-numeral`)** — positioned absolute, right 12 mm, top 24 mm. 60pt Archivo 300, tracking −.02em, color mute2, right-aligned. Shows the current section number ("7.1", "7.3", "7.4", "7.5"). Suppressed on cover and opener.
- **Cover chrome** — see component §12.6.
- **Cross-reference resolution** — phrases like "Appendix C, pp. 342–346" or "See §7.4" have their page numbers resolved at render time via Typst's native reference system (`@label` → "§7.4" / `page-of(label)` → "092"). Paged.js would require `target-counter(page)`; Typst does this natively and cleanly.

### 12.6 Component inventory

For each component: what it looks like + how the author triggers it from markdown.

**Cover page**

- Single-column layout; no running header, no sig-numeral.
- **Edition strip (top):** 3-col-ish row — left "Python in Practice · Edition 2 · 2026", right "Volume I". 8pt sans tracked uppercase muted. Hairline bottom. Margin-bottom 20 mm.
- **Kicker:** "PART TWO • CHAPTER 07" — 9pt sans 500 tracked .16em uppercase ink3, with a 4pt ink3 circle dot separator. Margin-bottom 14pt.
- **Cover title (`h1.cover-title`):** 44pt sans 500, interleaved upright sans + `.lite` serif italic fragments. Max 14ch. Line-height 1.02.
- **Cover sub:** 17pt Instrument Serif italic, max 34ch, ink2, line-height 1.25. Margin-bottom 24pt.
- **Cover meta row (`.cover-meta`):** 3-col grid (1fr each) with 14 mm gap. Each cell: 8pt uppercase tracked `.k` key over 10pt ink2 value. Border-bottom hairline.
- **"In this chapter" (`.cover-grid`):** border-top 1pt ink. h4 "IN THIS CHAPTER". Then `ul.chap-list` — 3-col grid (52pt / 1fr / auto). Per row: section number (9pt sans 500 tracked ink2), title (10pt sans ink), page number (12pt **Instrument Serif italic** muted).
- **Cover foot (`.cover-foot`):** position absolute, bottom 14 mm. 3-col flex — edition L, chapter in 13pt Instrument Serif italic ink center, page range R. Hairline top, 8.5pt sans muted.
- **Frontmatter drives all of this:**
  ```yaml
  cover: true
  title: "Thread pools"
  title_lite: ", or how to share a bounded crew."   # italic serif fragment
  subtitle: "From threading.Thread to concurrent.futures — when a pool helps, and when it just hides the problem."
  section: "Part Two · Chapter 07"
  edition: "Python in Practice · Edition 2 · 2026"
  volume: "Volume I"
  chapter_label: "Ch. 07"
  page_range: "pp. 085 – 098"
  meta:
    Topic: "Thread pools & futures"
    Language: "Python 3.12"
    Runtime: "75 min read"
  chapters:
    - { num: "7.1", title: "Threads & the GIL",            page: "086" }
    - { num: "7.2", title: "What a pool actually is",       page: "088" }
    - { num: "7.3", title: "Submitting & collecting work",  page: "090" }
    # …
  ```

**Opener page (chapter intro)**

- Single-column layout. No running header, no sig-numeral. Only footer shown (with folio).
- **Eyebrow** ("Ch. 7 · Introduction") — 9pt tracked uppercase ink3.
- **Short rule** — 32pt × 1pt ink underline bar (`.rule`). Margin-bottom 22pt.
- **Dropcap paragraph** — first paragraph only. `::first-letter` is rendered as **58pt Instrument Serif italic ink**, floated left, padding 4pt 8pt 0 0, line-height 0.88. The following element gets `clear: left` so it doesn't wrap under the dropcap tail.
- **Follow-up paragraphs** — regular 10.5pt sans, or `.prose.muted` (ink2) for quieter secondary paragraphs.
- **h5 sub-heads** ("What you will learn", "A note on scope") — 10.5pt sans 500 ink, margin 12pt top / 2pt bottom.
- **Definition list** — 2-col grid (max-content / 1fr). 10pt sans 500 dt (ink, hairline top) / 10pt sans 400 dd (ink2, hairline top). Row gap 4pt, col gap 14pt.
- Triggered by frontmatter `opener: true` or a dedicated `:::opener` fenced div.

**Body page (standard)**

- Two-column grid (main + 35 mm marginalia rail).
- Running header, running footer, sig-numeral all shown.
- **Eyebrow** — e.g. "7.1 · Threads & the GIL". Auto-generated from the h2 heading numbering. 9pt sans tracked uppercase ink3, margin-bottom 10pt.
- **h2 (section headline)** — 21pt sans 500 tracking −.012em lh 1.18. One per body page. Style convention: short declarative sentence ending with a period ("Why a pool, and why bounded.", "The minimal executor.", "How many workers?", "Work these before 7.6.").
- Standard prose.
- **h3 (sub-head with numeral prefix)** — 14pt sans 500. Auto-numbered: the template prepends a `.n`-classed span with the hierarchical numeral ("7.1.1") in mute2 400. Markdown author writes `### Three reasons to pool`; the template prepends "7.1.1" automatically.

**Marginalia (right rail)**

- 35 mm wide, 8.5pt sans lh 1.45 muted.
- Each note: hairline border-top, padding-top 6pt, margin-bottom 14pt.
- **Label** (`.n`): 7.5pt sans 500 tracked .14em uppercase ink2, display block, margin-bottom 4pt.
- Vertical offset from top of page: `.marg.off-46` (46 mm) / `.off-40` (40 mm) / `.off-30` (30 mm) — these are hand-tuned to align with body content. The Typst port should auto-align to the corresponding paragraph (via `#place()` relative to the associated body anchor) rather than using hard-coded offsets.
- **Author syntax (Pandoc fenced div):**
  ```markdown
  :::marg label="THE GIL IN 3.13"
  PEP 703 introduces a no-GIL build. Until it is the default, reason as if the GIL is there.
  :::
  ```

**Headings h1–h6**

- **h1** — 44pt. Used only on cover (`.cover-title`) and chapter-title (`.ch-title`). Author rarely writes this directly; comes from frontmatter.
- **h2** — 21pt, one per body page, short-sentence style.
- **h3** — 14pt with auto-prepended numeral.
- **h4** — 9pt sans tracked .06em uppercase ink2. Category heads ("Sizing · I/O-bound vs CPU-bound", "NOTES").
- **h5** — 10.5pt sans 500 ink. Inline sub-heads in opener.
- **h6** — 9.5pt **serif italic** ink2. Rare; informal sub-sub-head (one of only two places serif italic appears on the body side at small size).

**Eyebrow / Kicker / Rule**

- **Eyebrow** — block-level, 9pt tracked uppercase ink3, margin-bottom 10pt. Used as the section label above an h2.
- **Kicker** — inline-flex with 4pt circle dot separator, same size/tracking as eyebrow. Used on cover only ("Part Two • Chapter 07").
- **Rule** — 32pt × 1pt ink bar. Used once on opener pages after the eyebrow.

**Lists**

- **Unordered** — custom bullet: 6pt × 0.75pt ink horizontal dash (not a dot or disc), positioned 2pt from left, 0.65em from top. Item padding-left 18pt. Font 10.5pt sans lh 1.55.
- **Ordered** — counter + "." in **11pt Instrument Serif italic ink2**, positioned 2pt left, top 0. Item padding-left 24pt.
- **Nested unordered** — 4pt dash, muted color. 10pt font.
- **Nested ordered** — same serif italic numeral style but muted, 10pt.
- **Task list (`ul.task`)** — 9pt × 9pt square `.75pt` ink border. `.done` fills with ink and draws a page-colored check via `::after` (4pt × 2pt rotated −45° with left + bottom borders). Done items also get muted text color.
- **Markdown source:** standard `-` / `*` for UL, `1.` / `2.` for OL, GFM-style `- [x]` / `- [ ]` for task list (no extra syntax needed).

**Definition list**

- 2-col grid (max-content / 1fr), row gap 4pt, col gap 14pt.
- `dt`: 10pt sans 500 ink, padding-top 2pt, hairline border-top 0.3pt.
- `dd`: 10pt sans 400 ink2, padding-top 2pt, hairline border-top 0.3pt.
- **Markdown source:** Pandoc definition-list syntax (`Term\n:   Definition` or `Term ~ Definition` — both pandoc extensions).

**Blockquote (ordinary)**

- Left hairline border 1.5pt, padding 2pt 0 2pt 14pt.
- 10.5pt sans ink2, lh 1.55.
- Used for quieter in-text quotes ("A thread pool is a queue in a trench coat...").
- **Markdown source:** standard `> ...`.

**Pull quote (elevated quote)**

- Left ink border 1.5pt (full ink weight, not hairline).
- Padding 14pt top / 12pt bottom / 20pt left.
- 20pt **Instrument Serif italic** ink, lh 1.24, tracking −.005em, max-width 42ch. Margin 18pt vertical.
- **Cite** (attribution) — block-level below, margin-top 12pt. 8.5pt sans 500 tracked .12em uppercase muted, preceded by em dash.
- **Markdown source (Pandoc fenced div):**
  ```markdown
  :::pull cite="Rob Pike · Concurrency is not parallelism (2012)"
  Concurrency is a way of organising code. Parallelism is a property of how it runs.
  :::
  ```
- **Semantic contrast with blockquote:** use `> ...` for an in-text quote in the document's own voice; use `:::pull` for a display-weight external attribution.

**Inline code**

- 0.88em parent size, JetBrains Mono 400, surface bg, padding 1pt 5pt, color accent (`#1F2A3A`).
- No border-radius (sharp rectangular fill).
- **Markdown source:** standard backticks.

**Code block**

- Surface bg `--surface`, 0.5pt hairline border.
- **Filename header bar:** `--surface2` bg, 0.5pt hairline border-bottom, padding 6pt 10pt. Flex row: filename (8pt sans 500 ink2) L, lang tag (7.5pt mono mute2) R.
- **Source body:** 8.6pt JetBrains Mono, lh 1.6, padding 10pt 14pt, color ink. **No line numbers** — explicitly removed from the current design (`D_EditorialSwiss.html:160–161`).
- **Syntax highlighting classes** (must be implemented in the Typst port via Typst's own syntect highlighter, or a theme file mapping these roles):
  - `.k` keywords — accent, weight 500
  - `.c` comments — accent-soft, italic
  - `.d` definitions / function names — accent
  - `.s` strings — accent-soft
- **Markdown source (Pandoc attribute syntax on fenced code):**
  ````markdown
  ```{.python filename="fetch_all.py"}
  from concurrent.futures import ThreadPoolExecutor, as_completed
  …
  ```
  ````
- The filename attribute drives the filename bar; the lang attribute drives both the `.lang` tag and the syntax highlighting.

**Admonitions (4 variants)**

- **Common:** padding 10pt 14pt, margin 10pt 0, border-left 2pt, font 10pt sans lh 1.5.
- **Label** (`.label`): 8pt sans 500 tracked .18em uppercase, margin-bottom 4pt.
- **`.note`** — border-left `--ink3`, background `--surface`. Label ink.
- **`.tip`** — border-left `--ink`, background `--surface`. Label ink.
- **`.warning`** — border-left `--ink2`, background `--surface2` (distinct warmer gray), **plus hairline top AND hairline bottom** — the extra borders visually elevate it above note/tip without switching to color.
- **`.danger`** — background `--ink` (full ink), text `--page`, label `--page`, no border (the dark fill replaces it), padding 12pt 14pt. **This is the only true color event in the entire document**; it reads as the "STOP" sign because nothing else in the system inverts.
- **Markdown source (Pandoc fenced divs):**
  ```markdown
  :::note
  Text of the note.
  :::

  :::tip
  Text of the tip.
  :::

  :::warning
  Text of the warning.
  :::

  :::danger
  Text of the danger admonition.
  :::
  ```

**Figure**

- Image container (`.ph`): `--surface` bg, 0.5pt `--hairline` border, default height 42 mm (overridable).
- Gridded placeholder background (6 mm × 6 mm hairline pattern, 0.5 opacity) — this is a preview aesthetic; real figures fill the container with the actual image.
- **Figcaption:** 2-col grid (auto / 1fr), hairline border-top 0.3pt, padding-top 5pt, 10pt col gap. Font 8.5pt sans muted.
- **Figcaption `.fn`** (figure tag): **10pt Instrument Serif italic ink** — "Fig. 7.1" automatically generated by the template counter.
- **Markdown source:** standard `![caption text](path/to/image.png)`. The figure number ("7.1") is auto-assigned by the template's figure counter. Optional Pandoc label for cross-reference: `![caption](path){#fig:pool-queue}` → referenceable as `@fig:pool-queue` in prose.

**Tables**

- 100% width, border-collapse.
- **Header row:** 8.5pt sans 500 tracked .02em ink2, padding 7pt 10pt, 0.75pt ink border-bottom (heavier than body rows to mark the boundary), padding-bottom 7pt.
- **Body rows:** 0.4pt hairline border-bottom, padding 7pt 10pt, vertical-align top.
- **Body cells default:** 9.3pt **JetBrains Mono** ink, with `font-feature-settings: "tnum" 1` and `font-variant-numeric: tabular-nums` (the digits are monospaced so numeric columns align vertically).
- **First-column override (`.first`):** 9.3pt sans (the label column reads as prose, not tabular data).
- **Alignment modifiers:** `.num` → right-align (numeric ceiling columns), `.center` → center (the "Why" column).
- **Zebra striping:** `tbody tr:nth-child(even) td { background: var(--surface) }` — subtle, not chromatic.
- **Markdown source:** standard GFM tables. First-column-sans and mono-body defaults are auto-applied by the template show rule on `table > tbody > td` and `tbody > td:first-child`. Author need not annotate.

**Math display**

- Centered, 11pt, padding 6pt 0.
- **Hairline border-top AND border-bottom** (0.3pt each) — frames the equation as a distinct unit.
- **Equation number (`.tag`)** — float right, 10pt Instrument Serif italic muted, padding-top 4pt.
- **Renderer:** KaTeX in the HTML mockup, but the Typst port uses **native Typst math** (`$ N = lambda dot W $`). Native Typst math will inherit Archivo for upright variables and use Typst's default math italic font for math italic — visually tighter than KaTeX imports.
- **Markdown source (Pandoc-extended dollar math):**
  ```markdown
  $$N = \lambda \cdot W$$ {#eq:little}
  ```
  The `{#eq:little}` label is the Pandoc attribute for the equation; the template assigns the equation number from a counter and displays it in the `.tag` slot.

**Exercise block**

- Border-top 1pt ink on the first exercise; subsequent exercises get border-top 0.4pt hairline (cheaper separator within a run).
- Padding 14pt top / 16pt bottom. Margin 16pt vertical; stacked exercises lose the top margin.
- **Header row (`.eh`):** flex baseline, 16pt gap, margin-bottom 8pt.
- **Numeral (`.en`)** — 34pt Instrument Serif italic ink, tracking −.015em, line-height 0.85 — the largest ornament instance in the entire system. ("01", "02", "03".)
- **Tag (`.etag`)** — 14pt Instrument Serif italic ink2 ("Warm-up", "Sizing", "Trap").
- **Meta (`.etag .meta`)** — inline in etag, margin-left 10pt, 8pt sans 500 tracked .14em uppercase muted ("SUBMIT / RESULT", "LITTLE'S LAW", "DEADLOCK").
- **Body:** 10pt sans lh 1.55.
- **Markdown source:**
  ```markdown
  :::ex number="01" title="Warm-up" meta="submit / result"
  Using `ThreadPoolExecutor`, compute the length of ten URLs in parallel and print them in *submission* order, not completion order.
  :::
  ```
- Number can be auto-incremented by the template counter if omitted.

**Footnote reference (inline)**

- `sup.fnref`: 0.78em Instrument Serif italic ink, vertical-align super, line-height 0, padding 0 1pt.
- **Markdown source:** GFM / Pandoc `[^1]` or numbered auto-footnote.

**Footnotes block (page bottom)**

- Margin-top 16pt, padding-top 8pt, hairline border-top.
- **h4 "NOTES"** (9pt sans tracked uppercase ink2, margin-top 0).
- `ol` with custom numeral: 10pt Instrument Serif italic ink, positioned 2pt left, top 0.1em, no background (plain numeral — cleaner than the boxed style).
- **Body:** 8.5pt sans ink2 lh 1.45.
- **Markdown source:** `[^1]` in prose + `[^1]: Footnote text.` anywhere in source.
- **Typst implementation note:** Typst's native `#footnote[...]` places footnotes on the same page as the reference (which is what you want). The current HTML mockup renders them at the bottom of their parent section; in the Typst port, the native footnote placement is stricter and cleaner.

### 12.7 Authoring surface (markdown ↔ template boundary)

**What the author writes in markdown:**

- All prose — paragraphs, inline emphasis (`*bold*` → sans 500, `_italic_` → sans italic, but body italic is rare), links (underlined hairline), inline code.
- Headings (h2 through h6).
- Ordered, unordered, and task lists.
- Tables (GFM pipe syntax).
- Code blocks with Pandoc attribute syntax for `filename` and `lang`.
- Blockquotes (`> ...`).
- Images (standard `![caption](path)`), optionally labeled via `{#fig:label}`.
- Math inline (`$x$`) and display (`$$x$$` with optional `{#eq:label}`).
- Footnotes (Pandoc `[^1]` / `[^1]: text`).
- Strikethrough (`~~text~~` → GFM `<del>` → muted text with line-through).
- Custom blocks via Pandoc fenced divs:
  - `:::marg label="..."` — marginalia
  - `:::note` / `:::tip` / `:::warning` / `:::danger` — admonitions
  - `:::pull cite="..."` — pull quote
  - `:::ex number="..." title="..." meta="..."` — exercise
  - `:::opener` — marks the opener page (triggers dropcap + single-column layout); can also be frontmatter `opener: true`

**What comes from frontmatter:**

```yaml
# Document identity
title:        "Thread pools"
title_lite:   ", or how to share a bounded crew."
subtitle:     "From threading.Thread to concurrent.futures — …"
author:       "…"
date:         "2026-04-19"

# Cover
cover:        true
section:      "Part Two · Chapter 07"
edition:      "Python in Practice · Edition 2 · 2026"
volume:       "Volume I"
chapter_label: "Ch. 07"
page_range:   "pp. 085 – 098"
meta:
  Topic:    "Thread pools & futures"
  Language: "Python 3.12"
  Runtime:  "75 min read"
chapters:
  - { num: "7.1", title: "Threads & the GIL", page: "086" }
  # …

# Page controls
page_size:    "A4"       # or "Letter"
margins:      { top: "24mm", right: "22mm", bottom: "22mm", left: "22mm" }
show_header:  true
show_footer:  true

# Opener behavior
opener:       false      # true on chapter intro files
```

**What comes from the template (author never touches):**

- Running header / footer rendering and content.
- Folio (page number) rendering in serif italic.
- Sig-numeral placement and auto-value (from h2 counter).
- Eyebrow auto-generation from heading hierarchy ("7.1 · Threads & the GIL").
- h3 numeral prefix ("7.1.1") auto-prepended.
- Figure numbering (Fig. 7.1 / Fig. 7.2 …).
- Equation numbering ((7.1) / (7.2) …).
- Exercise numbering (01 / 02 …), if not explicitly set on `:::ex`.
- Cross-reference resolution (`@fig:pool-queue` → "Fig. 7.1"; `@eq:little` → "(7.1)"; page-number refs → "pp. 342–346").
- Two-column grid with marginalia rail.
- Dropcap rendering on the opener's first paragraph.
- Rule (32pt × 1pt) after eyebrow on openers.
- Cover chrome (edition strip, cover foot).

### 12.8 Refactor implications for the existing codebase

**Files to delete (retired by the refactor):**

- `src/parser/parseMarkdown.ts` — remark pipeline is gone; Pandoc parses markdown.
- `src/parser/frontmatter.ts` — gray-matter is gone; Pandoc extracts frontmatter as part of its AST.
- `src/typst/generate.ts` — mdast-to-Typst generator is gone; replaced by Pandoc-JSON-AST-to-Typst walker.
- `src/typst/escape.ts` — Typst escaping is still needed, but the context changes. May be simplified or folded into the new generator.
- `src/core/readingTime.ts` — reading time is now a frontmatter field (`meta.Runtime: "75 min read"`), not a computed value. The word-count heuristic is no longer part of the pipeline.
- `src/typst/template.typ` — the entire current 300-line Typst template is replaced wholesale.

**Files to keep (with significant rewrites):**

- `src/cli/index.ts` — CLI flag surface stays similar but expands. Fix the 0.1.0 / 0.2.0 version mismatch (§3) while touching this file. Add `bin` field to `package.json` while at it.
- `src/core/convert.ts` — orchestration stays; internals change. The flow becomes: read markdown → `pandoc -f markdown+fenced_divs+attributes+tex_math_dollars -t json` → walk JSON AST → emit Typst source → `typst compile`.
- `src/typst/render.ts` — Typst subprocess call stays. The `buildPreamble()` function expands to cover all new frontmatter fields (cover chapters list, meta row, volume, edition, etc.). The current `--root /` behavior stays, but image path validation (§3 HIGH) must be added.
- `src/config/options.ts`, `src/config/resolve.ts`, `src/config/validate.ts` — schema expands significantly. New fields: `section`, `edition`, `volume`, `chapter_label`, `page_range`, `meta` (object), `chapters` (array), `opener`, `title_lite`. Three-layer precedence (CLI > frontmatter > project config) stays the same.

**New code to write:**

- `src/parser/pandoc.ts` — spawn Pandoc subprocess, pipe markdown in, read JSON AST out. Validate exit code, handle errors, check Pandoc version at startup (like Typst check).
- `src/typst/generate.ts` (new implementation) — walk Pandoc AST nodes, emit calls to the Typst `#let` functions defined in the new template. Handle every block type in the Pandoc AST taxonomy (Para, Header, CodeBlock, RawBlock, BulletList, OrderedList, DefinitionList, Table, BlockQuote, HorizontalRule, Figure, Div [class-dispatched to marg/note/tip/warning/danger/pull/ex/opener], Math, …).
- `src/typst/template.typ` (new implementation) — estimated 800–1200 lines. Contains one `#let` function per component from §12.6: `paper`, `cover`, `opener`, `body-page`, `eyebrow`, `kicker`, `rule`, `sig-numeral`, `dropcap-paragraph`, `ordered-list`, `task-list`, `def-list`, `blockquote`, `pull`, `inline-code`, `code-block`, `note`, `tip`, `warn`, `danger`, `figure`, `table`, `math-display`, `exercise`, `footnote-ref`, `footnotes`, `marginalia`, `running-header`, `running-footer`, `folio`, `h2-with-eyebrow`, `h3-with-numeral`. Plus `#show` rules binding Pandoc-emitted markup to these functions.
- `assets/fonts/Archivo-*.ttf` — 4 weights (400, 500, 600, 700).
- `assets/fonts/InstrumentSerif-Italic.ttf` + `InstrumentSerif-Regular.ttf` (fallback).
- `assets/fonts/JetBrainsMono-*.ttf` — 400, 500 (likely already present; verify).
- `docs/authoring.md` — author-facing reference documenting the frontmatter schema, fenced-div directives, and code-fence attributes. Copy of §12.6 + §12.7 from this review, minus the implementation notes.

**New dependencies:**

- **Runtime:** `pandoc` binary (external, like Typst). Document install with `brew install pandoc` / `apt install pandoc`. Startup check: `pandoc --version` and require ≥ 3.0.
- **Removed runtime deps:** `gray-matter`, `mdast-util-to-string`, `remark-gfm`, `remark-parse`, `unified`. `commander` can also go if `node:util` `parseArgs` is adopted (§13 of the earlier review; this becomes natural during the rewrite).
- **Dev:** if a TypeScript types package for Pandoc's JSON AST exists, add it; otherwise hand-write the needed AST node types as a small internal `.d.ts` file.

**Bundled design assets:**

- Archivo, Instrument Serif, and JetBrains Mono font files ship in `assets/fonts/` and are loaded with `--font-path` + `--ignore-system-fonts` (the existing pattern in `src/typst/render.ts:14, 109`). This keeps output deterministic across machines.
- A shipped `theme.tmTheme` (already in the repo) is replaced with one that maps to the `.k` / `.c` / `.d` / `.s` highlighting classes defined in the CSS, using the `--accent` and `--accent-soft` colors for syntax roles.

**Testing priorities for the refactor:**

- A single-page fixture per component in §12.6 (one markdown file that exercises each), committed with its expected PDF.
- Golden-file / snapshot test: render each fixture, diff the emitted Typst source against a committed reference.
- Frontmatter schema validation tests: every new field round-trips correctly from YAML → validated object → Typst preamble argument.
- Pandoc-AST-to-Typst emitter unit tests: one per Pandoc block type.

### 12.9 Refactor directive (restated for unambiguous scope)

**Nothing in the current design is preserved.** The grayscale-only constraint is lifted and replaced by the single-ink palette in §12.2. The markdown pipeline is replaced by Pandoc. The Typst template is rewritten from scratch against the component inventory in §12.6. The frontmatter schema expands per §12.7. Dependencies shift per §12.8. The authoring surface described in §12.7 is the only supported way to write documents going forward.

The reference files `D_EditorialSwiss.html` and `D_EditorialSwiss.pdf` in this folder are the canonical spec. When the HTML and this MD disagree, **the HTML wins** — it is the executable source of the design.

---

## 13. Execution Plan

### 13.1 Canonical reference

Four files in this folder (`Plans/`) together form the canonical spec:

- `D_EditorialSwiss.html` — executable visual spec with all CSS
- `D_EditorialSwiss.pdf` — target output, Chrome-print from the HTML
- `editorial-swiss-reference.md` — Pandoc-markdown input; exercises every component in §12.6
- `figures/pool-queue.svg` — the one figure referenced by the markdown

**Integration test:** the refactored tool, given `editorial-swiss-reference.md` as input, must produce a PDF visually matching `D_EditorialSwiss.pdf` to the tolerance defined in §13.2. This is both the fixture and the definition of done.

### 13.2 Acceptance criteria

"Done" is defined component-by-component against §12.6, not pixel-by-pixel.

**Per-component visual checks** (manual comparison against `D_EditorialSwiss.pdf`):

- [ ] Cover page — edition strip, kicker with dot separator, cover title with italic serif fragments, subtitle, 3-col meta row, "In this chapter" list with resolved page numbers, cover foot
- [ ] Opener page — eyebrow, 32pt × 1pt rule, 58pt Instrument Serif italic dropcap, 58ch measure, single-column layout
- [ ] Body page — running header, sig-numeral top-right (60pt Archivo 300 mute2), eyebrow + h2 + h3-with-numeral pattern, running footer with 14pt Instrument Serif italic folio
- [ ] Marginalia rail aligns with body anchors (auto-positioned, not hard-coded offsets)
- [ ] Unordered list — horizontal dash bullets, not dots
- [ ] Ordered list — Instrument Serif italic numerals at 11pt
- [ ] Task list — 9pt ink-bordered squares; filled with ink + page-colored check when done; muted text when done
- [ ] Definition list — hairline-bordered rows, 2-col grid
- [ ] Blockquote — hairline 1.5pt left rule, ink2 body
- [ ] Pull quote / epigraph — ink 1.5pt left rule, 20pt Instrument Serif italic, uppercase tracked cite preceded by em dash
- [ ] Inline code — surface bg, accent text, 0.88em, no border-radius
- [ ] Code block — surface bg, filename bar (surface2) with filename L and lang-label R, no line numbers, 4-class syntax highlighting (`.k` / `.c` / `.d` / `.s`)
- [ ] Admonitions × 4 — note (ink3 rule, surface bg) / tip (ink rule, surface bg) / warning (ink2 rule, surface2 bg, hairline top AND bottom) / danger (ink bg, page-colored text, no border)
- [ ] Figure — surface frame, hairline border, 10pt Instrument Serif italic "Fig. 7.1" tag, hairline above caption, caption in muted sans
- [ ] Table — first-col sans, mono tabular body, zebra stripe on even rows, 0.75pt ink under header row, hairline between body rows, alignment modifiers (num / center)
- [ ] Math display — hairline border top + bottom, 10pt Instrument Serif italic equation number floated right
- [ ] Exercise × 3 — 34pt Instrument Serif italic numeral ("01", "02", "03") with line-height 0.85, serif italic tag, uppercase tracked meta, 1pt ink top rule on first, 0.4pt hairline between subsequent
- [ ] Footnote reference — 0.78em Instrument Serif italic superscript
- [ ] Footnote block — hairline above, "NOTES" h4, 10pt Instrument Serif italic numerals, 8.5pt ink2 body

**Tolerances:**

- Typography: exact point sizes, line heights, tracking as specified in §12.3 — no drift
- Colors: exact hex values as specified in §12.2 — no drift
- Margins and block spacing: ±1 mm against reference PDF (Chrome print and Typst PDF rasterize slightly differently)
- Font rendering: minor kerning / hinting differences between Chrome's and Typst's rasterizers are acceptable
- Page break placement: reasonable variation acceptable (prose content is what dictates where pages break)

**Global checks:**

- [ ] No Typst compile errors on `editorial-swiss-reference.md`
- [ ] No Pandoc parse errors on `editorial-swiss-reference.md`
- [ ] Every cross-reference resolves: `[@eq:little]` → "(7.1)", `[@fig:pool-queue]` → "Fig. 7.1", section refs in `cover.toc` to page numbers
- [ ] `npm run typecheck` and `npm run lint` pass
- [ ] All unit tests pass (per-component fixtures from Phase 4)
- [ ] Build time: `npm run dev -- editorial-swiss-reference.md out.pdf` completes in under 3 seconds on a modern laptop

### 13.3 Phased milestones

Each phase is PR-sized and has an acceptance gate that must pass before moving to the next.

**Phase 1 — Fixture in place + baseline.**

- Copy `editorial-swiss-reference.md` + `figures/pool-queue.svg` into the repo under `examples/editorial-swiss/`. Copy `D_EditorialSwiss.html` and `D_EditorialSwiss.pdf` into the same folder as `mockup.html` + `mockup.pdf`.
- Run the *current* tool on the fixture. It will fail — most custom directives won't parse. Capture the error output as `examples/editorial-swiss/baseline-error.log` for contrast.
- **Acceptance:** fixture committed, baseline captured, no code changes yet.

**Phase 2 — Pipeline skeleton.**

- Write `src/parser/pandoc.ts`: spawn Pandoc subprocess with the extension flags from the canonical reference's frontmatter comment, return parsed JSON AST. Add Pandoc `--version` check at startup (fail if < 3.0).
- Write `src/typst/generate.ts` (stub): walks the Pandoc AST, emits a `#block[TODO: <type>]` placeholder for every unhandled block type. Enough to produce syntactically valid Typst.
- Delete `src/parser/parseMarkdown.ts`, `src/parser/frontmatter.ts`, `src/core/readingTime.ts`, the old `src/typst/generate.ts`, `src/typst/escape.ts` (or fold into new generator).
- Remove `gray-matter`, `mdast-util-to-string`, `remark-gfm`, `remark-parse`, `unified` from `package.json`. Run `npm install`.
- Update `src/core/convert.ts` to use the new parse + generate functions.
- **Acceptance:** `npm run dev -- examples/editorial-swiss/reference.md /tmp/out.pdf` runs end-to-end and produces a PDF (visually wrong — mostly placeholder boxes — but no errors).

**Phase 3 — New Typst template skeleton.**

- Write new `src/typst/template.typ` with: page setup (A4, 22 mm padding, 2-col grid with 35 mm right marg rail + 5 mm col gap), the full color-token block from §12.2, font loading (Archivo 400/500/600/700, Instrument Serif italic + regular, JetBrains Mono 400/500 all from `assets/fonts/`), a minimal `paper` top-level `#let` function that accepts every frontmatter field, running header/footer + folio rendering.
- Add the font files to `assets/fonts/` with an OFL-1.1 `LICENSE.md` alongside.
- Rewrite `theme.tmTheme` per §14.3.
- **Acceptance:** a trivial plain-prose markdown file (no custom directives) renders with correct body type (10.5pt Archivo, lh 1.56, 58ch measure), exact page margins, running header, running footer with italic folio. Verify against a manually-typeset reference page.

**Phase 4 — Components, one at a time.**

Work through §12.6 in this order, each as a separate commit with a single-component fixture file:

1. Headings (h1–h6), with auto-generated eyebrow from h2 context + explicit h3 numeral (author types numeral; template does NOT auto-prepend — see §14.2 gotcha 8)
2. Body prose (paragraphs, `*emphasis*`, `**strong**`, `~~strike~~`, inline code, links)
3. Lists — ul with dash bullets, ol with serif italic numerals, nested, task list
4. Definition list
5. Blockquote (ordinary) + `:::epigraph` (pull quote with trailing em-dash-attribution line)
6. Code block with `filename` + `lang-label` + 4-class syntax highlighting
7. Admonitions × 4 — `:::note` / `:::tip` / `:::warning` / `:::danger`
8. Figure with caption + `[@fig:x]` cross-ref resolution
9. Table with first-col sans override + zebra + alignment modifiers
10. Math display with `[@eq:x]` cross-ref resolution
11. Exercise blocks — `:::{.exbox number="01" tag="submit / result"}` with bold-prefix body title
12. Footnotes — inline `[^x]` ref + block at page bottom via native Typst `#footnote`
13. Marginalia (`:::margin`) — auto-aligned to the following body anchor (§14.2 gotcha 2)

**Acceptance per step:** the specific component renders correctly in isolation against a dedicated one-page fixture file committed to `examples/components/<name>.md`.

**Phase 5 — Cover + opener pages.**

- Cover page `#let` function reads the nested `cover:` frontmatter block. Emits kicker (with dot separator), cover title with italic serif suffix (split on first comma — §14.2 gotcha 3), subtitle (re-parse for inline code — §14.2 gotcha 6), 3-col meta row, "In this chapter" list resolving `toc[*].ref` to section page numbers via Typst's `#locate` / `counter(page).at()`, cover foot.
- Opener detection: first H1 section with anchor `#chapter-opener` OR frontmatter `opener: true`. Triggers single-column layout (no marg rail), eyebrow + 32pt rule, dropcap on first paragraph of the `:::dropcap` block.
- **Acceptance:** pages 1–2 of `editorial-swiss-reference.md` render matching pages 1–2 of `mockup.pdf`.

**Phase 6 — Full integration + polish.**

- Run the full `editorial-swiss-reference.md` through the pipeline. Compare every component against `mockup.pdf` using the §13.2 per-component checklist.
- Fix whatever doesn't match.
- Address the path-traversal risk (§3 HIGH) as part of `src/typst/render.ts` updates: reject image paths that escape the source markdown's directory.
- Update `README.md` with the new build command, Pandoc + Typst install instructions, and author-facing markdown conventions. Add a `bin` field to `package.json` pointing at a compiled CLI entry.
- Fix version mismatch (`src/cli/index.ts:11` reads from `package.json` at runtime).
- Add `.github/workflows/ci.yml` running `typecheck`, `lint`, and the component-fixture tests.
- **Acceptance:** every checkbox in §13.2 is ticked; README is accurate; CI is green.

### 13.4 Where to start — the first three commits

1. **Commit 1 — Fixture.** `git mv` (or copy) `Plans/editorial-swiss-reference.md` + `Plans/figures/` + `Plans/D_EditorialSwiss.html` + `Plans/D_EditorialSwiss.pdf` into the repo under `examples/editorial-swiss/`. Rename the HTML/PDF pair to `mockup.html` + `mockup.pdf`. No code changes. This is the north star for every subsequent commit.

2. **Commit 2 — Tear down.** Delete `src/parser/parseMarkdown.ts`, `src/parser/frontmatter.ts`, `src/core/readingTime.ts`, `src/typst/generate.ts`, `src/typst/template.typ`, `src/typst/escape.ts`. Remove the five remark-family deps from `package.json`. Run `npm install`. CI will fail (nothing compiles); that's expected.

3. **Commit 3 — Skeleton.** Add `src/parser/pandoc.ts` (Pandoc subprocess + JSON parse + version check), a stub `src/typst/generate.ts` (walks AST, emits TODO placeholder boxes for every block type), a minimal new `src/typst/template.typ` (page setup + fonts + colors + empty `paper` function). Update `src/core/convert.ts` to wire parse → generate → render. `npm run dev -- examples/editorial-swiss/reference.md /tmp/out.pdf` should now produce an ugly-but-valid PDF. Everything after this is filling in components against the fixture.

---

## 14. Implementation Notes

### 14.1 Environment setup

**Required tooling** (fail fast with a clear message at startup if missing):

- **Node.js ≥ 20** — `node -v`. Install via nvm: `nvm install 20 && nvm use 20`.
- **Pandoc ≥ 3.0** — `pandoc --version`. Install: `brew install pandoc` (macOS) or `apt install pandoc` (Debian/Ubuntu).
- **Typst ≥ 0.12** — `typst --version`. Install: `brew install typst` (macOS) or download from `typst.app`.

The CLI should run both version checks at startup. If either tool is missing or below minimum, print a single-line error naming the missing dep and its install command, then exit 1. Pattern: same as the existing Typst version check, extended to Pandoc.

**Font sources** (all OFL-1.1, free to redistribute — commit the `.ttf` files directly to `assets/fonts/`):

- **Archivo** — `https://fonts.google.com/specimen/Archivo` or GitHub `Omnibus-Type/Archivo`. Weights 400 / 500 / 600 / 700 (static files, not variable). ~4 files.
- **Instrument Serif** — `https://fonts.google.com/specimen/Instrument+Serif` or GitHub `Instrument/instrument-serif`. Italic + regular. The design rule in §12.1 says the serif is italic-only in rendered output, but Typst's font-lookup may still probe the upright style during mixed-content runs, so ship both. ~2 files.
- **JetBrains Mono** — GitHub releases at `JetBrains/JetBrainsMono`. Weights 400 / 500. Likely already in `assets/fonts/`; verify before redownloading. ~2 files.

Add `assets/fonts/LICENSE.md` listing all three font names with their respective upstream links and OFL-1.1 notice.

### 14.2 Porting gotchas

Things the refactor will bump into that aren't obvious from reading the HTML source. Address each explicitly during the phase it appears in.

1. **Dropcap implementation (Phase 5).** Typst has no native dropcap primitive. Two paths: (a) hand-roll — render the first character in a `#box` of fixed width, float left via `#place(float: true, dx: 0pt, dy: 0pt)`, then `#pad(left: <width>)` the rest of the paragraph to flow around it; ~15 lines of Typst. (b) Use the community `droplet` package. **Recommend (a)** — keeps deps minimal and behavior fully in your control. The HTML uses `float: left` + `clear: left` on the next element; Typst's `#place(float: true)` mirrors this behavior.

2. **Marginalia auto-alignment (Phase 4 step 13).** The HTML hard-codes vertical offsets (`.marg.off-46`, `.off-40`, `.off-30`) hand-tuned per page. This does not scale. In Typst, each `:::margin` block must auto-align to the paragraph it immediately follows in document order. Implementation: the AST walker emits each `:::margin` as `#marginnote("label", body)` with a hidden anchor. The `marginnote` `#let` function uses `#locate()` to get its position, then `#place(right, dx: <offset>, dy: <y-at-current-location>)` places the note into the right column at the current vertical position. This is a real layout challenge; budget 2–4 hours in Phase 4. If auto-alignment proves hard, fall back to explicit offsets in frontmatter per block, but avoid that if possible.

3. **Cover title mixed upright-sans + italic-serif (Phase 5).** The reference frontmatter has a single string: `title: "Thread pools, or how to share a bounded crew."`. The rendered cover has "Thread pools" upright sans + a comma-then-italic-serif-across-two-lines suffix. **Rule:** the cover `#let` splits `title` on the first comma. Prefix (through the comma's position) renders upright sans. Suffix renders in Instrument Serif italic with additional line breaks at subsequent commas. Document this splitting rule prominently in the template source so future edits don't break it. Alternative: add a separate `title_lite` frontmatter array for explicit italic fragments — cleaner but more authoring friction. Start with the comma-split rule; add the array option only if needed.

4. **`--root /` path-traversal risk (§3 HIGH; Phase 6).** The current `src/typst/render.ts:107` passes `--root /` so absolute image paths resolve. A malicious markdown file with `![](../../../etc/passwd)` would exfiltrate arbitrary files. Fix in the new `generate.ts`: after resolving an image path, reject it if it escapes the source markdown's directory or a whitelist (e.g., `{source_dir, source_dir/figures, source_dir/assets}`). Return a clear error; don't silently strip.

5. **Remote image handling (§3 MEDIUM; Phase 4 step 8).** The current code silently fails on `![](https://…)` — Typst can't fetch URLs. During refactor: reject remote URLs with a clear error at parse time. ("Remote images are not supported. Download the image locally and reference it by relative path.") The "fetch + cache" alternative from the earlier roadmap discussion is deferred — reject-fast is the v1 behavior.

6. **Inline markdown in frontmatter strings (Phase 5).** `cover.subtitle` contains inline code backticks: `"From \`threading.Thread\` to \`concurrent.futures\` — ..."`. When the template renders `cover.subtitle`, it must pass the string through an inline-only markdown → Typst parser (or a minimal custom function handling backticks + em/strong) so the code spans render correctly. Don't render as literal string — the backticks will show through.

7. **Fenced-div syntax equivalence (Phase 2).** Pandoc accepts `:::name`, `::: name`, `:::{.name}`, and `::: {.name key="v"}` interchangeably. The reference uses several of these styles. The AST walker must dispatch on `div.classes` (always an array) rather than branching on source syntax. Write one dispatcher, not four.

8. **`h3` numeral prefix: explicit, not auto-generated.** Earlier in §12.6 I said the template auto-prepends section numerals ("7.1.1") to h3 headings. The canonical reference has the numerals typed by the author: `#### 7.1.1 Three reasons to pool`. **Resolution: explicit wins.** The template renders h3 as 14pt with no numeral logic. Drop the auto-numeral idea. Authors type what they want; template renders faithfully. Simpler, less brittle.

9. **`h2` short-sentence-with-period is convention, not enforcement.** Every h2 in the reference ends with a period ("Why a pool, and why bounded.", "The minimal executor.", "How many workers?"). This is an authoring style, not a template behavior. Do not add or strip the period in the template.

10. **Bold-prefix labels inside `:::margin` and `:::exbox`.** The reference uses `**The GIL in 3.13.** body text...` as the first paragraph inside `:::margin`, and `**Warm-up.** body...` inside `:::exbox`. The Typst show rule for both blocks should:
    - **Marginalia:** detect the leading bold fragment, render it as 7.5pt sans 500 tracked .14em uppercase ink2 (the `.n` label style), then render the remaining body in 8.5pt sans lh 1.45 muted.
    - **Exercise:** render the leading bold fragment inline with the rest of the paragraph (the bold is the title emphasis within body text, not a separate semantic slot — the `.en` numeral and `.etag` come from attributes).
    If no bold prefix is present, render the body plain without erroring.

### 14.3 Syntax highlighting theme

Code blocks use four syntax classes — `.k` keywords, `.c` comments, `.d` definitions, `.s` strings — highlighted via Typst's built-in `syntect` library configured by the shipped `src/typst/theme.tmTheme` file.

**Required scope mappings** (write these into the tmTheme XML plist):

| Scope pattern | Foreground | Font style |
|---|---|---|
| `keyword`, `keyword.control.*`, `storage.type.*`, `storage.modifier.*` | `#1F2A3A` (accent) | bold |
| `entity.name.function`, `entity.name.type`, `entity.name.class`, `support.function.builtin` | `#1F2A3A` (accent) | normal |
| `string`, `string.quoted.*`, `string.regexp`, `constant.character.escape` | `#4F5B6E` (accent-soft) | normal |
| `comment`, `comment.line.*`, `comment.block.*` | `#4F5B6E` (accent-soft) | *italic* |
| *(anything else — default)* | `#11131A` (ink) | normal |

**Theme-level defaults:**

- Background: `#E4E1DA` (surface) — matches the code-block container.
- Foreground (default for unmapped scopes): `#11131A` (ink).
- No caret, no selection, no line-highlight (Typst doesn't use these, but the tmTheme schema requires them to exist; set to match surface).

**File location:** keep `src/typst/theme.tmTheme`, as the existing code expects (`src/typst/render.ts:13` copies it into the temp dir next to the compiled document). Replace contents wholesale with the new mapping.

**Scope minimalism:** map only the ~5 scopes above. Typst's syntect falls back to the theme's default foreground for every unmapped scope, which is the behavior we want (everything that isn't explicitly keyword/string/comment/definition/function renders as plain ink).

**Supported languages:** Typst's default syntect bundle covers `python`, `javascript`, `typescript`, `rust`, `go`, `bash`, `json`, `yaml`, `html`, `css`, `sql`, and ~30 others. No custom `.sublime-syntax` definitions are needed for the canonical reference document or any realistic future document.

---

## Summary

Well-structured TypeScript tool with thoughtful design and few critical bugs. Main code-quality gaps: **testing** and **CI** — both close as part of the rewrite. Path-traversal risk in image handling (§3) is the one security item worth fixing during the rewrite. Remote images and a handful of markdown node types that silently drop today disappear as problems when Pandoc replaces remark (its AST handles them natively).

The **big event** is the Editorial + Swiss design refactor (§12). Near-total rewrite: new Typst template (~800–1200 lines of `#let` components), new Pandoc-based parser, new frontmatter schema, new bundled fonts (Archivo + Instrument Serif + JetBrains Mono), and retirement of the remark / gray-matter / mdast-to-string stack. The CLI shape, config-resolution precedence, Typst subprocess in `render.ts`, and directory structure survive; everything else gets replaced. The refactor is strict — no backward-compatible theme layering, no two-template support.

§13 is the **execution plan**: four canonical reference files, acceptance criteria keyed to §12.6, six PR-sized phases each with an acceptance gate, and the first three commits sketched concretely. §14 is **implementation notes**: environment setup (Node 20 / Pandoc 3 / Typst 0.12 with install commands and font sources), ten porting gotchas each tagged to the phase they surface in (dropcap, marginalia auto-alignment, cover title split, `--root /` security fix, remote-image handling, inline markdown in frontmatter, fenced-div syntax equivalence, explicit vs auto h3 numerals, h2 convention, bold-prefix labels), and the tmTheme syntax-highlighting spec. Together §12–§14 give an AI agent everything needed to execute the refactor without re-asking the author for context mid-flight.

---

## 15. Execution log — Phase 2 done (2026-04-20)

**Deviation from plan:** kept remark (not Pandoc). `remark-parse` + `remark-gfm` + `remark-directive` + `remark-math` + `remark-definition-list` covers the canonical fixture once Pandoc-dialect surface forms are normalized (colon-in-attr protection, `::: name` spacing, `:::{.class}` shorthand). No subprocess dependency, faster builds, easier debugging. Revisit only if a future fixture needs a node type remark can't represent.

**Built this phase.**
- `src/parser/parseMarkdown.ts` — plugin chain + `normalizeDirectiveOpeners` + `protectAttrColons` (swaps `:` inside `{...}` and `@fig:x` refs for `\u0001` pre-parse, restores post-parse).
- `src/parser/attributes.ts` (new) — lifts Pandoc `{#id .class k=v}` attrs off headings, image/math paragraphs, code fences, and trailing-`{#id}` sibling paragraphs onto `node.data.attrs`.
- `src/config/options.ts` + `validate.ts` — added `section`, `chapter`, `part`, `edition`, `volume`, `pageStart/End`, nested `cover` (kicker/title/subtitle/meta[]/toc[]), `showCover`.
- `src/typst/template.typ` — full Editorial+Swiss rewrite (~380 lines): warm paper `#EFEDE7`, Archivo/Instrument Serif/JetBrains Mono loading from `assets/fonts/`, A4 + 35 mm right rail, state-based marginalia collision (`#let _marg-bottom = state(...)` reset in `page.background`), cover page helper, admonitions × 4, `eyebrow`, `dropcap`, `epigraph`, `exbox`, `code-block` (filename + lang-label header strip), `task-box`, running header + italic folio footer.
- `src/typst/generate.ts` — rewritten for new mdast nodes: directive dispatcher (margin/eyebrow/dropcap/epigraph/exbox/admonitions), `splitDropcap` (first-grapheme extraction), LaTeX→Typst math symbol table, label pre-collection for cross-ref fallback, attr-aware code-block wrapping.
- `src/typst/render.ts` — updated import line + `renderCover()` emitter.
- `assets/fonts/` — Archivo (8 TTFs) + Instrument Serif (2 TTFs) + OFL notices. JetBrains Mono already present.

**Acceptance.** `npm run mdpdf -- examples/editorial-swiss/reference.md examples/editorial-swiss/out.pdf` produces a clean 5-page PDF. Dropcap, code-block header, admonition inline-code chip, marginalia auto-alignment, figure + equation cross-refs all render. Directionally matches `mockup.pdf`; pixel-matching remains for later phases.

**Next.** Phase 3 polish — cover page fidelity against p1 of mockup; opener-page single-column layout; per-component fixture tests under `examples/components/`; pixel-level review against `mockup.pdf` per §13.2 checklist.

---

## 16. Backlog — Mermaid diagrams

**Goal.** Render fenced ` ```mermaid ` blocks as figures so authors can keep diagrams alongside the prose instead of pre-baking SVGs in `figures/`.

**Approach.** Pre-process the mdast: walk code nodes with `lang === "mermaid"`, hand the source to `@mermaid-js/mermaid-cli` (`mmdc`) to emit an SVG into the temp dir alongside `template.typ`, then replace the code node with an `image` node pointing at the SVG. Caption + `{#fig:x}` cross-ref attrs from the trailing attribute block continue to work via the existing figure pipeline. Cache by content hash so repeated renders are free.

**Open questions.**
- `mmdc` requires Chromium. Adds a heavy optional dependency; gate behind a `--mermaid` flag or auto-detect availability and degrade to a code block with a "(mermaid not installed)" caption.
- Theme — pass `--theme neutral` plus a custom CSS so the diagram inherits the warm-paper palette (ink lines on `#EFEDE7`, hairline strokes), not Mermaid's default blues.
- Math inside Mermaid labels: defer; if needed, render as Typst-side caption.

**Acceptance.** A ` ```mermaid ` fence followed by `{#fig:flow caption="..."}` renders a figure indistinguishable from an `![](./flow.svg){#fig:flow}` reference, with the same caption/cross-ref behaviour and palette.

---

## 17. Execution log — Phase 3 polish pass (2026-04-25)

**Shipped since 2026-04-20.**

- **Heading ladder remap.** `template.typ` now maps `##` → small-caps tracked eyebrow + hairline (the "7.1 · TITLE" line), `###` → 21 pt display heading, `####` → 14 pt sub-heading. Reasoning in README §"What you can write": the source `##` becomes a section-marker, not a display heading; the actual on-page heading is `###`. Numerals are author-typed (`## 7.1 · Threads & the GIL`), not template-generated — matches §14.2 #8.
- **Opener page suppression.** `## Heading {#chapter-opener}` collapses the heading text entirely so the eyebrow + dropcap below carry the page. Implemented as a `show heading.where(...)` that inspects `it.label` and emits `none`.
- **Pixel pass.** Tables (hairline rule weight + spacing), figure captions (eyebrow label + italic caption), equation hairlines, exbox restyle (numeral + tag header, body indent), admonition labels promoted to weight 500 for legibility on warm paper.
- **Duplicate-eyebrow regression fixed (commit `d7bfef7`).** The reference fixture had both `## 7.4 Sizing the pool` and a manual `::: eyebrow 7.4 · Sizing the pool :::`; the H2 show rule was already rendering the eyebrow, so both stacked. Fix: fold the `·` separator into the H2 text and drop the manual `::: eyebrow` blocks at section openers. One source of truth for the section marker.
- **Orphan "Notes" heading dropped (commit `80b938f`).** `### Notes` followed by footnote definitions, but `generate.ts` pre-collects footnotes and inlines them at the reference site — Typst then renders them as page-bottom footnotes. The heading pointed at nothing.
- **Heading spacing tightened.** H2 above 2em / below 0.9em (eyebrow → next H4 was cramped); H3 above 1em / below 0.8em (display → body line "Why a pool, and why bounded." was kissing the paragraph below); H4 above 1.6em / below 0.5em. Values arrived at by visual review of the reference render.
- **Examples reorganized.** Canonical fixture moved to `examples/reference/` (md + html + pdf together); the five short demos remain at `examples/0X-*.md`.
- **Mermaid backlog captured** as §16 above — not implemented; documented so it doesn't get lost.

**Demo issues from the previous pass — now resolved.**
- Empty hairline at top of demos 01–04 — fixed in `4d0da14` (running header rule suppressed when section/title/date are all empty).
- `examples/01-hello.md` stale "IBM Plex Sans at 11pt" prose — fixed in `a4a7a23` (now reads Archivo 10.5pt).
- `examples/05-full-paper.md` running-header column overlap — fixed in `4d0da14` (header layout unwrapped).

**Font fallbacks dropped (2026-04-26).** `template.typ` previously listed IBM Plex / Lora / Helvetica as fallbacks behind Archivo and Instrument Serif. Combined with `--ignore-system-fonts`, the fallbacks were dead code on a clean machine — but on a machine where stale `IBMPlexSerif-*.ttf` / `Lora-*.ttf` were still in `assets/fonts/`, Typst would silently substitute when a glyph was missing, drifting the render away from the reference with no warning. Now: single-family declarations (`f-sans = "Archivo"`, etc.) and the stale TTFs deleted. A missing face fails loud.

**Verified during this pass.**
- `theme.tmTheme` is true grayscale (#000000, #1A1A1A, #2A2A2A, #3A3A3A, #6B6B6B, #8A8A8A) — earlier color-tint impression on `04-code.pdf` at 130 dpi was an aliasing artifact; at 180 dpi the syntax ramp reads pure ink.

**Next.**
- Address the three demo issues above.
- Phase 4 work from §13.3: per-component fixture tests under `examples/components/`.
- `--root /` path-traversal hardening (§14.2 #4) — still outstanding.

---

## 18. Execution log — Phase 4 begins (2026-04-27)

**Stale demo retired.** `examples/05-full-paper.md` still used the legacy GFM blockquote callout syntax (`> [!NOTE]`, `> [!WARN]`, `> [!SYSTEM]`) and described the long-retired Chromium / Playwright pipeline in its "How" section and "Code, For Flavor" snippet. The pipeline (`renderBlockquote` at `src/typst/generate.ts:241`) wraps blockquotes in `#quote()` with no marker detection, so those callouts have been rendering as plain quotes since the Editorial+Swiss refactor. Rewrote the section to use the four supported fenced-div admonitions (`:::note` / `:::tip` / `:::warning` / `:::danger` — `[!SYSTEM]` dropped, no slot for it in §12.6); refreshed the "How" prose and the flavour snippet to match the current remark + Typst pipeline.

**Phase 4 fixture #1 — admonitions.** Added `examples/components/admonitions.md` (and rendered `.pdf`) exercising all four admonition flavours individually plus a stacked sequence. Inline code inside an admonition body confirmed working. README "Technical Documentation" section now points to `examples/components/` so reviewers can find the per-component fixtures.

**Next (Phase 4 continuing).** Headings (h1–h6) → body prose / inline marks → lists (ul / ol / nested / task) → definition list → blockquote + epigraph → code block → figure → table → math → exbox → footnotes → marginalia. One commit per fixture; visual diff each against `examples/reference/reference.pdf`.

---

## 19. Examples reorganisation (2026-04-27)

**New layout.**

```
examples/
  reference/    canonical Editorial+Swiss fixture (md + html + pdf + figures/)
  components/   one fixture per design-system component (Phase 4 output)
  demos/        the five short progressive demos (01-hello … 05-full-paper) + pipeline.svg
```

Numbered demos and `pipeline.svg` lived loose at `examples/` while components and the reference fixture were already in subdirs — inconsistent and getting worse as Phase 4 fills out. All three categories now sit under their own folder. `examples/editorial-swiss.pdf` (a duplicate render of `reference.md` left over from the pre-reorg layout) deleted; `reference/reference.pdf` is the single canonical render.

**Rendering rule (going forward).** Whenever a template, generator, or font change touches the rendering path, **every** PDF under `examples/` gets re-rendered in the same commit — not just the file under active edit. The committed PDFs are the visual regression surface; they only have value if they all reflect the same pipeline state. A loop over `examples/{demos,components,reference}/*.md` is the standard refresh.

**README updated** to point at the three subdirectories.
