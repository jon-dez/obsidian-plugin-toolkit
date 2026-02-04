import { DropdownComponent } from 'obsidian';
import { ReactNode, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useComponentContainer } from 'src/providers/container';

function useObsidianDropdown(
  options?: Parameters<DropdownComponent['addOptions']>[0],
) {
  const container = useComponentContainer();
  const dropdown = useMemo(() => {
    if (!container) return null;
    const dropdown = new DropdownComponent(container);
    if (options) dropdown.addOptions(options!);
    return dropdown;
  }, [
    container,
    // When the options change, we need to re-create the dropdown
    options,
  ]);

  // The dropdown will be recreated when the options change, so we need to remove the old one from the setting slot
  useEffect(() => {
    if (!dropdown) return;
    return () => {
      dropdown.selectEl.remove();
    };
  }, [dropdown]);

  return dropdown;
}

export function Dropdown({
  children,
  options,
  onChange,
  value,
  ...rest
}: {
  children?: ReactNode;
  disabled?: boolean;
  options?: Parameters<DropdownComponent['addOptions']>[0];
  onChange?: Parameters<DropdownComponent['onChange']>[0];
  value?: string;
}) {
  const dropdown = useObsidianDropdown(options);

  useEffect(() => {
    if (!dropdown) return;
    if (onChange) dropdown.onChange(onChange);
    if (value !== undefined) dropdown.setValue(value);
  }, [dropdown, onChange, value]);

  const disabled = useMemo(() => rest.disabled, [rest]);

  useEffect(() => {
    if ('disabled' in rest) {
      dropdown?.setDisabled(rest.disabled === undefined || rest.disabled);
    } else {
      dropdown?.setDisabled(false);
    }
  }, [dropdown, disabled]);

  return !dropdown ? undefined : (
    <>{createPortal(children, dropdown.selectEl)}</>
  );
}
