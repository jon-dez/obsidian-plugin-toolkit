import type { Plugin, ResolvedConfig } from 'vite';
import { builtinModules } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { bundleCssEntries, splitEntryPoints } from './bundle-css';

const defaultExternal = [
  'obsidian',
  'electron',
  '@codemirror/autocomplete',
  '@codemirror/collab',
  '@codemirror/commands',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/lr',
  ...builtinModules,
];

/**
 * Configures Vite to build an Obsidian plugin with appropriate bundling, externalization, and copying the manifest.json to the outdir.
 *
 */
export default function obsidianPluginBuilderPlugin(options: {
  outDir: string;
  entryPoints: string[];
  manifestPath: string;
}): Plugin {
  const { outDir, entryPoints, manifestPath } = options;
  const { jsEntries, cssEntries } = splitEntryPoints(entryPoints);
  let resolvedConfig: ResolvedConfig | undefined;

  const assertSafeOutDir = (resolvedOut: string, root: string) => {
    const prefix = resolvedOut.endsWith(path.sep)
      ? resolvedOut
      : resolvedOut + path.sep;
    if (resolvedOut === root || root.startsWith(prefix)) {
      throw new Error(
        [
          `Unsafe build.outDir detected: "${resolvedOut}"`,
          `The outDir must not be the project root or its parent.`,
          `Set outDir to a subdirectory such as "${path.join(
            root,
            'dist',
            'development',
          )}".`,
        ].join(' '),
      );
    }
  };

  const writeManifest = () => {
    const outPath = path.join(outDir, 'manifest.json');
    if (path.resolve(outPath) === path.resolve(manifestPath)) {
      console.warn(
        'Output path is the same as the manifest path, ignoring copy.',
      );
      return;
    }
    mkdirSync(outDir, { recursive: true });
    copyFileSync(manifestPath, outPath);

    console.log('Manifest copied to', outPath);
  };

  return {
    name: 'vite-plugin-obsidian-plugin-builder',
    configResolved(config) {
      resolvedConfig = config;
      assertSafeOutDir(path.resolve(config.root, config.build.outDir), config.root);
    },
    config: (_) => {
      if (jsEntries.length === 0) {
        throw new Error(
          'entryPoints must include at least one JavaScript/TypeScript entry (CSS-only builds are not supported).',
        );
      }
      return {
        optimizeDeps: {
          exclude: defaultExternal,
        },
        resolve: {
          external: defaultExternal,
        },
        build: {
          outDir,
          lib: {
            // CSS must not be in lib.entry: lib mode forces cssCodeSplit:false,
            // and Vite rejects CSS files in rollup/rolldown input in that mode.
            entry: jsEntries.length === 1 ? jsEntries[0]! : jsEntries,
            formats: ['cjs'],
            fileName: () => 'main.js',
          },
          rollupOptions: {
            external: defaultExternal,
            output: {
              // Obsidian loads a single main.js; do not emit sibling chunks.
              codeSplitting: false,
            },
          },
        },
      };
    },
    buildStart(_) {
      writeManifest();
    },
    async closeBundle() {
      writeManifest();
      if (cssEntries.length === 0) return;
      const root = resolvedConfig?.root ?? process.cwd();
      try {
        await bundleCssEntries({ root, outDir, cssEntries });
        console.log('CSS bundled to', path.join(outDir, 'styles.css'));
      } catch (error) {
        console.warn(
          `Failed to bundle CSS entrypoints into ${outDir}/styles.css`,
          error,
          'Attempted to bundle:',
          cssEntries,
        );
      }
    },
  };
}
