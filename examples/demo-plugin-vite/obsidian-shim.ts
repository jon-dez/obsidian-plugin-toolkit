/// @ts-check
/**
 * Development loader for Obsidian + Vite React Fast Refresh.
 * 1) Expose a shimmed Obsidian API (including a dev Plugin subclass) on globalThis.__obsidian__.
 * 2) Install the Vite React Refresh preamble.
 * 3) Connect to Vite's HMR client.
 * 4) Dynamically import the actual plugin entry from the Vite dev server and export it.
 *
 * Origin is injected at build time via __VITE_DEV_ORIGIN__.
 */

declare const __VITE_DEV_ORIGIN__: string;

import * as obsidian from 'obsidian';

const origin = __VITE_DEV_ORIGIN__;

interface DevPluginLike {
  app: obsidian.App;
  manifest: { id: string };
}

function createDevStore(plugin: DevPluginLike) {
  const url = new URL(origin);
  const listeners = new Set<() => void>();
  let state = {
    connectionStatus: 'connected' as const,
    url,
    disconnect() {},
    connect() {},
    reloadPlugin() {
      console.log('Reloading plugin:', { plugin });
      const { app, manifest } = plugin;
      app.plugins.disablePlugin(manifest.id).then(() => {
        app.plugins.enablePlugin(manifest.id);
      });
    },
  };
  return {
    getServer: () => state,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

class DevPlugin extends obsidian.Plugin {
  #plugin?: obsidian.Plugin;

  override async onload() {
    const {app, manifest} = this;

    const PluginClass = await load(this);
    console.log('Plugin loaded:', { plugin: PluginClass, this: this });

    if (this instanceof PluginClass) {
      this.#plugin = this;
    } else {
      console.log('Creating dev store', { app, manifest, this: this });
      globalThis.__VITE_DEV_STORE__ = createDevStore(this);
      this.#plugin = new PluginClass(app, manifest);
      this.#plugin.onload();
      this.register(async () => {
        await this.#plugin.onunload();
      });
    }
  }
}

// Match the esbuild shim surface: consumers importing from 'obsidian' get the shimmed Plugin.
globalThis.__obsidian__ = { ...obsidian, Plugin: DevPlugin };

const devEntryPath = '/src/main.ts';
const entryUrl = `${origin}${devEntryPath}?t=${Date.now()}`;

async function load(_plugin: DevPlugin): Promise<new (app: obsidian.App, manifest: obsidian.PluginManifest) => obsidian.Plugin> {
  // React Fast Refresh preamble (per Vite backend integration docs)
  const RefreshRuntime = await import(/* @vite-ignore */ `${origin}/@react-refresh`);
  RefreshRuntime.injectIntoGlobalHook(globalThis);
  globalThis.$RefreshReg$ = () => {
    console.log('RefreshReg');
  };
  globalThis.$RefreshSig$ = () => (type: unknown) => {
    console.log('RefreshSig', type);
    return type;
  };
  globalThis.__vite_plugin_react_preamble_installed__ = true;

  // Vite HMR client
  await import(/* @vite-ignore */ `${origin}/@vite/client`);

  // Actual plugin entry (default export should be the plugin class)
  const m = await import(/* @vite-ignore */ entryUrl);
  return m.default;
}

export default DevPlugin;


if(import.meta.hot) {
  import.meta.hot.data.plugin = DevPlugin;
  import.meta.hot.accept((newModule) => {
    console.log('Module updated:', newModule);
    // import.meta.hot.sendMessage('my:to-client', 'Hello from plugin');
    console.log('Message to client:', {
      hot: import.meta.hot,
      plugin: import.meta.hot.data.plugin,
    });
  });
}