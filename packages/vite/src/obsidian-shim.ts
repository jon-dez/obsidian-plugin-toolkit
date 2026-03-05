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

const origin = __VITE_DEV_ORIGIN__;

import * as obsidian from 'obsidian';
export * from 'obsidian';

interface DevPluginLike {
  app: obsidian.App;
  manifest: { id: string };
}

function createDevStore(plugin: DevPluginLike) {
  const url = new URL(origin);
  const listeners = new Set<() => void>();
  const state = {
    connectionStatus: 'connected' as const,
    url,
    disconnect() {},
    connect() {},
    reloadPlugin() {
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

export class Plugin extends obsidian.Plugin {
  #plugin?: typeof obsidian.Plugin;
  readonly #pluginPromise: Promise<typeof obsidian.Plugin>;

  constructor(...args: ConstructorParameters<typeof obsidian.Plugin>) {
    super(...args);

    this.#pluginPromise = load().then(PluginClass => {
      this.#plugin = PluginClass;
      return PluginClass;
    });
  }

  async getPlugin(): Promise<typeof obsidian.Plugin> {
    globalThis.__VITE_DEV_STORE__ ??= createDevStore(this);
    return this.#plugin ??= await this.#pluginPromise;
  }

  get #Plugin() {
    if (!this.#plugin) {
      throw new Error('Plugin not loaded');
    }
    return this.#plugin;
  }

  override async onload() {

    const PluginClass = await this.getPlugin();
    await PluginClass.prototype.onload.call(this);
  }

  override async onunload() {
    const PluginClass = await this.getPlugin();
    await PluginClass.prototype.onunload.call(this);
    await super.onunload();
  }

  override addSettingTab(settingTab: obsidian.PluginSettingTab): void {
    if (!globalThis.__VITE_DEV_STORE__) {
      return super.addSettingTab(settingTab);
    }
    const devPlugin = this as Plugin;
    devPlugin.#Plugin.prototype.addSettingTab.call(devPlugin, settingTab);
    devPlugin.register(async () => {
      await devPlugin.#Plugin.prototype.onunload.call(devPlugin);
    });
  }
}

globalThis.__obsidian__ = { ...obsidian, Plugin };
globalThis.__obsidian__ = obsidian;

const devEntryPath = '/src/main.ts';
const entryUrl = `${origin}${devEntryPath}?t=${Date.now()}`;

declare global {
  var __obsidian__: typeof obsidian;
  var __VITE_DEV_ORIGIN__: string;
  var __VITE_DEV_STORE__: {
    getServer: () => {
      connectionStatus: 'connected' | 'disconnected';
      url: URL;
      disconnect: () => void;
      connect: () => void;
      reloadPlugin: () => void;
    };
  };
  var $RefreshReg$: () => void;
  var $RefreshSig$: (type: unknown) => unknown;
  var __vite_plugin_react_preamble_installed__: boolean;
}

async function load(): Promise<
  new (
    app: import('obsidian').App,
    manifest: import('obsidian').PluginManifest
  ) => import('obsidian').Plugin
> {
  const RefreshRuntime = await import(
    /* @vite-ignore */ `${origin}/@react-refresh`
  );
  RefreshRuntime.injectIntoGlobalHook(globalThis);
  globalThis.$RefreshReg$ = () => {};
  globalThis.$RefreshSig$ = () => (type: unknown) => type;
  globalThis.__vite_plugin_react_preamble_installed__ = true;

  await import(/* @vite-ignore */ `${origin}/@vite/client`);

  const m = await import(/* @vite-ignore */ entryUrl);
  return m.default;
}

export default Plugin
