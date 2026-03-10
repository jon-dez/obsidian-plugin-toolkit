declare global {
  var __obsidian__: typeof import('obsidian');
  var __VITE_DEV_ORIGIN__: string;
  var __VITE_DEV_STORE__: {
    getServer: () => {
      connectionStatus: 'connected' | 'disconnected';
      url: URL;
      disconnect: () => void;
      connect: () => void;
      reloadPlugin: () => void;
    };
  };
  var $RefreshReg$: () => void;
  var $RefreshSig$: (type: unknown) => unknown;
  var __vite_plugin_react_preamble_installed__: boolean;
}

export {};