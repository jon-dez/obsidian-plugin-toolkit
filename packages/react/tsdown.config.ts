import { defineConfig } from 'tsdown';
import banner from '../../common/banner.mjs';

const prod = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'components/index': 'src/components/index.ts',
    'components/setting/index': 'src/components/setting/index.ts',
    'components/setting/group/index': 'src/components/setting/group/index.ts',
    'utils/index': 'src/utils/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: !prod,
  target: 'es2022',
  minify: prod,
  // Match package.json type:module exports (.js / .d.ts), not Node's fixed .mjs.
  fixedExtension: false,
  // The plugin using our library will provide these.
  deps: {
    neverBundle: ['obsidian', 'react', 'react-dom'],
  },
  banner: {
    js: banner,
  },
});
