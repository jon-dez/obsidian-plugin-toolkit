/**
 * Vite plugin loader client — runs inside Obsidian via the dev server's HMR channel.
 * Listens for artifact-updated events and delegates to the store's syncArtifacts method.
 */

import { stubDevStoreMethods } from './dev-store-compat';

interface ArtifactsUpdatedPayload {
  manifestId: string;
  files: string[];
  serverUrl: string;
}

const store = globalThis.__VITE_DEV__?.store;
if (store) stubDevStoreMethods(store);

const hot = import.meta.hot;
if (hot) {
  hot.on('obsidian-toolkit:artifacts-updated', (data: ArtifactsUpdatedPayload) => {
    if (globalThis.__VITE_DEV__?.syncPaused) return;
    const s = globalThis.__VITE_DEV__?.store;
    if (!s) return;
    console.log('[obsidian-toolkit] artifacts-updated:', data.files);
    void s.syncArtifacts(data.files);
  });
}
