import type * as obsidian from 'obsidian';

declare module 'obsidian' {
  interface App {
    plugins: {
      disablePlugin(id: string): Promise<void>;
      enablePlugin(id: string): Promise<void>;
    };
  }

  interface PluginManifest {
    /**
     * Runtime plugin directory inside the vault.
     * e.g. `<vault>/.obsidian/plugins/<plugin-id>`
     */
    dir?: string;
  }
}
