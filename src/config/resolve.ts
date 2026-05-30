import { readFileSync, existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import {
  DEFAULTS,
  type DocumentOptions,
  type DocumentOptionsLayer,
} from "./options.js";
import { validateOptions } from "./validate.js";

export const CONFIG_FILENAME = "mdpdf.config.json";

export function loadProjectConfig(startDir: string): DocumentOptionsLayer | null {
  const path = findConfigFile(startDir);
  if (path === null) return null;
  return readConfigFile(path);
}

// Load a config from a caller-supplied path (CLI --config flag). Throws
// if the file doesn't exist or isn't valid JSON — these are user errors
// the CLI should surface clearly, unlike the upward-search path which
// silently returns null when no config is found.
export function loadConfigFromPath(path: string): DocumentOptionsLayer {
  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }
  return readConfigFile(path);
}

function readConfigFile(path: string): DocumentOptionsLayer {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`Invalid JSON in ${path}: ${(err as Error).message}`);
  }
  return validateOptions(raw, path);
}

function findConfigFile(startDir: string): string | null {
  let dir = startDir;
  const { root } = parse(dir);
  while (true) {
    const p = join(dir, CONFIG_FILENAME);
    if (existsSync(p)) return p;
    if (dir === root) return null;
    dir = dirname(dir);
  }
}

export function resolveOptions(layers: {
  cli: DocumentOptionsLayer;
  frontmatter: DocumentOptionsLayer;
  project: DocumentOptionsLayer | null;
}): DocumentOptions {
  const project = layers.project ?? {};
  return {
    title: pick(layers.cli.title, layers.frontmatter.title, project.title),
    subtitle: pick(layers.cli.subtitle, layers.frontmatter.subtitle, project.subtitle),
    section: pick(layers.cli.section, layers.frontmatter.section, project.section),
    author: pick(layers.cli.author, layers.frontmatter.author, project.author),
    date: pick(layers.cli.date, layers.frontmatter.date, project.date),
    readingTime: pick(layers.cli.readingTime, layers.frontmatter.readingTime, project.readingTime),
    chapter: pick(layers.cli.chapter, layers.frontmatter.chapter, project.chapter),
    part: pick(layers.cli.part, layers.frontmatter.part, project.part),
    series: pick(layers.cli.series, layers.frontmatter.series, project.series),
    edition: pick(layers.cli.edition, layers.frontmatter.edition, project.edition),
    editionShort: pick(
      layers.cli.editionShort,
      layers.frontmatter.editionShort,
      project.editionShort,
    ),
    volume: pick(layers.cli.volume, layers.frontmatter.volume, project.volume),
    pageStart: pick(layers.cli.pageStart, layers.frontmatter.pageStart, project.pageStart),
    pageEnd: pick(layers.cli.pageEnd, layers.frontmatter.pageEnd, project.pageEnd),
    cover: pick(layers.cli.cover, layers.frontmatter.cover, project.cover),
    pageSize: pick(
      layers.cli.pageSize,
      layers.frontmatter.pageSize,
      project.pageSize,
    ) ?? DEFAULTS.pageSize,
    margins: {
      top: pick(layers.cli.margins?.top, layers.frontmatter.margins?.top, project.margins?.top) ?? DEFAULTS.margins.top,
      right: pick(layers.cli.margins?.right, layers.frontmatter.margins?.right, project.margins?.right) ?? DEFAULTS.margins.right,
      bottom: pick(layers.cli.margins?.bottom, layers.frontmatter.margins?.bottom, project.margins?.bottom) ?? DEFAULTS.margins.bottom,
      left: pick(layers.cli.margins?.left, layers.frontmatter.margins?.left, project.margins?.left) ?? DEFAULTS.margins.left,
    },
    showHeader: pick(layers.cli.showHeader, layers.frontmatter.showHeader, project.showHeader) ?? DEFAULTS.showHeader,
    showFooter: pick(layers.cli.showFooter, layers.frontmatter.showFooter, project.showFooter) ?? DEFAULTS.showFooter,
    showCover: pick(layers.cli.showCover, layers.frontmatter.showCover, project.showCover) ?? DEFAULTS.showCover,
    paperBg: pick(layers.cli.paperBg, layers.frontmatter.paperBg, project.paperBg),
    footnotes: pick(layers.cli.footnotes, layers.frontmatter.footnotes, project.footnotes) ?? DEFAULTS.footnotes,
  };
}

function pick<T>(...values: (T | undefined)[]): T | undefined {
  for (const v of values) {
    if (v !== undefined) return v;
  }
  return undefined;
}
