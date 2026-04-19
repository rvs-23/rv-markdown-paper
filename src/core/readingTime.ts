import { toString as mdastToString } from "mdast-util-to-string";
import type { Root } from "mdast";

// 230 wpm is a commonly cited average for sustained reading of informational
// prose (Brysbaert, 2019). It's close enough for a display-only hint that a
// small miscalibration isn't worth worrying about.
const WORDS_PER_MINUTE = 230;

export function estimateReadingTime(tree: Root): string {
  const text = mdastToString(tree);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "1 min";
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return `${minutes} min`;
}
