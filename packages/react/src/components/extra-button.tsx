import { ExtraButtonComponent } from 'obsidian';
import { ReactNode, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useComponentContainer } from 'src/providers/container';

function useObsidianExtraButton() {
  const container = useComponentContainer();
  return useMemo(() => {
    if (!container) return null;
    return new ExtraButtonComponent(container);
  }, [container]);
}

export function ExtraButton({
  children,
  onClick,
  icon,
  tooltip,
  disabled,
}: {
  children?: ReactNode;
  disabled?: Parameters<ExtraButtonComponent['setDisabled']>[0];
  icon?: Parameters<ExtraButtonComponent['setIcon']>[0];
  tooltip?:
    | Parameters<ExtraButtonComponent['setTooltip']>[0]
    | {
        tooltip: Parameters<ExtraButtonComponent['setTooltip']>[0];
        options?: Parameters<ExtraButtonComponent['setTooltip']>[1];
      };
  onClick?: Parameters<ExtraButtonComponent['onClick']>[0];
}) {
  const extraButton = useObsidianExtraButton();

  useEffect(() => {
    if (!extraButton) return;
    if (onClick) extraButton.onClick(onClick);
    if (icon !== undefined) extraButton.setIcon(icon);
    if (tooltip !== undefined) {
      const args =
        typeof tooltip === 'string'
          ? ([tooltip, undefined] as const)
          : ([tooltip.tooltip, tooltip.options] as const);
      extraButton.setTooltip(...args);
    }
    if (disabled) extraButton.setDisabled(disabled);
  }, [extraButton, onClick, icon, tooltip, disabled]);

  return !extraButton ? undefined : (
    <>{createPortal(children, extraButton.extraSettingsEl)}</>
  );
}
