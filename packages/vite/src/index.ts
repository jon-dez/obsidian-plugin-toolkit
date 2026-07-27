import fs from 'node:fs';
import path from 'node:path';

import { loadConfigFromFile, type ConfigEnv } from 'vite';

import { createViteObsidianPlugin } from './create';
import type { ViteObsidianPluginOptions } from './types';

export { createViteObsidianPlugin } from './create';
export { defineConfig } from './config';
export type { ViteObsidianPluginOptions };

const knownObsidianPTKConfigNames = ['mts', 'cts', 'ts', 'js', 'mjs', 'cjs'].map(
  (ext) => `obsidian-plugin-toolkit.config.${ext}`,
);

type Config = Partial<ViteObsidianPluginOptions> & {
  configPath?: string | false;
};

function resolveConfigEnv(): ConfigEnv {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    command: isProduction ? 'build' : 'serve',
    mode: process.env.NODE_ENV ?? 'development',
  };
}

function findObsidianPTKConfigPath(root: string, configPath?: string | false): string | undefined {
  if (configPath === false) {
    return undefined;
  }

  if (configPath) {
    const absolutePath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(root, configPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Obsidian PTK config not found at ${absolutePath}`);
    }
    return absolutePath;
  }

  const existing = knownObsidianPTKConfigNames
    .map((name) => path.resolve(root, name))
    .filter((file) => fs.existsSync(file));

  if (existing.length > 1) {
    console.warn(
      `[obsidian-plugin-toolkit] Multiple obsidian-plugin-toolkit config files found; using ${existing[0]}.`,
    );
  }

  return existing[0];
}

/**
 * Reads `obsidian-plugin-toolkit.config.*` from the project root, merges it
 * with any inline `config` options (inline takes precedence), and returns an
 * array of Vite plugins via {@link createViteObsidianPlugin}.
 *
 * Pass `configPath: false` to skip config file loading entirely.
 */
export default async function viteObsidian(config: Config = {}) {
  const {
    configPath,
    ...otherConfig
  } = config;

  const root = process.cwd();
  const resolvedConfigPath = findObsidianPTKConfigPath(root, configPath);

  let ptkConfig: Partial<ViteObsidianPluginOptions> = {};
  if (resolvedConfigPath) {
    const loaded = await loadConfigFromFile(
      resolveConfigEnv(),
      resolvedConfigPath,
      root,
      'warn',
    );
    if (loaded?.config) {
      ptkConfig = loaded.config as Partial<ViteObsidianPluginOptions>;
    }
  }

  const nextConfig = {
    ...otherConfig,
    ...ptkConfig,
  };

  return createViteObsidianPlugin(nextConfig);
}
