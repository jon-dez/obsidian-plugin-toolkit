import obsidianShimPlugin from './plugins/obsidian-shim';
import { developmentLoaderPlugin } from './plugins/development-loader';
import type { ViteObsidianPluginOptions } from './index';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { mkdirSync, copyFileSync } from 'fs';

function createViteObsidianPlugin(
  options: ViteObsidianPluginOptions = {}
): Plugin[] {
  const plugins: Plugin[] = [obsidianShimPlugin()];

  if (options.development) {
    plugins.push(developmentLoaderPlugin(options.development));
  }

  return plugins;
}

export interface CreateViteObsidianConfigOptions extends ViteObsidianPluginOptions {
  /** Project root (e.g. __dirname). Used for build entry and copy-manifest. Defaults to process.cwd(). */
  root?: string;
}

export function createViteObsidianConfig(
  options: CreateViteObsidianConfigOptions = {},
) {
  const root = options.root ?? process.cwd();
  const plugins = createViteObsidianPlugin(options);
  const reactPlugin = react();

  return {
    resolve: {
      external: ['obsidian'],
    },
    optimizeDeps: {
      exclude: ['obsidian'],
    },
    server: {
      cors: {
        origin: 'app://obsidian.md',
      },
    },
    plugins: [
      ...plugins,
      reactPlugin,
      {
        name: 'copy-manifest',
        closeBundle() {
          const outdir = path.join(root, 'dist', 'production');
          const manifestPath = path.join(root, 'manifest.json');
          mkdirSync(outdir, { recursive: true });
          copyFileSync(manifestPath, path.join(outdir, 'manifest.json'));
        },
      },
    ],
    build: {
      outDir: 'dist/production',
      emptyOutDir: true,
      lib: {
        entry: path.join(root, 'src', 'main.ts'),
        formats: ['cjs'],
        fileName: () => 'main.js',
      },
      rollupOptions: {
        external: ['obsidian'],
        output: {
          exports: 'named',
        },
      },
      sourcemap: true,
      minify: false,
      target: 'es2022',
    },
  };
}
