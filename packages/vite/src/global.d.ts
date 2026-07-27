declare global {
  var app: import('obsidian').App;
  var __obsidian__: typeof import('obsidian');
  var __VITE_DEV__: {
    server: string;
    mode: string;
    outDir: string;
    nodeVersion: string;
    manifestId: string | null;
    vaultRoot: string;
    store?: import('./ui').DevServerStore;
    ws?: WebSocket;
    syncPaused?: boolean;
    serverUrlOverride?: string;
  };
  var $RefreshReg$: () => void;
  var $RefreshSig$: (type: unknown) => unknown;
  var __vite_plugin_react_preamble_installed__: boolean;
}

export {};