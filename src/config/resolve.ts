import { readFileSync, existsSync } from "node:fs";
import { dirname, join, parse } from "node:path";
import {
  DEFAULTS,
  type DocumentOptions,
  type DocumentOptionsLayer,
  type Theme,
} from "./options.js";
import { validateOptions } from "./validate.js";

export const CONFIG_FILENAME = "mdpdf.config.json";

export function loadProjectConfig(startDir: string): DocumentOptionsLayer | null {
  const path = findConfigFile(startDir);
  if (path === null) return null;

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
    author: pick(layers.cli.author, layers.frontmatter.author, project.author),
    date: pick(layers.cli.date, layers.frontmatter.date, project.date),
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
    theme: resolveTheme(layers),
  };
}

function resolveTheme(layers: {
  cli: DocumentOptionsLayer;
  frontmatter: DocumentOptionsLayer;
  project: DocumentOptionsLayer | null;
}): Theme {
  const project = layers.project ?? {};
  const c = layers.cli.theme ?? {};
  const f = layers.frontmatter.theme ?? {};
  const p = project.theme ?? {};
  const d = DEFAULTS.theme;
  return {
    paperTone: pick(c.paperTone, f.paperTone, p.paperTone) ?? d.paperTone,
    accent: pick(c.accent, f.accent, p.accent) ?? d.accent,
    bodyFont: pick(c.bodyFont, f.bodyFont, p.bodyFont) ?? d.bodyFont,
    headingFont: pick(c.headingFont, f.headingFont, p.headingFont) ?? d.headingFont,
    density: pick(c.density, f.density, p.density) ?? d.density,
  };
}

function pick<T>(...values: (T | undefined)[]): T | undefined {
  for (const v of values) {
    if (v !== undefined) return v;
  }
  return undefined;
}
