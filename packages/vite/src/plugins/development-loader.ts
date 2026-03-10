import path from 'path';
import { copyFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'node:url';
import type { Plugin, ResolvedServerUrls } from 'vite';
import { build } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface DevelopmentLoaderOptions {
  /** Output directory for the development loader (main.js) and manifest. Defaults to projectRoot/dist/development. */
  outdir: string;
  /** Entry file(s) for the plugin (used for dev server entry; first is the main entry). */
  entryPoints: string[];
  /** Path to manifest.json to copy into outdir. */
  manifestPath: string;
  /** Path to the obsidian shim source. Defaults to the package's bundled ESM shim. */
  shimPath?: string;
  /** Whether to watch the shim and rebuild on change. Default true in dev. */
  watchShim?: boolean;
}

// In the published package, the shim is built as ESM at dist/hmr/obsidian-shim.js.
// We bundle that with Vite into a CJS dev loader for Obsidian.
const defaultShimPath = path.resolve(__dirname, 'dev', 'obsidian-shim.js');

const DEFAULT_ORIGIN = 'http://localhost:5173';

function getOriginFromUrls(resolvedUrls: ResolvedServerUrls | null): string {
  if (!resolvedUrls) return DEFAULT_ORIGIN;
  return resolvedUrls.local?.[0] ?? resolvedUrls.network?.[0] ?? DEFAULT_ORIGIN;
}

async function writeDevelopmentLoader(
  outdir: string,
  resolvedUrls: ResolvedServerUrls | null,
  shimPath: string,
  manifestPath: string
): Promise<void> {
  mkdirSync(outdir, { recursive: true });

  const origin = getOriginFromUrls(resolvedUrls);

  await build({
    configFile: false,
    root: path.dirname(shimPath),
    define: {
      __VITE_DEV__: {
        origin,
        mode: process.env.NODE_ENV ?? 'development',
        outDir: outdir,
        nodeVersion: process.version,
      },
    },
    build: {
      outDir: outdir,
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
      target: 'es2022',
    },
  });

  copyFileSync(manifestPath, path.join(outdir, 'manifest.json'));
}

/**
 * Vite plugin that writes the Obsidian development loader (CJS main.js from obsidian-shim.ts)
 * and copies the manifest. In dev, runs when the server is ready and optionally watches the shim.
 */
export function developmentLoaderPlugin(
  options: DevelopmentLoaderOptions
): Plugin {
  const {
    outdir,
    manifestPath,
    entryPoints,
    shimPath = defaultShimPath,
    watchShim = true,
  } = options;

  const writeLoader = (resolvedUrls: ResolvedServerUrls | null) =>
    writeDevelopmentLoader(outdir, resolvedUrls, shimPath, manifestPath);

  return {
    name: 'obsidian-development-loader',
    configureServer(server) {
      const onListening = () => {
        writeLoader(server.resolvedUrls).then(() => {
          console.log(
            'Obsidian dev loader written to',
            outdir,
            '(origin:',
            getOriginFromUrls(server.resolvedUrls) + ')'
          );
        });
      };

      server.httpServer?.on('listening', onListening);

      return async () => {
        await writeLoader(server.resolvedUrls);
        console.log(
          'Obsidian dev loader written to',
          outdir,
          '(point vault at it for HMR)'
        );

        if (watchShim) {
          const resolvedShim = path.resolve(shimPath);
          server.watcher.add(resolvedShim);
          server.watcher.on('change', (file) => {
            if (path.resolve(file) === resolvedShim) {
              writeLoader(server.resolvedUrls).then(() => {
                console.log(
                  `Obsidian dev loader rebuilt (${resolvedShim} changed)`
                );
              });
            }
          });
        }
      };
    }
  };
}
