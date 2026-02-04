import { Setting as ObsidianSetting } from 'obsidian';
import { ComponentProps, ReactNode, useEffect, useMemo } from 'react';
import { useComponentContainer } from 'src/providers/container';
import { Slots } from 'src/components/setting/slots';

interface SettingProps extends Omit<
  ComponentProps<typeof SettingComponent>,
  'setting'
> {
  /**
   * If `undefined` then the value returned by {@linkcode useComponentContainer} will be used.
   */
  containerEl?: HTMLElement;
  heading?: boolean;
}

export function Setting({
  children,
  containerEl,
  heading = false,
  slots,
  ...rest
}: SettingProps) {
  const containerFromContext = useComponentContainer();
  const setting = useMemo(() => {
    const el =
      containerEl ??
      containerFromContext ??
      (() => {
        throw new Error(
          `Expected the "${Setting.name}" component to be provided a container element.`,
        );
      })();
    const setting = new ObsidianSetting(el);
    if (heading) {
      setting.setHeading();
    }
    return setting;
  }, [containerEl, heading, containerFromContext]);

  return (
    <SettingComponent setting={setting} slots={slots} {...rest}>
      {children}
    </SettingComponent>
  );
}

export function SettingComponent({
  children,
  className = '',
  disabled = false,
  setting,
  slots,
  tooltip = '',
}: {
  children?: ReactNode;
  className?: Parameters<ObsidianSetting['setClass']>[0];
  disabled?: Parameters<ObsidianSetting['setDisabled']>[0];
  setting: ObsidianSetting;
  slots?: {
    control?: ReactNode;
    info?: ReactNode;
    name?: ReactNode;
    desc?: ReactNode;
  };
  tooltip?:
    | Parameters<ObsidianSetting['setTooltip']>[0]
    | {
        options?: Parameters<ObsidianSetting['setTooltip']>[1];
        tooltip: Parameters<ObsidianSetting['setTooltip']>[0];
      };
}) {
  useEffect(() => {
    const args =
      typeof tooltip === 'string'
        ? ([tooltip, undefined] as const)
        : ([tooltip.tooltip, tooltip.options] as const);
    setting.setTooltip(...args);
  }, [setting, tooltip]);

  useEffect(() => {
    if (className) setting.setClass(className);
  }, [setting, className]);

  useEffect(() => {
    setting.setDisabled(disabled);
  }, [setting, disabled]);

  return (
    <Slots setting={setting} slots={slots}>
      {children}
    </Slots>
  );
}
