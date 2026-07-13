import type { Plugin } from 'vite';
import { builtinModules } from 'node:module';
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

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
      assertSafeOutDir(path.resolve(config.root, config.build.outDir), config.root);
    },
    config: (_) => {
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
            entry: entryPoints,
            formats: ['cjs'],
            fileName: () => 'main.js',
          },
          rollupOptions: {
            external: defaultExternal,
          },
        },
      };
    },
    buildStart(_) {
      writeManifest();
    },
    closeBundle() {
      writeManifest();
    },
  };
}
