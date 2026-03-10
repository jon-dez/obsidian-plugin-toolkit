import { Container } from '@obsidian-plugin-toolkit/react';
import { Button, Modal, Text } from '@obsidian-plugin-toolkit/react/components';
import { Group, Setting } from '@obsidian-plugin-toolkit/react/components/setting/group';
import * as obsidian from 'obsidian';
import { useState, useSyncExternalStore } from 'react';
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
    origin: string;
    outDir: string;
    nodeVersion: string;
    logs: DevLogEntry[];
    reloadPlugin(): void;
  };

  subscribe(callback: () => void): () => void;
  setError(error: string | null): void;
  setLastEvent(info: { type: 'hmr' | 'reload' | 'ping'; at: Date }): void;
  appendLog(entry: DevLogEntry): void;
}

export function DevelopmentModeUI({
  store,
  settingTab,
}: {
  store: DevServerStore;
  settingTab: obsidian.PluginSettingTab;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const connection = useSyncExternalStore(store.subscribe, store.getServer);

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
                  <Text value={connection.url.toString()} readonly />
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
