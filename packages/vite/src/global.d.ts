declare global {
  var __obsidian__: typeof import('obsidian');
  var __VITE_DEV__: {
    origin: string;
    mode: string;
    outDir: string;
    nodeVersion: string;
    store?: import('./ui').DevServerStore;
  };
  var $RefreshReg$: () => void;
  var $RefreshSig$: (type: unknown) => unknown;
  var __vite_plugin_react_preamble_installed__: boolean;
}

export {};