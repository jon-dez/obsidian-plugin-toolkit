import path from 'node:path';
import { unlinkSync } from 'node:fs';
import { build, type Plugin } from 'vite';

const VIRTUAL_CSS_ENTRY = '\0obsidian-plugin-toolkit/css-entry';
const DUMMY_JS = '__obsidian_css_bundle__.js';

export function isCssEntry(entry: string): boolean {
  return entry.toLowerCase().endsWith('.css');
}

export function splitEntryPoints(entryPoints: string[]): {
  jsEntries: string[];
  cssEntries: string[];
} {
  const jsEntries: string[] = [];
  const cssEntries: string[] = [];
  for (const entry of entryPoints) {
    if (isCssEntry(entry)) cssEntries.push(entry);
    else jsEntries.push(entry);
  }
  return { jsEntries, cssEntries };
}

/**
 * Bundle CSS entrypoints into a single `styles.css` in `outDir`.
 *
 * Uses a virtual JS entry that imports the CSS files so Vite's
 * `cssCodeSplit: false` path (lib / single-stylesheet mode) is valid —
 * CSS files must not appear directly in rollup/rolldown input.
 */
export async function bundleCssEntries(options: {
  root: string;
  outDir: string;
  cssEntries: string[];
}): Promise<void> {
  const { root, outDir, cssEntries } = options;
  if (cssEntries.length === 0) return;

  const resolvedCss = cssEntries.map((entry) =>
    path.isAbsolute(entry) ? entry : path.resolve(root, entry),
  );

  const virtualCssPlugin: Plugin = {
    name: 'obsidian-virtual-css-entry',
    resolveId(id) {
      if (id === VIRTUAL_CSS_ENTRY) return id;
      return null;
    },
    load(id) {
      if (id !== VIRTUAL_CSS_ENTRY) return null;
      return resolvedCss
        .map((file) => `import ${JSON.stringify(file)};`)
        .join('\n');
    },
  };

  await build({
    configFile: false,
    root,
    plugins: [virtualCssPlugin],
    build: {
      outDir,
      emptyOutDir: false,
      cssCodeSplit: false,
      write: true,
      rollupOptions: {
        input: VIRTUAL_CSS_ENTRY,
        output: {
          entryFileNames: DUMMY_JS,
          assetFileNames: 'styles.css',
        },
      },
    },
  });

  try {
    unlinkSync(path.join(outDir, DUMMY_JS));
  } catch {
    // Dummy JS may be omitted depending on Vite/rolldown output shape.
  }
}
