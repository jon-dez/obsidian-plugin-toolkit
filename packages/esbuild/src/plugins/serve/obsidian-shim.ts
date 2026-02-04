import * as obsidian from 'obsidian';
import path from 'path';
import { createRoot, Root } from 'react-dom/client';
import { DevelopmentModeUI } from './ui';
import { createElement } from 'react';
export * from 'obsidian';

const devComponentClass = 'esbuild-obsidian-dev-component';

/**
 * This class is used to shim {@linkcode obsidian.Plugin} to bridge it with the development server.
 */
export class Plugin extends obsidian.Plugin {
  #devModeUI = new WeakMap<obsidian.PluginSettingTab, Root | undefined>();

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
    const esbuildEventSource = new EventSource(new URL(`/esbuild`, url));
    this.register(() => {
      esbuildEventSource.close();
      console.log('Obsidian development server connection closed');
    });

    esbuildEventSource.addEventListener('error', (event) => {
      console.error('Error event received:', event);
    });

    esbuildEventSource.addEventListener('change', async (event) => {
      console.log('Change event received:', event);
      const data = JSON.parse(event.data);
      const { updated } = data;

      try {
        if (!this.manifest.dir) {
          throw new Error('Manifest directory not found');
        }
        if (Array.isArray(updated) && updated.length > 0) {
          const pluginPath = this.manifest.dir;
          for (const file of updated) {
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
    });
  }

  /**
   * This method is used to add the development server component to the setting tab.
   */
  override addSettingTab(settingTab: obsidian.PluginSettingTab) {
    const DEV = DEVELOPMENT_SERVER;
    const getRoot = () => {
      return this.#devModeUI.get(settingTab);
    };
    if (!DEV || this.#devModeUI.has(settingTab)) {
      return super.addSettingTab(settingTab);
    }

    const resetRoot = () => {
      const existingRoot = getRoot();
      if (existingRoot) {
        existingRoot.unmount();
        this.#devModeUI.set(settingTab, undefined);
      }
    };

    console.log('Adding setting tab', { settingTab });
    const originalDisplay = settingTab.display;
    settingTab.display = () => {
      originalDisplay.apply(settingTab);
      const parentEl = settingTab.containerEl.parentElement;
      if (!parentEl) {
        return;
      }

      resetRoot();

      const root = createRoot(
        parentEl.createDiv({
          cls: devComponentClass,
          attr: {
            style: 'position: absolute; display: block; bottom: 0; right: 0;',
          },
        }),
      );

      root.render(
        createElement(DevelopmentModeUI, {
          developmentServerUrl: new URL(
            `http://${DEVELOPMENT_SERVER.host}:${DEVELOPMENT_SERVER.port}`,
          ),
        }),
      );
    };

    const originalHide = settingTab.hide;
    settingTab.hide = () => {
      resetRoot();
      originalHide.apply(settingTab);
    };
    return super.addSettingTab(settingTab);
  }
}
