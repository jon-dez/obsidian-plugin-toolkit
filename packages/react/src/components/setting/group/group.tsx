import { Setting as ObsidianSetting, SettingGroup } from 'obsidian';
import { ReactNode, useEffect, useMemo } from 'react';
import { SettingGroupContext } from '../../../context/setting';
import { createPortal } from 'react-dom';
import { useComponentContainer } from 'src/providers/container';

export function Group({
  children,
  heading,
}: {
  children: ReactNode;
  heading?: string;
}) {
  const container = useComponentContainer();
  const settingGroup = useMemo(() => {
    if (!container) return null;
    return {
      containerEl: container,
      group: new SettingGroup(container),
    };
  }, [container]);

  useEffect(() => {
    if (!settingGroup) return;
    if (heading) {
      settingGroup.group.setHeading(heading);
    }
  }, [settingGroup, heading]);

  const value = useMemo(() => {
    if (!settingGroup) return null;
    return {
      containerEl: settingGroup.containerEl,
      addSetting: (cb: (setting: ObsidianSetting) => void) => {
        settingGroup.group.addSetting(cb);
      },
    };
  }, [settingGroup]);

  if (!value) return undefined;
  return (
    <SettingGroupContext.Provider value={value}>
      {createPortal(children, value.containerEl)}
    </SettingGroupContext.Provider>
  );
}
