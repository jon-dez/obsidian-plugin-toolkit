export interface DevelopmentLoaderOptions {
  /** Project root (e.g. __dirname). Used for build entry. */
  root?: string;
  /** Path to the main plugin entry file. */
  entryPoints: string[];
  /** Path to the manifest.json to copy into outdir. */
  manifestPath: string;
  /** Output directory for the development loader (main.js) and manifest. Defaults to projectRoot/dist/development. */
  outDir: string;
  /** Path to the obsidian shim source. Defaults to the package's bundled ESM shim. */
  shimPath?: string;
  /** Whether to watch the shim and rebuild on change. Default true in dev. */
  watchShim?: boolean;
}

export interface ViteObsidianPluginOptions {
  /**
   * Entry file(s) for the plugin (used for dev server entry; first is the main entry).
   *
   * Any entries ending in `.css` are treated as CSS entrypoints; they are
   * bundled (including their imported styles) into a single stylesheet written
   * to the `outdir` (e.g. `src/styles.css` → `outdir/styles.css`).
   */
  entryPoints: string[];
  /** Path to manifest.json to copy into outdir. */
  manifestPath: string;
  outDir: string;
  /**
   * Development loader: writes CJS main.js from obsidian-shim.ts and copies manifest.
   * Omit or set to false to disable.
   */
  development?: false | {
    loader?: DevelopmentLoaderOptions;
  }
}