import matter from "gray-matter";

export type DocumentMetadata = {
  title?: string;
  author?: string;
  date?: string;
};

export type ParsedMarkdown = {
  content: string;
  metadata: DocumentMetadata;
};

export function extractFrontmatter(markdown: string): ParsedMarkdown {
  const parsed = matter(markdown);
  const data = parsed.data as Record<string, unknown>;
  return {
    content: parsed.content,
    metadata: {
      title: stringOrUndefined(data.title),
      author: stringOrUndefined(data.author),
      date: normalizeDate(data.date),
    },
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function normalizeDate(value: unknown): string | undefined {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return stringOrUndefined(value);
}
