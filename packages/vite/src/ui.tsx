/// <reference types="vite/client" />
import { Container } from '@obsidian-plugin-toolkit/react';
import { Button, Modal, Text } from '@obsidian-plugin-toolkit/react/components';
import { Group, Setting } from '@obsidian-plugin-toolkit/react/components/setting/group';
import * as obsidian from 'obsidian';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { getServerUrl, probeServer, stubDevStoreMethods } from './dev-store-compat';

export interface DevLogEntry {
  kind: string;
  at: Date;
  detail?: string;
}

export interface DevServerStore {
  getServer(): {
    url: URL;
    lastEvent: { type: 'hmr' | 'reload' | 'ping'; at: Date } | null;
    lastError: string | null;
    mode: string;
    outDir: string;
    nodeVersion: string;
    manifestId: string | null;
    vaultRoot: string;
    logs: DevLogEntry[];
    reloadPlugin(): void;
  };

  subscribe(callback: () => void): () => void;
  setError(error: string | null): void;
  setLastEvent(info: { type: 'hmr' | 'reload' | 'ping'; at: Date }): void;
  appendLog(entry: DevLogEntry): void;
  setServerUrl(url: string): void;
  reconnect(): void;
  listArtifacts(): Promise<string[]>;
  syncArtifacts(files: string[]): Promise<void>;
}

function ConnectionStatus({ connected, paused }: { connected: boolean; paused: boolean }) {
  const [color, label] =
    !connected ? ['var(--color-red)', 'Disconnected']
    : paused   ? ['var(--color-yellow)', 'Paused']
               : ['var(--color-green)', 'Connected'];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.85em' }}>
      <span style={{ color, lineHeight: 1 }}>●</span>
      {label}
    </span>
  );
}

