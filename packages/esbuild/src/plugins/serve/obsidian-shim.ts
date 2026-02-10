import * as obsidian from 'obsidian';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { DevelopmentModeUI, DevServerStore } from './ui';
import { createElement } from 'react';
export * from 'obsidian';

const devComponentClass = 'esbuild-obsidian-dev-component';

/**
 * This class is used to shim {@linkcode obsidian.Plugin} to bridge it with the development server.
 */
export class Plugin extends obsidian.Plugin {
  #devModeUI = new WeakMap<obsidian.PluginSettingTab, DevModeUI>();
  #store: DevServerStore | undefined;
  override async onload() {
    console.debug('Obsidian shim loaded', { plugin: this });
    // Only attempt to connect if our injected config exists
    if (typeof DEVELOPMENT_SERVER !== 'undefined' && DEVELOPMENT_SERVER) {
      this.setupHotReload(DEVELOPMENT_SERVER);
    }
    return await super.onload();
  }

  private setupHotReload(server: { host: string; port: number }) {
    if (!DEVELOPMENT_SERVER) {
      return;
    }
    const url = new URL(
      `http://${DEVELOPMENT_SERVER.host}:${DEVELOPMENT_SERVER.port}`,
    );

    console.log(
      `Attaching to Obsidian development server at ${url.toString()}`,
    );
    let esbuildEventSource: EventSource | undefined;

    const listeners = new Set<() => void>();

    const updateState = (
      newState: Partial<ReturnType<DevServerStore['getServer']>>,
    ) => {
      state = {
        ...state,
        ...newState,
      };
      listeners.forEach((callback) => {
        callback();
      });
    };

    let state: ReturnType<DevServerStore['getServer']> = {
      connectionStatus: 'disconnected',
      url,
      disconnect: () => {
        if (
          !esbuildEventSource ||
          esbuildEventSource.readyState === EventSource.CLOSED
        ) {
          return;
        }

        esbuildEventSource.close();
        esbuildEventSource = undefined;
        console.log('Obsidian development server connection closed');

        updateState({
          connectionStatus: 'disconnected',
        });
      },
      connect: () => {
        if (esbuildEventSource) {
          console.log(
            'Obsidian development server event source already exists',
          );
          return;
        }
        console.log('Connecting to Obsidian development server');
        esbuildEventSource = new EventSource(new URL(`/esbuild`, url));
        console.log('Event source created', esbuildEventSource);
        updateState({
          connectionStatus: 'connecting',
        });

        const downloadPlugin = async (files?: string[]) => {
          console.log('Downloading plugin from Obsidian development server');
          try {
            if (!this.manifest.dir) {
              throw new Error('Manifest directory not found');
            }
            if (Array.isArray(files) && files.length > 0) {
              const pluginPath = this.manifest.dir;
              for (const file of files) {
                const pluginFile = path.join(pluginPath, file);
                const res = await fetch(new URL(file, url));
                const text = await res.text();
                await this.app.vault.adapter.write(pluginFile, text);
                console.log('Updated file:', pluginFile);
              }
            }
            await this.app.plugins.disablePlugin(this.manifest.id);
            await this.app.plugins.enablePlugin(this.manifest.id);
            console.log('Plugin successfully re-enabled');
          } catch (error) {
            console.error('Error reloading plugin:', error);
          }
        };

        esbuildEventSource.addEventListener('error', (event) => {
          console.error('Error event received:', event);
        });

        esbuildEventSource.addEventListener('change', async (event) => {
          console.log('Change event received:', event);
          const data = JSON.parse(event.data);
          const { updated } = data;

          await downloadPlugin(updated);
        });

        esbuildEventSource.addEventListener('open', () => {
          console.log('Obsidian development server connection opened');
          updateState({
            connectionStatus: 'connected',
          });
        });
      },
    };

    this.register(() => {
      state.disconnect();
    });

    this.#store = {
      getServer: () => {
        return state;
      },
      subscribe: (callback) => {
        console.log('Subscribing to Obsidian development server');
        listeners.add(callback);
        return () => {
          console.log('Unsubscribing from Obsidian development server');
          listeners.delete(callback);
        };
      },
    };

    state.connect();
  }

  /**
   * This method is used to add the development server component to the setting tab.
   */
  override addSettingTab(settingTab: obsidian.PluginSettingTab) {
    if (!this.#store || this.#devModeUI.has(settingTab)) {
      return super.addSettingTab(settingTab);
    }

    console.log('Adding setting tab', { settingTab });

    const devModeUI = new DevModeUI(this, settingTab, this.#store);
    this.#devModeUI.set(settingTab, devModeUI);
    this.register(() => {
      devModeUI.hide();
      this.#devModeUI.delete(settingTab);
    });

    return super.addSettingTab(settingTab);
  }
}

class DevModeUI {
  #rootEl?: HTMLElement;
  #root?: Root;

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

    const root = (this.#root = createRoot(
      (this.#rootEl = parentEl.createDiv({
        cls: devComponentClass,
        attr: {
          style:
            'position: absolute; display: block; bottom: 0; right: 0; z-index: calc(var(--layer-modal) + 1);',
          'data-plugin-id': plugin.manifest.id,
        },
      })),
    ));

    root.render(
      createElement(DevelopmentModeUI, {
        store,
        settingTab,
      }),
    );
  }

  hide() {
    this.#rootEl?.remove();
    this.#rootEl = undefined;
    this.#root?.unmount();
    this.#root = undefined;
  }
}
