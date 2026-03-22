import path from 'path';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'node:url';
import type { Plugin, ResolvedServerUrls } from 'vite';
import { build } from 'vite';
import type { DevelopmentLoaderOptions } from '../types';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In the published package, the shim is built as ESM at dist/hmr/obsidian-shim.js.
// We bundle that with Vite into a CJS dev loader for Obsidian.
const defaultShimPath = path.resolve(__dirname, 'dev', 'obsidian-shim.js');

const DEFAULT_SERVER_URL = 'http://localhost:5173';

function getServerUrlFromUrls(resolvedUrls: ResolvedServerUrls | null): string {
  if (!resolvedUrls) return DEFAULT_SERVER_URL;
  return resolvedUrls.local?.[0] ?? resolvedUrls.network?.[0] ?? DEFAULT_SERVER_URL;
}

async function writeDevelopmentLoader(
  outDir: string,
  resolvedUrls: ResolvedServerUrls | null,
  shimPath: string,
  projectRoot: string,
  entryPoints: string[],
): Promise<void> {
  mkdirSync(outDir, { recursive: true });

  const serverUrl = getServerUrlFromUrls(resolvedUrls);

  await build({
    configFile: false,
    root: path.dirname(shimPath),
    define: {
      __VITE_DEV__: {
        server: serverUrl,
        mode: process.env.NODE_ENV ?? 'development',
        outDir,
        nodeVersion: process.version,
      },
    },
    build: {
      outDir,
      emptyOutDir: false,
      lib: {
        entry: shimPath,
        formats: ['cjs'],
        fileName: () => 'main.js',
      },
      rollupOptions: {
        external: ['obsidian'],
        output: {
          exports: 'named',
        },
      },
      sourcemap: true,
      minify: false,
    },
  });

  // Bundle any CSS entrypoints into a single stylesheet in the outdir so
  // Obsidian can load them directly. This allows `src/styles.css` to import
  // other CSS files while still producing a single `styles.css` output.
  const cssEntries = entryPoints.filter((entry) =>
    entry.toLowerCase().endsWith('.css'),
  );

  if (cssEntries.length > 0) {
    try {
      await build({
        configFile: false,
        root: projectRoot,
        build: {
          outDir,
          emptyOutDir: false,
          rollupOptions: {
            input: cssEntries,
            output: {
              assetFileNames: 'styles.css',
            },
          },
        },
      });
    } catch (error) {
      console.warn(
        `Failed to bundle CSS entrypoints into ${outDir}/styles.css`,
        error,
        'Attempted to bundle:',
        cssEntries,
      );
    }
  }
}

/**
 * Vite plugin that writes the Obsidian development loader (CJS main.js from obsidian-shim.ts)
 * and copies the manifest. In dev, runs when the server is ready and optionally watches the shim.
 * 
 * Defaults:
 * - root: process.cwd()
 *  
 */
export function developmentLoaderPlugin(
  options: DevelopmentLoaderOptions,
): Plugin {
  const {
    outDir,
    root = process.cwd(),
    entryPoints,
    shimPath = defaultShimPath,
    watchShim = true,
  } = options;

  const writeLoader = (resolvedUrls: ResolvedServerUrls | null) =>
    writeDevelopmentLoader(
      outDir,
      resolvedUrls,
      shimPath,
      root,
      entryPoints,
    );

  let lastServerUrl = DEFAULT_SERVER_URL;

  return {
    name: 'obsidian-development-loader',
    config: (_) => {
      return {
        server: {
          cors: {
            // Requests from Obsidian will be blocked unless we allow them.
            origin: 'app://obsidian.md',
          },
        },
        optimizeDeps: {
          // Since the development loader uses React, we need to include it
          // TODO: Determine if this is necessary
          include: ['react', 'react-dom'],
        },
        resolve: {
          // Since the development loader uses React, we need to include it to avoid multiple copies of React being loaded if
          // the plugin also uses React.
          dedupe: ['react', 'react-dom'],
        },
      };
    },
    configureServer(server) {
      const onListening = () => {
        lastServerUrl = getServerUrlFromUrls(server.resolvedUrls);
        writeLoader(server.resolvedUrls).then(() => {
          console.log(
            'Obsidian dev loader written to',
            outDir,
            '(server URL:',
            lastServerUrl + ')',
          );
        });
      };

      server.httpServer?.on('listening', onListening);

      return async () => {
        await writeLoader(server.resolvedUrls);
        console.log(
          'Obsidian dev loader written to',
          outDir,
          '(point vault at it for HMR)',
        );

        if (watchShim) {
          const resolvedShim = path.resolve(shimPath);
          server.watcher.add(resolvedShim);
          server.watcher.on('change', (file) => {
            if (path.resolve(file) === resolvedShim) {
              writeLoader(server.resolvedUrls).then(() => {
                console.log(
                  `Obsidian dev loader rebuilt (${resolvedShim} changed)`,
                );
              });
            }
          });
        }
      };
    },
  };
}
