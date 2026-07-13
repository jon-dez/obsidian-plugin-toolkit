vite plugin can be configured like so:

```ts
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      // New function (default export of `@obsidian-plugin-toolkit/vite`)
      viteObsidianPlugin(/* optional config */),
    ],
```
see [demo-plugin-vite](../examples/demo-plugin-vite/vite.config.mts)