import type { Plugin } from 'obsidian';

declare module 'obsidian' {
  interface App {
    plugins: {
      plugins: Record<string, Plugin>;
    };
  }
}
