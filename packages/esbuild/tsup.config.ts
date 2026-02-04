import { defineConfig } from 'tsup';
import banner from '../../common/banner.mjs';

const prod = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'serve/obsidian-shim': 'src/plugins/serve/obsidian-shim.ts',
  },
  format: ['esm'],
  external: ['obsidian'],
  dts: {
    compilerOptions: {
      // https://github.com/egoist/tsup/issues/647#issuecomment-3089761334
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
