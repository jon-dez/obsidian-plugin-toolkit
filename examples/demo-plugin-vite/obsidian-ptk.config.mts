import type { ConfigEnv } from 'vite';
import type { ViteObsidianPluginOptions } from '@obsidian-plugin-toolkit/vite';
import path from 'path';

export default function obsidianPTKConfig({ command }: ConfigEnv): ViteObsidianPluginOptions {
  const dirname = import.meta.dirname;
  const prod = command === 'build';
  return {
    entryPoints: ['src/main.ts'],
    manifestPath: path.resolve(dirname, 'manifest.json'),
    outDir: prod
      ? path.resolve(dirname, 'dist', 'production')
      : path.resolve(dirname, 'dist', 'development'),
  };
}