/**
 * Vite plugin loader client — runs inside Obsidian via the dev server's HMR channel.
 * Listens for artifact-updated events and delegates to the store's syncArtifacts method.
 */

interface ArtifactsUpdatedPayload {
  manifestId: string;
  files: string[];
  serverUrl: string;
}

const hot = import.meta.hot;
if (hot) {
  hot.on('obsidian-toolkit:artifacts-updated', (data: ArtifactsUpdatedPayload) => {
    console.log(
      'Received artifacts-updated event from Vite dev server:',
      data
    );
    void globalThis.__VITE_DEV__?.store?.syncArtifacts(data.files);
  });
}
