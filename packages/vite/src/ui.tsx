import { Container } from '@obsidian-plugin-toolkit/react';
import { Button, Modal, Text } from '@obsidian-plugin-toolkit/react/components';
import { Group, Setting } from '@obsidian-plugin-toolkit/react/components/setting/group';
import * as obsidian from 'obsidian';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';

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
  listArtifacts(): Promise<string[]>;
  syncArtifacts(files: string[]): Promise<void>;
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
    }).catch(() => {
      // File doesn't exist yet — no history
    });
  }, [modalOpen, connection.manifestId]);

  const handleDownloadLatest = async () => {
    setIsSyncing(true);
    try {
      const files = await store.listArtifacts();
      if (files.length > 0) await store.syncArtifacts(files);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectHistoryUrl = (url: string) => {
    store.setServerUrl(url);
  };

  return (
    <Container>
      <Button
        onClick={() => {
          setModalOpen(true);
        }}
      >
        Dev Menu
      </Button>
      <Modal
        open={modalOpen}
        modalProps={settingTab}
        onClose={() => {
          setModalOpen(false);
        }}
      >
        <Group heading="Development Server">
          <Setting
            slots={{
              name: 'URL',
              desc: connection.lastError ?? undefined,
              control: (
                <>
                  <Text
                    value={connection.url.toString()}
                    onChange={(value) => {
                      try {
                        store.setServerUrl(value);
                      } catch {
                        // Invalid URL — ignore until user finishes typing
                      }
                    }}
                  />
                  <Button
                    onClick={() => {
                      window.open(connection.url, '_blank');
                    }}
                  >
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
                    onChange={(e) => {
                      if (e.target.value) handleSelectHistoryUrl(e.target.value);
                    }}
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
                <Button
                  onClick={() => {
                    connection.reloadPlugin();
                  }}
                >
                  Reload plugin
                </Button>
              ),
            }}
          />
          <Setting
            slots={{
              name: 'Download latest',
              desc: 'Fetch the latest built artifacts from the Vite server and install them.',
              control: (
                <Button
                  onClick={() => {
                    if (!isSyncing) void handleDownloadLatest();
                  }}
                >
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
                const description = log.detail
                  ? `${time} — ${log.detail}`
                  : time;
                return (
                  <Setting
                    key={index}
                    slots={{
                      name: log.kind,
                      desc: description,
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
  const root = createRoot(container);
  root.render(
    <DevelopmentModeUI store={store} settingTab={settingTab} />,
  );
  return () => {
    root.unmount();
  };
}
