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

### API

**`createViteObsidianPlugin(options)`** — Returns an array of Vite plugins. Add it to your `plugins` array.

**Options:**

- **`entryPoints`**: Array of entry files (e.g. `['src/main.ts']` or `['src/main.ts', 'src/styles.css']`). First entry is the main JS; `.css` entries are bundled into a single stylesheet in `outDir`. Default: `['src/main.ts']`.
- **`outDir`**: Output directory for the built plugin (e.g. `dist/development` or `dist/production`). Default: `process.cwd()`.
- **`manifestPath`**: Path to your `manifest.json` (copied into `outDir`). Default: `'manifest.json'`.

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

See [`examples/demo-plugin-vite`](../../examples/demo-plugin-vite/) for a working example with React.

---

### Goals and non-goals

- **Goals**
  - Provide a batteries-included Vite config for Obsidian plugins.
  - Make dev build output, manifests, and React integration straightforward.
  - Keep configuration explicit and TypeScript-friendly.

- **Non-goals**
  - Replace Vite’s own config entirely; you can still layer your own Vite plugins and options on top.
  - Handle publishing or packaging; those concerns typically live in your own scripts (e.g. `package.mts`).

