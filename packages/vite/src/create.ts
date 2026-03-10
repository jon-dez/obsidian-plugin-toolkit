import obsidianShimPlugin from './plugins/obsidian-shim';
import { developmentLoaderPlugin } from './plugins/development-loader';
import type { ViteObsidianPluginOptions } from './index';
import type { AliasOptions, Plugin, UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { mkdirSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import type { Options as ReactOptions } from '@vitejs/plugin-react';
import { virtual } from './const/plugins';

export const VIRTUAL_DEV_UI_ID = virtual.devUi;
const VIRTUAL_DEV_UI_ID_PREFIX = '\0' + VIRTUAL_DEV_UI_ID;

function getDevUiFilePath(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dir, 'dev', 'ui.js');
}

function getHmrLoggerFilePath(): string {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  return path.join(dir, 'dev', 'hmr-logger.js');
}

function virtualDevUiPlugin(): Plugin {
  const devUiPath = getDevUiFilePath();
  return {
    name: 'obsidian-virtual-dev-ui',
    enforce: 'pre',
    resolveId(id) {
      if (id === VIRTUAL_DEV_UI_ID || id === VIRTUAL_DEV_UI_ID_PREFIX || id === `/${VIRTUAL_DEV_UI_ID}`) {
        return devUiPath;
      }
      return null;
    },
  };
}

function virtualHmrLoggerPlugin(): Plugin {
  const hmrLoggerPath = getHmrLoggerFilePath();
  return {
    name: 'obsidian-virtual-hmr-logger',
    enforce: 'pre',
    resolveId(id) {
      if (id === virtual.hmrLogger || id === '\0' + virtual.hmrLogger || id === `/${virtual.hmrLogger}`) {
        return hmrLoggerPath;
      }
      return null;
    },
  };
}

function createViteObsidianPlugin(
  options: ViteObsidianPluginOptions = {}
): Plugin[] {
  const plugins: Plugin[] = [obsidianShimPlugin()];

  if (options.development) {
    plugins.push(developmentLoaderPlugin(options.development));
    plugins.push(virtualDevUiPlugin());
    plugins.push(virtualHmrLoggerPlugin());
  }

  return plugins;
}

export interface CreateViteObsidianConfigOptions extends ViteObsidianPluginOptions {
  /** Project root (e.g. __dirname). Used for build entry and copy-manifest. Defaults to process.cwd(). */
  root?: string;
  /** React options for the development loader. */
  reactOptions?: ReactOptions;
  define?: Record<string, string>;
  alias?: AliasOptions;
  inspect?: boolean;
  additionalPlugins?: Plugin[];
}

export function createViteObsidianConfig(
  options: CreateViteObsidianConfigOptions = {},
) {
  const root = options.root ?? process.cwd();
  const plugins = createViteObsidianPlugin(options);
  const reactPlugin = react(options.reactOptions);

  return {
    resolve: {
      external: ['obsidian'],
      alias: options.alias,
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      exclude: ['obsidian'],
      include: ['react', 'react-dom'],
    },
    server: {
      cors: {
        origin: 'app://obsidian.md',
      },
    },
    plugins: [
      reactPlugin,
      ...plugins,
      {
        name: 'copy-manifest',
        closeBundle() {
          const outdir = path.join(root, 'dist', 'production');
          const manifestPath = path.join(root, 'manifest.json');
          mkdirSync(outdir, { recursive: true });
          copyFileSync(manifestPath, path.join(outdir, 'manifest.json'));
        },
      },
      ...(options.additionalPlugins ?? []),
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
    define: options.define,
  } as UserConfig;
}
