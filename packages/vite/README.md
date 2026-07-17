### `@obsidian-plugin-toolkit/vite`

`@obsidian-plugin-toolkit/vite` is a small helper for building Obsidian plugins with Vite. It wraps Vite's configuration so you can focus on your plugin code instead of wiring up manifests, dev builds, and bundler defaults.

It is designed to work alongside the rest of `@obsidian-plugin-toolkit` and follows Obsidian's plugin packaging conventions.

---

### Installation

```bash
npm install --save-dev @obsidian-plugin-toolkit/vite
# or
pnpm add -D @obsidian-plugin-toolkit/vite
# or
yarn add -D @obsidian-plugin-toolkit/vite
```

You'll also need Vite and (optionally) the React plugin if you're building a React-based UI:

```bash
npm install --save-dev vite @vitejs/plugin-react
```

---

### Quick start

**`obsidian-plugin-toolkit.config.ts`** — plugin options live here, auto-loaded by `obsidian()`:

```ts
import { defineConfig } from '@obsidian-plugin-toolkit/vite/config'
import path from 'path'

export default defineConfig(({ command }) => {
  const prod = command === 'build'
  return {
    entryPoints: ['src/main.ts'],
    manifestPath: path.resolve(import.meta.dirname, 'manifest.json'),
    outDir: prod
      ? path.resolve(import.meta.dirname, 'dist', 'production')
      : path.resolve(import.meta.dirname, 'dist', 'development'),
  }
})
```

**`vite.config.ts`** — Vite options and plugins:

```ts
import { defineConfig } from 'vite'
import obsidian from '@obsidian-plugin-toolkit/vite'
import react from '@vitejs/plugin-react'

const prod = process.env.NODE_ENV === 'production'

export default defineConfig(() => ({
  plugins: [
    react(),
    obsidian(),
  ],
  build: {
    emptyOutDir: true,
    sourcemap: !prod,
    minify: prod,
    target: 'es2023',
  },
}))
```

Then run:

```bash
npx vite dev
npx vite build
```

---

### How development mode works

When you run `vite dev`, the toolkit writes a CJS development loader (`main.js`) into `outDir`. Point your Obsidian vault's plugin directory at that folder and enable the plugin — Obsidian will load the shim, which bootstraps Vite's HMR client and dynamically imports your actual plugin code from the dev server.

#### Artifact sync

Whenever a file in `outDir` changes (e.g. `manifest.json`, `styles.css`, or the shim itself), the Vite server notifies connected Obsidian clients via an HMR event. The plugin running inside Obsidian fetches the updated files directly from the Vite dev server and installs them into the plugin directory, snapshotting the previous version first.

This also works across machines — any Obsidian client that can reach the Vite server's URL will receive updates.

The Dev Menu (accessible from the plugin's settings tab) lets you:

- View and edit the Vite server URL
- Switch between previously connected servers
- Manually trigger a download of the latest artifacts
- Reload the plugin (also triggered automatically when downloaded artifacts differ from what's on disk)

Snapshots of previous artifact versions are stored at:
```
<vault>/.obsidian/.@obsidian-plugin-toolkit/vite/<plugin-id>/snapshots/<timestamp>/
```

Connection history is stored at:
```
<vault>/.obsidian/.@obsidian-plugin-toolkit/vite/<plugin-id>/connections.json
```

---

### API

#### Config file (`@obsidian-plugin-toolkit/vite/config`)

**`defineConfig(config)`** — Type helper for `obsidian-plugin-toolkit.config.*` files. Accepts a plain options object or a `(env: ConfigEnv) => options` function. Returns the same value — useful only for type inference.

**Config options (`ViteObsidianPluginOptions`):**

- **`entryPoints`**: Array of entry files (e.g. `['src/main.ts']` or `['src/main.ts', 'src/styles.css']`). First entry is the main JS; `.css` entries are bundled into a single stylesheet in `outDir`. Default: `['src/main.ts']`.
- **`outDir`**: Output directory for the built plugin. Default: `process.cwd()`.
- **`manifestPath`**: Path to your `manifest.json` (copied into `outDir`). Default: `'manifest.json'`.
- **`loader`**: Optional overrides for the development loader. Pass an object to override `shimPath`, `watchShim`, `root`, or `vaultRoot`. The `vaultRoot` is auto-detected from `outDir` when `outDir` is inside `.obsidian/plugins/`.
- **`development`**: Deprecated. Use `loader` instead.

#### Vite plugin (`@obsidian-plugin-toolkit/vite`)

**`default export` (async function)** — Reads `obsidian-plugin-toolkit.config.*` from the project root, merges it with any inline options, and returns an array of Vite plugins. Use as the primary entry point in `vite.config.ts`.

**`createViteObsidianPlugin(options)`** — Lower-level alternative; returns the same array of Vite plugins but bypasses config file loading. Useful when you want full control inline.

---

### Typical project layout

```text
my-obsidian-plugin/
  manifest.json
  package.json
  vite.config.ts
  obsidian-plugin-toolkit.config.ts   ← optional; plugin options, auto-loaded
  src/
    main.ts
    styles.css
    ...
  dist/
    development/
    production/
```

See [`examples/demo-plugin-vite`](../../examples/demo-plugin-vite/) for a working example with React.

---

### Goals and non-goals

- **Goals**
  - Provide a batteries-included Vite config for Obsidian plugins.
  - Make dev build output, manifests, and React integration straightforward.
  - Keep configuration explicit and TypeScript-friendly.

- **Non-goals**
  - Replace Vite's own config entirely; you can still layer your own Vite plugins and options on top.
  - Handle publishing or packaging; those concerns typically live in your own scripts.
