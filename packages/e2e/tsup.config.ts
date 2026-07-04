import { defineConfig } from 'tsup';
import banner from '../../common/banner.mjs';

const prod = process.env.NODE_ENV === 'production';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    external: ['@wdio/globals', '@wdio/types', 'wdio-obsidian-service', 'webdriverio'],
    dts: {
      compilerOptions: {
        composite: false,
      },
    },
    clean: true,
    sourcemap: !prod,
    target: 'es2022',
    minify: prod,
    banner: { js: banner },
  },
  {
    entry: { cdp: 'src/cdp.ts' },
    format: ['esm'],
    external: ['obsidian-launcher'],
    dts: { compilerOptions: { composite: false } },
    clean: false,
    sourcemap: !prod,
    target: 'es2022',
    minify: prod,
    banner: { js: banner },
  },
  {
    entry: { 'cdp-util': 'scripts/cdp-util.mts' },
    format: ['esm'],
    external: [],
    clean: false,
    sourcemap: !prod,
    target: 'es2022',
    minify: prod,
    banner: { js: `#!/usr/bin/env node\n${banner}` },
  },
]);
