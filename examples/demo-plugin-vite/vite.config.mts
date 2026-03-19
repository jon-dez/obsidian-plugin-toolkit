import path from 'path';
import { defineConfig } from 'vite';
import { createViteObsidianPlugin } from '@obsidian-plugin-toolkit/vite';
import react from '@vitejs/plugin-react';

const prod = process.env.NODE_ENV === 'production';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      createViteObsidianPlugin({
        entryPoints: ['src/main.ts'],
        manifestPath: path.resolve(__dirname, 'manifest.json'),
        outDir: prod
          ? path.resolve(__dirname, 'dist', 'production')
          : path.resolve(__dirname, 'dist', 'development'),
      }),
    ],
    build: {
      emptyOutDir: true,
      sourcemap: !prod,
      minify: prod,
      target: 'es2023',
    },
  };
});
