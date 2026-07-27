import { defineConfig } from 'tsdown';
import banner from '../../common/banner.mjs';

const prod = process.env.NODE_ENV === 'production';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    deps: {
      neverBundle: ['@wdio/globals', '@wdio/types', 'wdio-obsidian-service', 'webdriverio'],
    },
    dts: true,
    clean: true,
    sourcemap: !prod,
    target: 'es2022',
    minify: prod,
    fixedExtension: false,
    banner: { js: banner },
  },
  {
    entry: { cdp: 'src/cdp.ts' },
    format: ['esm'],
    deps: {
      neverBundle: ['obsidian-launcher'],
    },
    dts: true,
    clean: false,
    sourcemap: !prod,
    target: 'es2022',
    minify: prod,
    fixedExtension: false,
    banner: { js: banner },
  },
  {
    entry: { 'cdp-util': 'scripts/cdp-util.mts' },
    format: ['esm'],
    deps: {
      neverBundle: [],
    },
    dts: false,
    clean: false,
    sourcemap: !prod,
    target: 'es2022',
    minify: prod,
    fixedExtension: false,
    banner: { js: `#!/usr/bin/env node\n${banner}` },
  },
]);
