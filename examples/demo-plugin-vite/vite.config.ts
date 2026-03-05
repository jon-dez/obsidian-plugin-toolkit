import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(async () => {
  const { createViteObsidianConfig } = await import(
    '@obsidian-plugin-toolkit/vite'
  );
  return createViteObsidianConfig({
    root: __dirname,
    development: {
      entryPoints: ['src/main.ts'],
      outdir: path.resolve(__dirname, 'dist', 'development'),
      manifestPath: path.resolve(__dirname, 'manifest.json'),
      watchShim: true,
    },
  });
});