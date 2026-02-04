import { ToggleComponent } from 'obsidian';
import { ReactNode, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useComponentContainer } from 'src/providers/container';

function useObsidianToggle() {
  const slotEl = useComponentContainer();
  return useMemo(() => {
    if (!slotEl) return null;
    return new ToggleComponent(slotEl);
  }, [slotEl]);
}

export function Toggle({
  children,
  onChange,
  value,
}: {
  children?: ReactNode;
  onChange?: Parameters<ToggleComponent['onChange']>[0];
  value?: boolean;
}) {
  const toggle = useObsidianToggle();

  useEffect(() => {
    if (!toggle) return;
    if (onChange) toggle.onChange(onChange);
    if (value !== undefined) toggle.setValue(value);
  }, [toggle, onChange, value]);

  return !toggle ? undefined : <>{createPortal(children, toggle.toggleEl)}</>;
}
