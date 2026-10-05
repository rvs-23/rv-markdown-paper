# Markdown guide for rv-markdown-paper

Everything this tool renders, one feature per section: the Markdown to write, then what it becomes on the page. Hand this file to anyone (or any agent) writing a document for `mdpdf`.

The language is GitHub-flavoured Markdown plus a few Pandoc extensions: `{#id .class}` attributes, `:::` fenced blocks, `$` math, and definition lists.

## Rules that matter

- **Headings are a ladder, not sizes.** `#` is the document title (once). `##` is a small uppercase section label. `###` is the big visible section title. Write `##` then `###` to open a section.
- **Images** must be local files, referenced by a relative path next to the Markdown file. URLs, `data:` URIs, absolute paths and `../` escapes are rejected.
- **Math** is LaTeX. It may not contain a raw `#` or `"` (use `\#` for a hash).
- **IDs** (`{#id}`) start with a letter, then letters, digits, `_`, `:` or `-`.
- **Scripts:** Latin, Devanagari, Bengali, Kannada, Telugu and emoji render (emoji in monochrome). Greek, Cyrillic and Hebrew render in a serif fallback face. Any other script (Chinese, Arabic, …) has no bundled font, and the render fails naming the character and its line.
- **Raw HTML** is dropped. An unknown `:::name` block renders its content as plain paragraphs.

## Document settings (frontmatter)

Optional YAML at the very top. Every key is optional.

```markdown
---
title: "Thread Pools"
subtitle: "Or how to share a bounded crew."
section: "Lesson 03"          # small label above the title
author: "Rishav Sharma"       # signs the footer: AUTHOR · RISHAV
date: "2026-04-20"
readingTime: "14 min"         # estimated automatically if omitted
pageSize: "A4"                # or "Letter"
margins: { top: "24mm", right: "22mm", bottom: "22mm", left: "22mm" }
showHeader: true
showFooter: true
showAuthor: true              # false leaves the footer signature out
watermark: "Draft"            # faint text across every page; leave out for none
paperBg: "platinum"           # glacier | platinum | parchment, or any #RRGGBB
footnotes: "page"             # or "endnotes" for a NOTES block at the end
---
```

## Cover page

Add a `cover` block to frontmatter for a dedicated first page. A leading `# H1` is then dropped, because the cover is the title.

```markdown
---
cover:
  kicker: "Part Two · Chapter 07"
  title: "Thread pools, or how to share | a bounded crew."   # | forces a line break
  subtitle: "From `threading.Thread` to `concurrent.futures`."
  meta:
    Topic: "Thread pools & futures"
    Language: "Python 3.12"
  toc:
    - { id: "7.1", title: "Threads & the GIL", ref: "sec-threads-gil" }
    - { id: "7.2", title: "What a pool is",    ref: "sec-pool-is" }
---
```

Each `toc` entry's `ref` is a heading ID; its page number fills in automatically. `showCover: false` turns the cover off.

## Headings

```markdown
# Document title

## 7.1 · Threads & the GIL {#sec-threads-gil}

### Why a pool, and why bounded.

#### 7.1.1 Three reasons to pool

##### What you will learn
```

