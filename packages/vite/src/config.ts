import type { ConfigEnv } from 'vite';
import type { ViteObsidianPluginOptions } from './types';

export type { ViteObsidianPluginOptions };

export type ObsidianPTKConfig =
  | Partial<ViteObsidianPluginOptions>
  | ((env: ConfigEnv) => Partial<ViteObsidianPluginOptions>);

export function defineConfig(config: ObsidianPTKConfig): ObsidianPTKConfig {
  return config;
}
