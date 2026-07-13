import { defineConfig } from 'vite';
import obsidian from '@obsidian-plugin-toolkit/vite';
import react from '@vitejs/plugin-react';

const prod = process.env.NODE_ENV === 'production';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      obsidian(),
    ],
    build: {
      emptyOutDir: true,
      sourcemap: !prod,
      minify: prod,
      target: 'es2023',
    },
  };
});
