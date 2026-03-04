import { ReactPluginSettingTab } from '@obsidian-plugin-toolkit/react/utils';
import type { App } from 'obsidian';
import { createElement } from 'react';
import PreviewPlugin from './main';
import { SettingsView } from './settings-ui';

export class SettingsTab extends ReactPluginSettingTab {
  constructor(
    app: App,
    public plugin: PreviewPlugin,
  ) {
    super(app, plugin);
  }
  override render() {
    return createElement(SettingsView, { settingTab: this });
  }
}
