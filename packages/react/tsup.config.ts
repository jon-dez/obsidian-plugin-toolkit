import { defineConfig } from 'tsup';
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
  // The plugin using our library will provide these.
  external: ['obsidian', 'react', 'react-dom'],
  banner: {
    js: banner,
  },
});
