import {
  Button,
  Modal,
  Text,
} from '@obsidian-plugin-toolkit/react/components';
import {
  Group,
  Setting,
} from '@obsidian-plugin-toolkit/react/components/setting/group';
import type * as obsidian from 'obsidian';
import { useState, useSyncExternalStore } from 'react';

export interface DevServerStore {
  getServer(): {
    connectionStatus: 'connecting' | 'connected' | 'disconnected';
    url: URL;
    disconnect(): void;
    connect(): void;
    reloadPlugin?(): void;
  };
  subscribe(callback: () => void): () => void;
}

type DevServerConnection = ReturnType<DevServerStore['getServer']>;

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
    <>
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
        <Group heading="Vite Development Server">
          <Setting
            slots={{
              name: 'URL',
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
          <ConnectionSetting connection={connection} />
        </Group>
      </Modal>
    </>
  );
}

function ConnectionSetting({
  connection,
}: {
  connection: DevServerConnection;
}) {
  return (
    <Setting
      slots={{
        name: 'Connection Status',
        desc:
          connection.connectionStatus === 'connected'
            ? 'Connected'
            : connection.connectionStatus === 'connecting'
              ? 'Connecting'
              : 'Disconnected',
        control:
          connection.connectionStatus === 'connected' ? (
            connection.reloadPlugin ? (
              <Button
                onClick={() => {
                  connection.reloadPlugin?.();
                }}
              >
                Reload plugin
              </Button>
            ) : null
          ) : connection.connectionStatus === 'connecting' ? (
            <Button
              onClick={() => {
                connection.disconnect();
              }}
            >
              Cancel connection
            </Button>
          ) : (
            <Button
              onClick={() => {
                connection.connect();
              }}
            >
              Connect
            </Button>
          ),
      }}
    />
  );
}
