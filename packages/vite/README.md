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

Create a `vite.config.ts` at the root of your Obsidian plugin project:

```ts
import path from 'path'
import { defineConfig } from 'vite'
import { createViteObsidianPlugin } from '@obsidian-plugin-toolkit/vite'

const prod = process.env.NODE_ENV === 'production'

export default defineConfig(() => ({
  plugins: [
    createViteObsidianPlugin({
      entryPoints: ['src/main.ts'],
      manifestPath: path.resolve(__dirname, 'manifest.json'),
      outDir: prod
        ? path.resolve(__dirname, 'dist', 'production')
        : path.resolve(__dirname, 'dist', 'development'),
    }),
  ],
  build: {
    emptyOutDir: true,
    sourcemap: !prod,
    minify: prod,
    target: 'es2023',
  },
}))
```

For React-based UIs, add `@vitejs/plugin-react` before the Obsidian plugin:

```ts
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  plugins: [
    react(),
    createViteObsidianPlugin({ /* ... */ }),
  ],
  // ...
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
- Reload the plugin

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

**`createViteObsidianPlugin(options)`** — Returns an array of Vite plugins. Add it to your `plugins` array.

**Options:**

- **`entryPoints`**: Array of entry files (e.g. `['src/main.ts']` or `['src/main.ts', 'src/styles.css']`). First entry is the main JS; `.css` entries are bundled into a single stylesheet in `outDir`. Default: `['src/main.ts']`.
- **`outDir`**: Output directory for the built plugin. Default: `process.cwd()`.
- **`manifestPath`**: Path to your `manifest.json` (copied into `outDir`). Default: `'manifest.json'`.
- **`loader`**: Optional overrides for the development loader. Pass an object to override `shimPath`, `watchShim`, `root`, or `vaultRoot`. The `vaultRoot` is auto-detected from `outDir` when `outDir` is inside `.obsidian/plugins/`.
- **`development`**: Deprecated. Use `loader` instead.

---

### Typical project layout

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
