# Release Checklist

Four sections: code, docs, risk, ship. Each list below is real work in
disguise.

## Code

- [x] Rename the project folder to match the repo
- [x] Pin the Node version in `engines`
- [x] Split the parser into mdast + HTML stages
- [ ] Remove the placeholder CSS
- [ ] Add a lint rule that forbids non-grayscale hex values

## Docs

1. Update the README status line.
2. Regenerate every example PDF.
3. Note breaking changes in the commit message.
4. Push before running out of coffee.

## Risk Assessment

| Area          | Risk   | Owner   | Notes                               |
|---------------|--------|---------|-------------------------------------|
| Parser        | Low    | core    | Covered by snapshot tests           |
| Shiki theme   | Low    | design  | Grayscale only, verified visually   |
| Playwright    | Medium | infra   | Chromium download is flaky on CI    |
| Frontmatter   | Low    | core    | gray-matter handles the edge cases  |
| Page breaks   | Medium | design  | Needs real-content verification     |

Nothing critical; ship mid-week.

## Nested Lists

- Parser stage
  - Lexer: remark-parse
  - Extensions: remark-gfm, remark-frontmatter (planned)
- Render stage
  - Transform: remark-rehype
  - Highlight: @shikijs/rehype
  - Stringify: rehype-stringify
- Print stage
  - Chromium (via Playwright)
  - Header/footer templates
