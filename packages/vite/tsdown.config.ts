import { defineConfig } from 'tsdown';
import banner from '../../common/banner.mjs';

const prod = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    config: 'src/config.ts',
    'dev/ui': 'src/ui.tsx',
    'dev/obsidian-shim': 'src/obsidian-shim.ts',
    'dev/hmr-logger': 'src/hmr-logger.ts',
    'dev/plugin-loader-client': 'src/plugin-loader-client.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: !prod,
  target: 'es2022',
  minify: prod,
  fixedExtension: false,
  deps: {
    neverBundle: ['obsidian', 'vite', '@vitejs/plugin-react'],
  },
  banner: {
    js: banner,
  },
});
