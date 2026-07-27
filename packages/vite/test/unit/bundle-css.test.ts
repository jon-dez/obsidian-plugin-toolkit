import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  bundleCssEntries,
  isCssEntry,
  splitEntryPoints,
} from '../../src/plugins/bundle-css';

describe('splitEntryPoints', () => {
  it('separates JS and CSS entries', () => {
    expect(
      splitEntryPoints(['src/main.ts', 'src/styles.css', 'src/extra.CSS']),
    ).toEqual({
      jsEntries: ['src/main.ts'],
      cssEntries: ['src/styles.css', 'src/extra.CSS'],
    });
  });

  it('isCssEntry matches .css case-insensitively', () => {
    expect(isCssEntry('a.css')).toBe(true);
    expect(isCssEntry('a.CSS')).toBe(true);
    expect(isCssEntry('a.ts')).toBe(false);
  });
});

describe('bundleCssEntries', () => {
  it('writes a single styles.css from CSS entrypoints', async () => {
    const root = mkdtempSync(join(tmpdir(), 'optk-css-'));
    const outDir = join(root, 'out');
    try {
      writeFileSync(
        join(root, 'styles.css'),
        '@import "./more.css";\nbody { color: red; }\n',
      );
      writeFileSync(join(root, 'more.css'), '.x { display: block; }\n');

      await bundleCssEntries({
        root,
        outDir,
        cssEntries: ['styles.css'],
      });

      const outCss = join(outDir, 'styles.css');
      expect(existsSync(outCss)).toBe(true);
      const css = readFileSync(outCss, 'utf8');
      expect(css).toMatch(/color:\s*red/);
      expect(css).toMatch(/display:\s*block/);
      expect(existsSync(join(outDir, '__obsidian_css_bundle__.js'))).toBe(
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
