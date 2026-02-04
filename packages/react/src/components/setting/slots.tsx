import { Setting as ObsidianSetting, Setting } from 'obsidian';
import { createPortal } from 'react-dom';
import { SettingContext } from '../../context/setting';
import { ReactNode, useMemo } from 'react';
import { ContainerProvider } from 'src/providers/container';

function SettingSlot({
  children,
  containerEl,
}: {
  children?: ReactNode;
  containerEl: HTMLElement;
}) {
  return (
    <ContainerProvider containerEl={containerEl}>
      {createPortal(children, containerEl)}
    </ContainerProvider>
  );
}

export function Slots({
  children,
  setting,
  slots: {
    info: infoSlot,
    name: nameSlot,
    desc: descSlot,
    control: controlSlot,
  } = {},
}: {
  children?: ReactNode;
  setting: ObsidianSetting;
  slots?: {
    control?: ReactNode;
    info?: ReactNode;
    name?: ReactNode;
    desc?: ReactNode;
  };
}) {
  return (
    <SettingContext.Provider value={setting}>
      <SettingSlot containerEl={setting.controlEl}>{controlSlot}</SettingSlot>
      <SettingSlot containerEl={setting.descEl}>{descSlot}</SettingSlot>
      <SettingSlot containerEl={setting.infoEl}>{infoSlot}</SettingSlot>
      <SettingSlot containerEl={setting.nameEl}>{nameSlot}</SettingSlot>
      <SettingSlot containerEl={setting.settingEl}>{children}</SettingSlot>
    </SettingContext.Provider>
  );
}
