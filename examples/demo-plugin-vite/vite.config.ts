import path from 'path';
import type { ConfigEnv, UserConfig } from 'vite';

export default async function config(
  env: ConfigEnv,
): Promise<UserConfig> {
  const { createViteObsidianConfig } = await import(
    '@obsidian-plugin-toolkit/vite'
  );
  return createViteObsidianConfig({
    root: __dirname,
    development: {
      entryPoints: ['src/main.ts'],
      outdir: path.resolve(__dirname, 'dist', 'development'),
      manifestPath: path.resolve(__dirname, 'manifest.json'),
    },
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  }) as UserConfig;
}