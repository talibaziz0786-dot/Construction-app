import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Light-mode coverage regression.
 *
 * Components are authored with dark slate utilities and the light theme is
 * produced by the `:root:not(.dark)` mapping in `index.css`. The previous fix
 * missed several utilities (`bg-slate-900/25`, `hover:bg-slate-900`,
 * `divide-slate-800/60`, `text-slate-700`, …) which is exactly why parts of the
 * UI stayed dark. This test scans every source file for slate utilities and
 * fails when a class has no light-mode mapping.
 *
 * Sources are read from disk, so the check also covers files the bundler would
 * otherwise tree-shake out of the test module graph.
 */
const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));
const CSS_PATH = join(SRC_DIR, 'index.css');

function collectSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full));
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const CSS: string = readFileSync(CSS_PATH, 'utf8');

/** Slate utilities that are already light and therefore need no override. */
const ALREADY_LIGHT = new Set(['bg-slate-50', 'bg-slate-100', 'border-slate-300', 'divide-slate-300']);

/** Bare utility class names (variant prefixes stripped) used with slate colours. */
function slateUtilitiesIn(source: string): string[] {
  const pattern = /(?:bg|text|border|divide|from|via|to|ring|placeholder)-slate-\d{2,3}(?:\/\d{1,3})?/g;
  return source.match(pattern) ?? [];
}

const used = new Set<string>();
for (const file of collectSourceFiles(SRC_DIR)) {
  if (file === CSS_PATH) continue;
  for (const utility of slateUtilitiesIn(readFileSync(file, 'utf8'))) {
    used.add(utility);
  }
}

describe('light mode coverage', () => {
  it('finds slate utilities in the source (guards against a broken scan)', () => {
    expect(used.size).toBeGreaterThan(10);
  });

  it('maps every slate utility used by a component to a light-mode rule', () => {
    const unmapped = [...used]
      .filter((utility) => !ALREADY_LIGHT.has(utility))
      .filter((utility) => !CSS.includes(`.${utility.replace('/', '\\/')}`))
      .sort();

    expect(unmapped).toEqual([]);
  });

  it('scopes every light-mode override to :root:not(.dark) so dark mode is untouched', () => {
    const overrideLines = CSS.split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.includes('!important') && line.includes('-slate-'));

    expect(overrideLines.length).toBeGreaterThan(20);
    for (const line of overrideLines) {
      expect(line.startsWith(':root:not(.dark)')).toBe(true);
    }
  });
});
