import { ButtonComponent } from 'obsidian';
import { ReactNode, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useComponentContainer } from 'src/providers/container';

function useObsidianButton() {
  const container = useComponentContainer();
  return useMemo(() => {
    if (!container) return null;
    return new ButtonComponent(container);
  }, [container]);
}

export function Button({
  children,
  onClick,
  icon,
  tooltip,
}: {
  children?: ReactNode;
  icon?: Parameters<ButtonComponent['setIcon']>[0];
  tooltip?:
    | Parameters<ButtonComponent['setTooltip']>[0]
    | {
        tooltip: Parameters<ButtonComponent['setTooltip']>[0];
        options?: Parameters<ButtonComponent['setTooltip']>[1];
      };
  onClick?: Parameters<ButtonComponent['onClick']>[0];
}) {
  const button = useObsidianButton();

  useEffect(() => {
    if (!button) return;
    if (onClick) button.onClick(onClick);
    if (icon !== undefined) button.setIcon(icon);
    if (tooltip !== undefined) {
      const args =
        typeof tooltip === 'string'
          ? ([tooltip, undefined] as const)
          : ([tooltip.tooltip, tooltip.options] as const);
      button.setTooltip(...args);
    }
  }, [button, onClick, icon, children]);

  return !button ? undefined : <>{createPortal(children, button.buttonEl)}</>;
}
