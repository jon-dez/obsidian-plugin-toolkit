/**
 * Development loader for Obsidian + Vite React Fast Refresh.
 * 1) Expose a shimmed Obsidian API (including a dev Plugin subclass) on globalThis.__obsidian__.
 * 2) Install the Vite React Refresh preamble.
 * 3) Connect to Vite's HMR client.
 * 4) Dynamically import the actual plugin entry from the Vite dev server and export it.
 *
 * Dev config is injected at build time via __VITE_DEV__ (JSON).
 */

import * as obsidian from 'obsidian';
import type { DevLogEntry, DevServerStore } from './ui';
import { virtual } from './const/plugins';
export * from 'obsidian';

/** Injected at build time; parsed once and assigned to globalThis.__VITE_DEV__. */
declare const __VITE_DEV__: typeof globalThis.__VITE_DEV__;

function initViteDev(): NonNullable<typeof globalThis.__VITE_DEV__> {
  const g = globalThis as typeof globalThis & { __VITE_DEV__?: typeof globalThis.__VITE_DEV__ };
  if (g.__VITE_DEV__ && typeof g.__VITE_DEV__.origin === 'string') {
    return g.__VITE_DEV__;
  }
  console.log('__VITE_DEV__', __VITE_DEV__);
  g.__VITE_DEV__ = __VITE_DEV__;
  return __VITE_DEV__;
}

const viteDev = initViteDev();
const origin = viteDev.origin;

const devComponentClass = 'vite-obsidian-dev-component';

interface DevPluginLike {
  app: obsidian.App;
  manifest: { id: string };
}

function createDevStore(plugin: DevPluginLike): DevServerStore {
  const url = new URL(origin);
  const listeners = new Set<() => void>();
  let state: ReturnType<DevServerStore['getServer']> = {
    url,
    lastEvent: null,
    lastError: null,
    mode: viteDev.mode,
    origin,
    outDir: viteDev.outDir,
    nodeVersion: viteDev.nodeVersion,
    logs: [],
    reloadPlugin() {
      const { app, manifest } = plugin;
      app.plugins.disablePlugin(manifest.id).then(() => {
        app.plugins.enablePlugin(manifest.id);
      });
    },
  };

  const notify = () => {
    for (const cb of listeners) cb();
  };

  const update = (
    partial: Partial<Omit<ReturnType<DevServerStore['getServer']>, 'reloadPlugin'>>,
  ) => {
    state = { ...state, ...partial };
    notify();
  };

  return {
    getServer: () => state,
    subscribe(cb: () => void) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    setError(error) {
      update({ lastError: error });
    },
    setLastEvent(info) {
      update({ lastEvent: info });
    },
    appendLog(entry: DevLogEntry) {
      const maxLogs = 50;
      const nextLogs = [...state.logs, entry];
      update({
        logs: nextLogs.slice(-maxLogs),
      });
    },
  };
}

export class Plugin extends obsidian.Plugin {
  dev?: DevPlugin;
  async onload() {
    console.log('Plugin loaded', { plugin: this });
    await super.onload();
  }
}

class DevPlugin extends obsidian.Plugin {
  #inner?: obsidian.Plugin;
  readonly #innerPromise: Promise<obsidian.Plugin>;
  #devModeUI = new WeakMap<obsidian.PluginSettingTab, DevModeUI>();

  constructor(...args: ConstructorParameters<typeof obsidian.Plugin>) {
    super(...args);
    this.#innerPromise = DevPlugin.load(this).then((PluginClass) => {
      const inner = (this.#inner = new PluginClass(...args));

      const originalAddSettingTab = inner.addSettingTab;

      inner.addSettingTab = (...args: Parameters<typeof originalAddSettingTab>) => {
        this.addSettingTab(...args);
        // originalAddSettingTab.apply(inner, args);
      };


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

    try {
      await import(
        /* @vite-ignore */ new URL(virtual.hmrLogger, url).toString()
      );
    } catch (error) {
      console.warn('Failed to load Vite HMR logger from dev server.', error);
    }

    const store =
      viteDev.store ??
      createDevStore(plugin);
    viteDev.store = store;
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

  override addSettingTab(settingTab: obsidian.PluginSettingTab): void {
    const store = viteDev.store;
    if (!store || this.#devModeUI.has(settingTab)) {
      return super.addSettingTab(settingTab);
    }

    const devModeUI = new DevModeUI(this, settingTab, store);
    this.#devModeUI.set(settingTab, devModeUI);
    this.register(() => {
      devModeUI.hide();
      this.#devModeUI.delete(settingTab);
    });

    return super.addSettingTab(settingTab);
  }
}

const devEntryPath = '/src/main.ts';

export default DevPlugin;

class DevModeUI {
  #rootEl?: HTMLElement;
  #unmount?: () => void;

  constructor(
    public plugin: obsidian.Plugin,
    public settingTab: obsidian.PluginSettingTab,
    public store: DevServerStore,
  ) {
    const originalDisplay = settingTab.display;
    settingTab.display = () => {
      originalDisplay.apply(settingTab);
      this.display();
    };

    const originalHide = settingTab.hide;
    settingTab.hide = () => {
      this.hide();
      originalHide.apply(settingTab);
    };
  }

  display() {
    const { settingTab, plugin, store } = this;
    const parentEl = settingTab.containerEl.ownerDocument.body;
    if (!parentEl) {
      return;
    }

    this.hide();

    const container = (this.#rootEl = parentEl.createDiv({
      cls: devComponentClass,
      attr: {
        style:
          'position: absolute; display: block; bottom: 0; right: 0; z-index: calc(var(--layer-modal) + 1);',
        'data-plugin-id': plugin.manifest.id,
      },
    }));

    const server = store.getServer();

    (async () => {
      try {
        const devUiUrl = new URL(virtual.devUi, server.url);
        const mod = await import(
          /* @vite-ignore */ devUiUrl.toString()
        );
        const mountDevUi: ((options: {
          container: HTMLElement;
          store: DevServerStore;
          settingTab: obsidian.PluginSettingTab;
        }) => () => void) =
          (mod as any).mountDevUi ?? (mod as any).default;

        if (typeof mountDevUi === 'function') {
          this.#unmount = mountDevUi({
            container,
            store,
            settingTab,
          });
        }
      } catch (error) {
        console.error('Failed to load Vite dev UI from dev server.', error);
      }
    })();
  }

  hide() {
    if (this.#unmount) {
      this.#unmount();
      this.#unmount = undefined;
    }
    this.#rootEl?.remove();
    this.#rootEl = undefined;
  }
}

