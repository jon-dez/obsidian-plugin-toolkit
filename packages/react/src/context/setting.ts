import { Setting } from 'obsidian';
import { createContext } from 'react';

export const SettingContext = createContext<Setting | undefined>(undefined);
export const SettingGroupContext = createContext<
  | {
      containerEl: HTMLElement;
      addSetting: (cb: (setting: Setting) => void) => void;
    }
  | undefined
>(undefined);
