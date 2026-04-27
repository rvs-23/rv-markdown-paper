# Four Snippets

A short tour of how `rv-markdown-paper` renders code. The theme is grayscale:
weight and italics do the work that color normally would.

## TypeScript

```typescript
type ConvertOptions = {
  inputPath: string;
  outputPath: string;
  pageSize?: "Letter" | "A4";
};

export async function convertMarkdownToPdf(
  options: ConvertOptions,
): Promise<void> {
  const raw = await readFile(options.inputPath, "utf8");
  const { content, metadata } = extractFrontmatter(raw);
  // ... the orchestrator continues here.
}
```

## Python

```python
def is_prime(n: int) -> bool:
    """Naive primality check — fine for small n."""
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True


primes = [n for n in range(2, 50) if is_prime(n)]
print(primes)
```

## Bash

```bash
#!/usr/bin/env bash
set -euo pipefail

for md in examples/*.md; do
  pdf="${md%.md}.pdf"
  echo "→ $md"
  npm run mdpdf -- "$md" "$pdf"
done
```

## JSON

```json
{
  "name": "rv-markdown-paper",
  "version": "0.1.0",
  "type": "module",
  "bin": { "mdpdf": "./dist/cli/index.js" },
  "engines": { "node": ">=20" }
}
```

Each language picks up its own token set from Shiki. The palette never
deviates from the grayscale tenet: comments in lighter gray italic, keywords
in black bold, strings in mid-gray, punctuation quieter still.
