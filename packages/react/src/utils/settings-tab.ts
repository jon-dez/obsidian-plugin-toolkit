import { PluginSettingTab } from 'obsidian';
import { createRoot, Root } from 'react-dom/client';
import React, { createElement } from 'react';

export abstract class ReactPluginSettingTab extends PluginSettingTab {
  #root?: Root;

  #resetRoot() {
    this.#root?.unmount();
    this.#root = undefined;
  }

  abstract render(): React.JSX.Element;

  /**
   * Renders a react component in the setting tab container element.
   * @inheritdoc
   */
  override display(): void {
    this.#resetRoot();
    this.#root = createRoot(this.containerEl);
    const component = createElement(this.render.bind(this), {
      settingTab: this,
    });
    this.#root.render(component);
  }

  override hide() {
    this.#resetRoot();
    super.hide();
  }
}
