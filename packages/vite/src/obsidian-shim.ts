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

function createDevStore(
  plugin: DevPluginLike,
): typeof globalThis.__VITE_DEV_STORE__ {
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
    // subscribe(cb: () => void) {
    //   throw new Error('Not implemented');
    //   // listeners.add(cb);
    //   // return () => listeners.delete(cb);
    // },
  };
}

export class Plugin extends obsidian.Plugin {
  async onload() {
    console.log('Plugin loaded', { plugin: this });
    await super.onload();
  }
}

class DevPlugin extends obsidian.Plugin {
  #inner?: obsidian.Plugin;
  readonly #innerPromise: Promise<obsidian.Plugin>;

  constructor(...args: ConstructorParameters<typeof obsidian.Plugin>) {
    super(...args);
    this.#innerPromise = DevPlugin.load(this).then((PluginClass) => {
      const inner = (this.#inner = new PluginClass(...args));
      return inner;
    });
  }

  static async load(
    plugin: DevPlugin,
  ): Promise<
    new (
      app: obsidian.App,
      manifest: obsidian.PluginManifest,
    ) => obsidian.Plugin
  > {
    const url = new URL(origin);

    const RefreshRuntime = await import(
      /* @vite-ignore */ new URL('@react-refresh', url).toString()
    );
    RefreshRuntime.injectIntoGlobalHook(globalThis);
    globalThis.$RefreshReg$ = () => {};
    globalThis.$RefreshSig$ = () => (type: unknown) => type;
    globalThis.__vite_plugin_react_preamble_installed__ = true;

    await import(/* @vite-ignore */ new URL('@vite/client', url).toString());

    globalThis.__VITE_DEV_STORE__ ??= createDevStore(plugin);
    globalThis.__obsidian__ = { ...obsidian, Plugin };

    const entryUrl = new URL(`${devEntryPath}?t=${Date.now()}`, url).toString();

    const m = await import(/* @vite-ignore */ entryUrl).then((m) => m.default);
    if (!(m.prototype instanceof Plugin)) {
      console.error(
        'Plugin was expected to be a subclass of the shimmed class.',
        {
          expected: Plugin,
          actual: m,
        },
      );
      throw new Error(
        'Plugin was expected to be a subclass of the shimmed class.',
        {
          cause: {
            expected: Plugin,
            actual: m,
          },
        },
      );
    }

    return m;
  }

  async #getInner(): Promise<obsidian.Plugin> {
    return this.#inner ?? (await this.#innerPromise);
  }

  override async onload() {
    console.log('DevPlugin loaded', { plugin: this });
    super.onload();
    const inner = await this.#getInner();
    await inner.onload();
    this.register(async () => {
      await inner.onunload();
    });
  }

  override async onunload() {
    const inner = await this.#getInner();
    await inner.onunload();
    this.#inner = undefined;
    // this.#innerPromise = undefined;
    super.onunload();
  }
}

const devEntryPath = '/src/main.ts';

export default DevPlugin;
