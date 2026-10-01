# Development

How to set up the repo, run the checks, and change rendering without breaking it.

## Contents

- [Setup](#setup)
- [Commands](#commands)
- [Tests](#tests)
- [Committed PDFs](#committed-pdfs)
- [Checking a test catches the bug](#checking-a-test-catches-the-bug)
- [CI](#ci)
- [How this was built](#how-this-was-built)

## Setup

You need Node.js 20 or newer, Typst 0.14 or newer, and poppler, which provides `pdftotext`. The render tests use it to read PDFs back.

```bash
brew install node typst poppler
git clone https://github.com/rvs-23/rv-markdown-paper.git
cd rv-markdown-paper
npm install          # also builds dist/
```

## Commands

```bash
npm run mdpdf -- in.md out.pdf   # render, straight from the TypeScript source
npm test                         # every test
npm run typecheck
npm run lint
npm run build                    # compile to dist/
```

## Tests

The tests live in `tests/`, in four layers:

| Layer | Files | What it catches |
|---|---|---|
| Unit | `config.*`, `attributes`, `escape`, `parseMarkdown`, `generate`, `spans`, `fonts`, `readingTime`, `frontmatter` | Logic errors in one module, from input to output string |
| Snapshot | `generate.fixture.test.ts` | Any change to the Typst generated for the example chapter. The expected output is `tests/__snapshots__/editorial-swiss.typ`; update it with `npx vitest run --dir tests tests/generate.fixture.test.ts -u` when the change is intended. |
| Render | `*.integration.test.ts` | Problems that only show in the PDF. These compile real documents and read the text back with `pdftotext`. |
| Contracts | `render.integration`, `examples.integration`, `guide.integration` | The example chapter is exactly 6 pages, with set text on each page. No example has a near-empty page. Every example in the Markdown guide renders as its feature. |

The render tests skip when Typst or pdftotext is missing. `tests/helpers.ts` holds the shared detection and `pdftotext` call.

## Committed PDFs

Every example's PDF is committed next to its source: `examples/demos/*.pdf`, `examples/editorial-swiss/output.pdf` and `examples/kannada-notes/output.pdf`. Rendering is deterministic, so re-rendering unchanged code gives byte-identical files. That makes the PDFs a visual regression check: after any change, re-render them all and `git status` lists exactly the ones that changed.

```bash
for md in examples/demos/*.md; do npm run mdpdf -- "$md" "${md%.md}.pdf"; done
npm run mdpdf -- examples/editorial-swiss/paper.md examples/editorial-swiss/output.pdf
npm run mdpdf -- examples/kannada-notes/notes.md examples/kannada-notes/output.pdf
git status --short examples
```

Every PDF that changed should be explained by your change. Open each one and look at it. Commit the PDFs in the same commit as the change, so they always match the code.

`examples/editorial-swiss/target.pdf` is different. It's the design target the template was built from, never re-rendered.

## Checking a test catches the bug

A new test should fail on the code before your fix. Check that in a scratch worktree, so your working copy and the shared stash stay untouched:

```bash
git worktree add --detach ../old HEAD
ln -s "$PWD/node_modules" ../old/node_modules
cp tests/my.test.ts ../old/tests/
(cd ../old && npx vitest run --dir tests tests/my.test.ts)   # should fail
git worktree remove ../old
```

## CI

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs on every push to `main` and every pull request. It installs Node 22, Typst 0.14.2 and poppler, then runs typecheck, lint, tests and build.

## How this was built

The project was built with Claude Code, from design discussion to implementation, tests and docs. Independent reviews by Claude and by OpenAI's Codex agent drove several cleanup passes. Every commit is read by the author before it is pushed: the AI does the work, and the author decides what lands.
