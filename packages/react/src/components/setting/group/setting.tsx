import { Setting as ObsidianSetting } from 'obsidian';
import { ComponentProps, useContext, useLayoutEffect, useState } from 'react';
import { SettingGroupContext } from '../../../context/setting';
import { SettingComponent } from '../setting';

function useSettingGroupAddSetting() {
  const settingGroup = useContext(SettingGroupContext);
  const [setting, setSetting] = useState<ObsidianSetting | null>(null);
  useLayoutEffect(() => {
    if (!settingGroup) return;
    settingGroup.addSetting(setSetting);
  }, [settingGroup]);
  return setting;
}

export function Setting({
  children,
  ...props
}: Omit<ComponentProps<typeof SettingComponent>, 'setting'>) {
  const setting = useSettingGroupAddSetting();
  if (!setting) return undefined;
  return (
    <SettingComponent setting={setting} {...props}>
      {children}
    </SettingComponent>
  );
}
