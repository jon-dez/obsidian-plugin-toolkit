import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createViteObsidianPlugin } from '../../src/create';

const BASE_OPTS = {
  entryPoints: ['src/main.ts'],
  manifestPath: 'manifest.json',
  outDir: '/tmp/test-out',
};

describe('createViteObsidianPlugin', () => {
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('includes the plugin loader in dev mode', () => {
    const plugins = createViteObsidianPlugin(BASE_OPTS);
    const names = plugins.map((p) => p.name);
    expect(names).toContain('obsidian-vite-plugin-loader');
  });

  it('includes the development loader in dev mode', () => {
    const plugins = createViteObsidianPlugin(BASE_OPTS);
    const names = plugins.map((p) => p.name);
    expect(names).toContain('obsidian-development-loader');
  });

  it('includes virtual module plugins in dev mode', () => {
    const plugins = createViteObsidianPlugin(BASE_OPTS);
    const names = plugins.map((p) => p.name);
    expect(names).toContain('obsidian-virtual-dev-ui');
    expect(names).toContain('obsidian-virtual-hmr-logger');
    expect(names).toContain('obsidian-virtual-plugin-loader-client');
  });

  it('omits dev plugins in production', () => {
    process.env.NODE_ENV = 'production';
    const plugins = createViteObsidianPlugin(BASE_OPTS);
    const names = plugins.map((p) => p.name);
    expect(names).not.toContain('obsidian-vite-plugin-loader');
    expect(names).not.toContain('obsidian-development-loader');
    expect(names).not.toContain('obsidian-virtual-dev-ui');
  });

  it('omits dev plugins when development: false', () => {
    const plugins = createViteObsidianPlugin({ ...BASE_OPTS, development: false });
    const names = plugins.map((p) => p.name);
    expect(names).not.toContain('obsidian-vite-plugin-loader');
    expect(names).not.toContain('obsidian-development-loader');
  });

  it('always includes the builder plugin', () => {
    process.env.NODE_ENV = 'production';
    const plugins = createViteObsidianPlugin(BASE_OPTS);
    const names = plugins.map((p) => p.name);
    expect(names).toContain('vite-plugin-obsidian-plugin-builder');
  });

  it('accepts loader overrides without error', () => {
    const plugins = createViteObsidianPlugin({
      ...BASE_OPTS,
      loader: { vaultRoot: '/tmp/vault' },
    });
    const names = plugins.map((p) => p.name);
    expect(names).toContain('obsidian-vite-plugin-loader');
    expect(names).toContain('obsidian-development-loader');
  });
});
