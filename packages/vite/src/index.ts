
import { type DevelopmentLoaderOptions } from './plugins/development-loader';

export interface ViteObsidianPluginOptions {
  /**
   * Development loader: writes CJS main.js from obsidian-shim.ts and copies manifest.
   * Omit or set to false to disable.
   */
  development?: DevelopmentLoaderOptions | false;
}

/**
 * Returns Vite plugins for Obsidian plugin development with React Fast Refresh.
 *
 * - Resolves and rewrites `import ... from 'obsidian'` to use the dev loader's global.
 * - Optionally writes the development loader to a directory and watches the shim.
 *
 * @example
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import react from '@vitejs/plugin-react';
 * import { createViteObsidianPlugin } from '@obsidian-plugin-toolkit/vite';
 * import path from 'path';
 *
 * export default defineConfig({
 *   plugins: [
 *     createViteObsidianPlugin({
 *       development: {
 *         outdir: path.resolve(__dirname, 'dist', 'development'),
 *         manifestPath: path.resolve(__dirname, 'manifest.json'),
 *         shimPath: path.resolve(__dirname, 'obsidian-shim.ts'), // optional, use package default
 *         watchShim: true,
 *       },
 *     }),
 *     react(),
 *   ],
 *   resolve: { external: ['obsidian'] },
 *   build: { lib: { entry: 'src/main.ts', formats: ['cjs'] }, rollupOptions: { external: ['obsidian'] } },
 * });
 */
export { createViteObsidianConfig } from './create';