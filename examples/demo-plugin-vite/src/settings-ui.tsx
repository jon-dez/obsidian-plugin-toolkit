import { Container } from '@obsidian-plugin-toolkit/react';
import {
  Button,
  Dropdown,
  Modal,
  Text,
} from '@obsidian-plugin-toolkit/react/components';
import {
  Group,
  Setting,
} from '@obsidian-plugin-toolkit/react/components/setting/group';
import { useRef, useState } from 'react';
import { DevelopmentModeUI } from './dev-ui';
import type { DevServerStore } from './dev-ui';
import type { SettingsTab } from './settings';

declare global {
  const __VITE_DEV_STORE__: DevServerStore | undefined;
}

export function SettingsView({ settingTab }: { settingTab: SettingsTab }) {
  return (
    <Container>
      {typeof __VITE_DEV_STORE__ !== 'undefined' && __VITE_DEV_STORE__ && (
        <Group heading="Development">
          <DevelopmentModeUI
            store={__VITE_DEV_STORE__}
            settingTab={settingTab}
          />
        </Group>
      )}
      <Group heading="Demo Setting Group">
        <DemoTextSetting />
        <DemoDropdownSetting />
        <DemoModalSetting settingTab={settingTab} />
      </Group>
    </Container>
  );
}

function DemoTextSetting() {
  return (
    <Setting
      slots={{
        control: <Text onChange={(value) => console.log(value)} />,
        name: 'Demo Text Setting',
        desc: 'This is a demo text setting',
        info: 'This is a demo text setting info',
      }}
    />
  );
}

function DemoDropdownSetting() {
  const optionsRef = useRef<{ [key: string]: string }>({
    option1: 'Option 1',
    option2: 'Option 2',
    option3: 'Option 3',
  });
  const [value, setValue] = useState('option1');

  return (
    <Setting
      slots={{
        control: (
          <Dropdown
            onChange={(value) => setValue(value)}
            options={optionsRef.current}
            value={value}
          />
        ),
        name: 'Demo Dropdown Setting',
        desc: 'This is a demo dropdown setting',
        info: 'This is a demo dropdown setting info',
      }}
    />
  );
}

function DemoModalSetting({ settingTab }: { settingTab: SettingsTab }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Setting
        slots={{
          name: 'Demo button and modal',
          desc: (
            <>
              If you click the button, a modal will open with a sub setting
              group. The modal will automatically close when the setting tab is
              destroyed. (e.g. when your plugin is unloaded)
            </>
          ),
          control: <Button onClick={() => setModalOpen(true)}>Click me</Button>,
        }}
      />
      <Modal
        modalProps={settingTab}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <Group heading="Settings within a modal">
          <DemoTextSetting />
          <Setting
            slots={{
              name: 'Unload plugin',
              desc: "This will unload the plugin. Don't worry, we will automatically re-enable the plugin after 3 seconds.",
              control: (
                <Button
                  onClick={() => {
                    settingTab.plugin.unload();
                    setTimeout(() => {
                      settingTab.plugin.load();
                    }, 3000);
                  }}
                >
                  Unload plugin
                </Button>
              ),
            }}
          />
        </Group>
      </Modal>
    </>
  );
}