export function DevelopmentModeUI({
  store,
  settingTab,
}: {
  store: DevServerStore;
  settingTab: obsidian.PluginSettingTab;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [connectionHistory, setConnectionHistory] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const connection = useSyncExternalStore(store.subscribe, store.getServer);

  // Connection state tracked locally via import.meta.hot — not via store.
  // Initialized true: if this module loaded from the dev server, we are connected.
  const [connected, setConnected] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const hot = import.meta.hot;
    if (!hot) return;
    const onConnect = () => {
      console.log('[obsidian-toolkit] HMR WebSocket connected');
      setConnected(true);
    };
    const onDisconnect = () => {
      console.log('[obsidian-toolkit] HMR WebSocket disconnected');
      setConnected(false);
    };
    hot.on('vite:ws:connect', onConnect);
    hot.on('vite:ws:disconnect', onDisconnect);
    return () => {
      hot.off('vite:ws:connect', onConnect);
      hot.off('vite:ws:disconnect', onDisconnect);
    };
  }, []);

  // Load connection history from vault on open
  useEffect(() => {
    if (!modalOpen || !connection.manifestId) return;
    const adapter = settingTab.app.vault.adapter;
    const configDir = settingTab.app.vault.configDir;
    const connectionsPath = `${configDir}/.@obsidian-plugin-toolkit/vite/${connection.manifestId}/connections.json`;
    adapter.read(connectionsPath).then((raw) => {
      const parsed = JSON.parse(raw) as { url: string }[];
      const urls = [...new Set(parsed.map((e) => e.url).filter(Boolean))].reverse();
      setConnectionHistory(urls);
    }).catch(() => {});
  }, [modalOpen, connection.manifestId]);

  const handleConnect = async () => {
    const serverUrl = getServerUrl();
    console.log(`[obsidian-toolkit] Connecting to ${serverUrl}`);
    setPaused(false);
    (globalThis.__VITE_DEV__ as unknown as Record<string, unknown>).syncPaused = false;
    setIsSyncing(true);
    try {
      const probe = await probeServer(serverUrl);
      if (!probe.reachable) {
        setConnected(false);
        return;
      }
      setConnected(true);
      const files = probe.files ?? await store.listArtifacts();
      if (files.length > 0) {
        await store.syncArtifacts(files);
      } else {
        console.log('[obsidian-toolkit] Connect: server reachable but no artifacts found');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = () => {
    console.log(`[obsidian-toolkit] Disconnecting from ${getServerUrl()}`);
    setPaused(true);
    (globalThis.__VITE_DEV__ as unknown as Record<string, unknown>).syncPaused = true;
  };

  const handleDownloadLatest = async () => {
    console.log(`[obsidian-toolkit] Downloading latest from ${getServerUrl()}`);
    setIsSyncing(true);
    try {
      const files = await store.listArtifacts();
      if (files.length > 0) {
        await store.syncArtifacts(files);
      } else {
        console.log('[obsidian-toolkit] Download latest: no artifacts found at server');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Container>
      <Button onClick={() => setModalOpen(true)}>Dev Menu</Button>
      <Modal
        open={modalOpen}
        modalProps={settingTab}
        onClose={() => setModalOpen(false)}
      >
        <Group heading="Development Server">
          <Setting
            slots={{
              name: 'Status',
              control: (
                <>
                  <ConnectionStatus connected={connected} paused={paused} />
                  {paused || !connected ? (
                    <Button onClick={() => { void handleConnect(); }}>
                      {isSyncing ? 'Connecting…' : 'Connect'}
                    </Button>
                  ) : (
                    <Button onClick={handleDisconnect}>Disconnect</Button>
                  )}
                  {!connected && (
                    <Button onClick={() => store.reconnect()}>Reconnect</Button>
                  )}
                </>
              ),
            }}
          />
          <Setting
            slots={{
              name: 'URL',
              desc: connection.lastError ?? undefined,
              control: (
                <>
                  <Text
                    value={connection.url.toString()}
                    onChange={(value) => {
                      store.setServerUrl(value);
                    }}
                  />
                  <Button onClick={() => window.open(connection.url, '_blank')}>
                    Open in browser
                  </Button>
                </>
              ),
            }}
          />
          {connection.lastEvent && (
            <Setting
              slots={{
                name: 'Last event',
                desc: `${connection.lastEvent.type} at ${connection.lastEvent.at.toLocaleTimeString()}`,
              }}
            />
          )}
          {connectionHistory.length > 0 && (
            <Setting
              slots={{
                name: 'Connection history',
                desc: 'Previously connected servers',
                control: (
                  <select
                    onChange={(e) => { if (e.target.value) store.setServerUrl(e.target.value); }}
                    defaultValue=""
                    style={{ maxWidth: '240px' }}
                  >
                    <option value="" disabled>Select a server…</option>
                    {connectionHistory.map((url) => (
                      <option key={url} value={url}>{url}</option>
                    ))}
                  </select>
                ),
              }}
            />
          )}
        </Group>
        <Group heading="Plugin Controls">
          <Setting
            slots={{
              name: 'Reload plugin',
              desc: 'Disable and re-enable the Obsidian plugin using the current Vite build.',
              control: (
                <Button onClick={() => connection.reloadPlugin()}>Reload plugin</Button>
              ),
            }}
          />
          <Setting
            slots={{
              name: 'Download latest',
              desc: 'Fetch the latest built artifacts from the Vite server and install them.',
              control: (
                <Button onClick={() => { if (!isSyncing) void handleDownloadLatest(); }}>
                  {isSyncing ? 'Downloading…' : 'Download latest now'}
                </Button>
              ),
            }}
          />
        </Group>
        {connection.logs && connection.logs.length > 0 && (
          <Group heading="HMR Events">
            {connection.logs
              .slice(-10)
              .reverse()
              .map((log, index) => {
                const time = log.at.toLocaleTimeString();
                return (
                  <Setting
                    key={index}
                    slots={{
                      name: log.kind,
                      desc: log.detail ? `${time} — ${log.detail}` : time,
                    }}
                  />
                );
              })}
          </Group>
        )}
      </Modal>
    </Container>
  );
}

export function mountDevUi(options: {
  container: HTMLElement;
  store: DevServerStore;
  settingTab: obsidian.PluginSettingTab;
}): () => void {
  const { container, store, settingTab } = options;
  stubDevStoreMethods(store);
  const root = createRoot(container);
  root.render(<DevelopmentModeUI store={store} settingTab={settingTab} />);
  return () => root.unmount();
}
