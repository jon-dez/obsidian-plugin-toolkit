import { defineConfig } from 'tsup';
import banner from '../../common/banner.mjs';

const prod = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'dev/ui': 'src/ui.tsx',
    'dev/obsidian-shim': 'src/obsidian-shim.ts',
    'dev/hmr-logger': 'src/hmr-logger.ts',
  },
  format: ['esm'],
  external: ['obsidian', 'vite', '@vitejs/plugin-react'],
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
  clean: true,
  sourcemap: !prod,
  target: 'es2022',
  minify: prod,
  banner: {
    js: banner,
  },
});
