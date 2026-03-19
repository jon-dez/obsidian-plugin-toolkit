import obsidianShimPlugin from './plugins/obsidian-shim';
import { developmentLoaderPlugin } from './plugins/development-loader';
import type { Plugin } from 'vite';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { virtual } from './const/plugins';
import obsidianPluginBuilderPlugin from './plugins/obsidian-plugin-builder';
import type { ViteObsidianPluginOptions } from './types';

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
      if (
        id === VIRTUAL_DEV_UI_ID ||
        id === VIRTUAL_DEV_UI_ID_PREFIX ||
        id === `/${VIRTUAL_DEV_UI_ID}`
      ) {
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
      if (
        id === virtual.hmrLogger ||
        id === '\0' + virtual.hmrLogger ||
        id === `/${virtual.hmrLogger}`
      ) {
        return hmrLoggerPath;
      }
      return null;
    },
  };
}

function isProductionDetected() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Returns Vite plugins for Obsidian plugin development with support for React Fast Refresh.
 *
 * NOTE: @vitejs/plugin-react is not included in the plugins returned by this function. You must add it yourself.
 *
 * By default:
 * - The plugin will be configured with support for HMR. You can disable this by setting `development` to `false`.
 *
 * @param options - The options for the Vite Obsidian plugin.
 * @returns The Vite plugins.
 */
export function createViteObsidianPlugin(
  options: Partial<ViteObsidianPluginOptions> = {},
): Plugin[] {
  const {
    entryPoints = ['src/main.ts'],
    manifestPath = 'manifest.json',
    outDir = process.cwd(),
    development = true,
  } = options;

  const plugins: Plugin[] = [
    obsidianPluginBuilderPlugin({
      outDir,
      entryPoints,
      manifestPath,
    }),
  ];

  if (!isProductionDetected() && development) {
    plugins.push(obsidianShimPlugin());
    plugins.push(
      developmentLoaderPlugin({
        outDir,
        entryPoints,
        manifestPath,
      }),
    );
    plugins.push(virtualDevUiPlugin());
    plugins.push(virtualHmrLoggerPlugin());
  }

  return plugins;
}