- `#` becomes the large title (only when there's no cover).
- `##` becomes a small tracked-uppercase label. If it starts with a section number like `7.1`, that number also appears large in the right margin, and the running header shows it.
- `###` becomes the 21pt display title.
- `####` becomes a muted sub-heading.
- `#####` becomes a small inline label.

`{#id}` gives any heading an ID for links and cover TOC entries.

## Text

```markdown
**bold**, *italic*, ~~strikethrough~~, `inline code`, [a link](https://example.com).

Bold or italic can start mid-word: oota**kke**.

A line ending in two spaces
breaks here.
```

Italic stays in the sans body face. Links are ink with an underline.

Links can also be written reference-style, with the URL defined once elsewhere in the document:

```markdown
The [Typst docs][typst] and [remark] both explain this.

[typst]: https://typst.app/docs
[remark]: https://remark.js.org
```

`![alt][ref]` works the same way for images. A reference with no matching definition stays as literal text.

## Lists

```markdown
- Unordered item
  - Nested item

1. Ordered item
2. Next item

A list can also start at any number:

5. Fifth item
6. Sixth item

- [x] Done task
- [ ] Open task
```

Two lists separated only by a blank line merge into one, so put a line of text between them. Unordered lists use en-dash markers. Ordered numbers are italic serif. Task lists get checkboxes, and done items are muted.

## Definition list

```markdown
Pool
:   A fixed-size set of worker threads.

Future
:   A result that may not be ready yet.
```

This renders as a two-column grid with a hairline above each row.

## Quotes

```markdown
> A plain blockquote: hairline left rule, muted text.

:::epigraph
Premature optimization is the root of all evil.

— Donald Knuth
:::
```

An `:::epigraph` is a large italic-serif pull quote. A final paragraph starting with `—` becomes the attribution line.

## Callouts

```markdown
:::note
Background detail.
:::

:::tip
A recommendation.
:::

:::warning
Something to be careful about.
:::

:::danger
The one inverted block: light text on ink.
:::
```

Callouts never split across pages.

## Code

````markdown
```python
def fetch(url):
    return requests.get(url)
```

``` {.python filename="fetch_all.py" lang-label="Python 3.12"}
with ThreadPoolExecutor(max_workers=8) as pool:
    results = list(pool.map(fetch, urls))
```
````

Code blocks use a mono face on a grey panel, with grayscale syntax highlighting. The `{...}` form adds a header strip with the filename on the left and the label on the right.

## Tables

```markdown
| Workload   | Default | Why                |
| :--------- | :------ | :----------------- |
| Disk I/O   | 4 – 8   | Kernel queue depth |
| HTTP calls | 8 – 32  | Remote capacity    |
```

The first column is sans and the rest are mono. Columns are sized to their content, so a short column stays narrow and prose columns get the room. There's a rule under the header. Long tables split across pages and repeat the header row.

## Spans

```markdown
Some [quieter aside text]{.muted} and an [underlined phrase]{.underline}.
```

A span styles part of a line: `.muted` sets it in the lighter grey ink, and `.underline` underlines it like a link. Other classes render the text plainly. An `#id` on a span is an error.

## Obsidian notes

A note written in Obsidian renders as it is. These forms are understood:

```markdown
> [!tip] Remember
> An Obsidian callout, with an optional title.

See [[Design Notes]] or [[People/Taylor|Taylor]].

Some ==highlighted words== in a sentence. %%A comment that stays hidden.%%
```

- **Callouts** use the four callout styles. Obsidian's other types fold onto them: `info` and `abstract` become notes, `success` and `hint` become tips, `question` and `caution` become warnings, `bug` and `error` become danger.
- **Wikilinks** become their text: the alias if there is one, otherwise the note's name. A PDF has nowhere to link them.
- **`![[figure.png]]`** embeds an image. It is found by name in the note's folder or any folder below it. A size works as in Obsidian: `![[figure.png|300]]` is 300 pixels wide, `![[figure.png|300x200]]` fits in 300 by 200. An embed of another note becomes that note's name.
- **`==highlights==`** get a grey marker.
- **`%%comments%%`** are removed, along with anything inside them: links, URLs, formatting, even several lines. Trailing `^block-ids` are removed too.

One thing to know: in this design `##` is a small section label and `###` is the large heading, so a note that uses `##` for its main headings will look quieter than it does in Obsidian.

## Horizontal rule

```markdown
---
```

A full-width hairline. It needs a blank line above it; otherwise the line above becomes a heading.

## Figures

```markdown
![Workers pull callables from a FIFO queue.](figures/pool-queue.svg){#fig:pool-queue}

As [@fig:pool-queue] shows, the queue is the bottleneck.
```

An image alone in its paragraph becomes a full-width figure, and its alt text becomes the caption, numbered automatically ("Fig. 1"). `[@fig:id]` references it by number.

To make an image smaller, give it a width or a height: `{width=50%}`, `{height=8cm}`, or both, as in `{#fig:pool-queue width=60%}`. A width can be a percentage of the column; otherwise use `mm`, `cm`, `in`, `pt` or `px`. A bare number is pixels. With both set, the image fits inside that box without stretching. A tall portrait photo fills a whole page at full width, so give it a height.

## Math

```markdown
Inline: the rate is $\lambda$ per second, and $a^2 + b^2 = c^2$.

$$ N = \lambda \cdot W $$ {#eq:little}

By [@eq:little], the pool needs $\frac{N}{W}$ workers.
```

Display math is centred in a thin frame. With an `{#eq:id}`, it gets a number like "(1)", and `[@eq:id]` references it.

## Footnotes

```markdown
Pools cap memory.[^stack]

[^stack]: Each thread reserves an 8 MB stack on Linux.
```

By default these become page-bottom footnotes. With `footnotes: "endnotes"` in frontmatter they're collected into a NOTES block at the end instead.

## Links inside the document

```markdown
See [the sizing section](#sec-sizing).
```

A link to `#id` points at a heading or figure with that ID. If the ID doesn't exist, it renders as plain text.

## Margin notes

```markdown
:::margin
**Stack size.** Tunable via `threading.stack_size()`.
:::

The paragraph this note sits beside.
```

A margin note goes in the right-hand margin, aligned with the block after it, which can be a paragraph, table or anything else. If the note doesn't fit between there and the foot of the page, the note and that block start on the next page together. A leading bold phrase becomes the note's label (or use `:::{.margin label="Stack size"}`).

The right margin column is only reserved when the document has margin notes or `7.1`-style `##` headings. Otherwise the text runs wider.

## Exercise boxes

```markdown
:::{.exbox number="01" tag="Warm-up"}
**Submit and collect.** Rewrite the loop with `pool.submit`.
:::
```

This renders a large italic numeral with the title and tag beside it. A leading bold phrase becomes the title (or use `title="..."`).

## Chapter opener

```markdown
## Introduction {#chapter-opener}

:::eyebrow
Ch. 7 · Introduction
:::

:::dropcap
A thread pool is a bounded crew of workers that take jobs from a queue.
:::
```

- `{#chapter-opener}` on a `##` starts a wider, header-free opening page. The next `##` returns to the normal layout on a fresh page.
- `:::eyebrow` is a small tracked label with a short rule.
- `:::dropcap` sets the first letter as a large italic-serif initial.

## Page breaks

```markdown
## 7.4 · Sizing the pool {#sec-sizing .pagebreak}
```

`.pagebreak` on a heading starts that section on a new page.
