### `@obsidian-plugin-toolkit/vite`

`@obsidian-plugin-toolkit/vite` is a small helper for building Obsidian plugins with Vite. It wraps Vite’s configuration so you can focus on your plugin code instead of wiring up manifests, dev builds, and bundler defaults.

It is designed to work alongside the rest of `@obsidian-plugin-toolkit` and follows Obsidian’s plugin packaging conventions.

---

### Installation

```bash
npm install --save-dev @obsidian-plugin-toolkit/vite
# or
pnpm add -D @obsidian-plugin-toolkit/vite
# or
yarn add -D @obsidian-plugin-toolkit/vite
```

You’ll also need Vite and (optionally) the React plugin if you’re building a React-based UI:

```bash
npm install --save-dev vite @vitejs/plugin-react
```

---

### Quick start

Create a `vite.config.ts` at the root of your Obsidian plugin project:

```ts
import path from 'path'
import type { ConfigEnv, UserConfig } from 'vite'

export default async function config(
  _env: ConfigEnv,
): Promise<UserConfig> {
  const { createViteObsidianConfig } = await import(
    '@obsidian-plugin-toolkit/vite'
  )

  return createViteObsidianConfig({
    root: __dirname,

    development: {
      // Your entrypoints for dev (script + styles, etc.)
      entryPoints: ['src/main.ts', 'src/styles.css'],

      // Where dev builds should be written
      outdir: path.resolve(__dirname, 'dist', 'development'),

      // Path to your plugin manifest.json
      manifestPath: path.resolve(__dirname, 'manifest.json'),

      // Optional: enable a file-watch shim suitable for Obsidian
      watchShim: true,
    },

    // Optional: pass through arbitrary Vite `define` values
    // define: {
    //   __APP_VERSION__: JSON.stringify('0.0.1'),
    // },

    // Optional: convenience aliases
    alias: {
      src: path.resolve(__dirname, './src'),
    },
  }) as UserConfig
}
```

Then run:

```bash
npx vite dev
npx vite build
```

---

### API

**Key fields:**

- **`root`**: Absolute path to your plugin project root (usually `__dirname` from `vite.config.ts`).
- **`development.entryPoints`**: Array of entry files for dev builds (e.g. `['src/main.ts', 'src/styles.css']`).
- **`development.outdir`**: Output directory for development builds (e.g. `dist/development`).
- **`development.manifestPath`**: Path to your `manifest.json` (used for Obsidian plugin metadata).
- **`development.watchShim`**: Optional boolean to enable file watching suitable for hot-ish iteration inside Obsidian.
- **`define`**: Optional object forwarded to Vite’s `define` option.
- **`alias`**: Optional alias map forwarded to Vite’s `resolve.alias`.
- **`reactOptions`**: Optional options for React/Babel if you are using React.

---

### Typical project layout

A minimal Obsidian plugin project using `@obsidian-plugin-toolkit/vite` usually looks like:

```text
my-obsidian-plugin/
  manifest.json
  package.json
  vite.config.ts
  src/
    main.ts
    styles.css
    ...
  dist/
    development/
    production/    # if you also emit production builds
```

You can combine this package with other `@obsidian-plugin-toolkit/*` packages (e.g. `@obsidian-plugin-toolkit/react`, `@obsidian-plugin-toolkit/esbuild`) depending on how you prefer to structure your UI and build pipeline.

---

### Goals and non-goals

- **Goals**
  - Provide a batteries-included Vite config for Obsidian plugins.
  - Make dev build output, manifests, and React integration straightforward.
  - Keep configuration explicit and TypeScript-friendly.

- **Non-goals**
  - Replace Vite’s own config entirely; you can still layer your own Vite plugins and options on top.
  - Handle publishing or packaging; those concerns typically live in your own scripts (e.g. `package.mts`).

