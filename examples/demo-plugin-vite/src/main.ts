import { Plugin } from 'obsidian';
import { SettingsTab } from './settings';

export default class PreviewPlugin extends Plugin {
  async onload() {
    // We call this to ensure the development server is attached to the plugin
    await super.onload();
    console.log('PreviewPlugin loaded:', { plugin: this });
    this.addSettingTab(new SettingsTab(this.app, this));
  }

  override async onunload() {
    console.log('PreviewPlugin unloaded:', { plugin: this });
    await super.onunload();
  }
}
