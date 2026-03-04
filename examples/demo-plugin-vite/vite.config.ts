import path from 'path';
import { copyFileSync, mkdirSync } from 'fs';
import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { init, parse } from 'es-module-lexer';
import MagicString from 'magic-string';
import * as esbuild from 'esbuild';

const obsidianExternals = [
  'obsidian',
  'electron',
  '@codemirror/autocomplete',
  '@codemirror/collab',
  '@codemirror/commands',
  '@codemirror/language',
  '@codemirror/lint',
  '@codemirror/search',
  '@codemirror/state',
  '@codemirror/view',
  '@lezer/common',
  '@lezer/highlight',
  '@lezer/lr',
  ...builtinModules,
];

const devEntryPath = '/src/main.ts';

async function writeDevelopmentLoader(outdir: string, origin: string) {
  mkdirSync(outdir, { recursive: true });

  await esbuild.build({
    entryPoints: [path.resolve(__dirname, 'obsidian-shim.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    outfile: path.join(outdir, 'main.js'),
    external: ['obsidian'],
    define: {
      __VITE_DEV_ORIGIN__: JSON.stringify(origin),
    },
  });

  // Copy manifest so Obsidian can load the dev build as a plugin.
  copyFileSync(
    path.resolve(__dirname, 'manifest.json'),
    path.join(outdir, 'manifest.json'),
  );
}

export default defineConfig({
  resolve: {
    external: ['obsidian'],
  },
  optimizeDeps: {
    exclude: ['obsidian'],
  },
  server: {
    cors: {
      origin: 'app://obsidian.md'
    },
  },
  plugins: [
    {
      name: 'obsidian-shim',
      enforce: 'pre',
      resolveId(id, importer, options) {
        if(id === 'obsidian') {
          // if(importer?.startsWith('\0obsidian')) {
          //   return { id: path.resolve(__dirname, 'obsidian-shim.js'), external: true };
          // }
          return '\0obsidian';
        }
        return null;
      },
      load(id) {
        if (id === '\0obsidian') {
          return `
            // The Proxy handles any named import dynamically
            const obsidian = require('./obsidian-shim.cjs');
            globalThis.__obsidian__ = obsidian;
          `;
        }
      },
      // Only need to see import/export syntax; run before React Fast Refresh so code is still valid ESM.
      async transform(code, id) {
        // Only transform plain JS/TS source files that use valid ESM syntax.
        // Skip TSX/JSX so es-module-lexer doesn't have to parse JSX + types.
        if (
          id.includes('node_modules') ||
          !/\.(ts|js|tsx|jsx)$/.test(id) ||
          id.endsWith('.tsx') ||
          id.endsWith('.jsx')
        ) {
          return null;
        }

        await init;
        try {
          const [imports] = parse(code);
        } catch (error) {
          console.error(error, {
            code,
            id,
          });
        }
        const [imports] = parse(code);
        if (imports.length === 0) return null;

        const s = new MagicString(code);
        let hasChanged = false;

        for (const imp of imports) {
          if (imp.n === 'obsidian') {
            hasChanged = true;
            const importStatement = code.substring(imp.ss, imp.se);

            // Match named imports: { App, Plugin as P }
            const namedMatch = importStatement.match(/import\s+\{(.+)\}\s+from/s);
            // Match wildcard: * as obs
            const wildcardMatch = importStatement.match(/import\s+\*\s+as\s+(.+)\s+from/);

            let replacement = '';
            // Unique variable to avoid scope collisions
            const bridgeVar = `__obsidian_hmr_bridge__`;

            if (namedMatch) {
              // Convert 'as' to ':' for JS destructuring
              const members = namedMatch[1].replace(/\s+as\s+/g, ': ');
              replacement = `const { ${members} } = globalThis.__obsidian__;`;
            } else if (wildcardMatch) {
              replacement = `const ${wildcardMatch[1]} = globalThis.__obsidian__;`;
            } else {
              // Default import: import obsidian from 'obsidian'
              replacement = `const obsidian = globalThis.__obsidian__;`;
            }

            // Replace the 'import' line with our 'const' bridge
            s.overwrite(imp.ss, imp.se, replacement);
          }
        }

        if (!hasChanged) return null;

        return {
          code: s.toString(),
          map: s.generateMap({ source: id, hires: true })
        };
      }
    },
    react({
      // Avoid treating the Obsidian SettingsTab class as a React Fast Refresh boundary.
      // exclude: [/src\/settings\.tsx/],
    }),
    {
      name: 'obsidian-development-loader',
      configureServer(server) {
        const origin = server.config.server?.origin ?? `http://localhost:${server.config.server?.port ?? 5173}`;
        const outdir = path.resolve(__dirname, 'dist', 'development');
        const shimPath = path.resolve(__dirname, 'obsidian-shim.ts');
        const writeLoader = () => writeDevelopmentLoader(outdir, origin);

        return async () => {
          await writeLoader();
          console.log('Obsidian dev loader written to dist/development (point vault at it for HMR)');

          server.watcher.add(shimPath);
          server.watcher.on('change', (file) => {
            if (path.resolve(file) === shimPath) {
              writeLoader().then(() => {
                console.log('Obsidian dev loader rebuilt (obsidian-shim.ts changed)');
              });
            }
          });
        };
      },
      async closeBundle() {
        const origin = process.env.VITE_DEV_SERVER_ORIGIN ?? 'http://localhost:5173';
        const outdir = path.resolve(__dirname, 'dist', 'development');
        await writeDevelopmentLoader(outdir, origin);
      },
    },
    {
      name: 'copy-manifest',
      closeBundle() {
        const outdir = path.resolve(__dirname, 'dist', 'production');
        mkdirSync(outdir, { recursive: true });
        copyFileSync(
          path.resolve(__dirname, 'manifest.json'),
          path.join(outdir, 'manifest.json'),
        );
      },
    },
  ],
  build: {
    outDir: 'dist/production',
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      external: ['obsidian'],
      output: {
        exports: 'named',
        globals: {
          obsidian: 'obsidian',
        }
      },
    },
    sourcemap: true,
    minify: false,
    target: 'es2022',
  },
});
