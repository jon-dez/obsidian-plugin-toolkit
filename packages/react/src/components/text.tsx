import { TextComponent } from 'obsidian';
import { ReactNode, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useComponentContainer } from 'src/providers/container';

function useObsidianText() {
  const slotEl = useComponentContainer();
  return useMemo(() => {
    if (!slotEl) return null;
    return new TextComponent(slotEl);
  }, [slotEl]);
}

export function Text({
  children,
  onChange,
  value,
  placeholder,
  readonly,
}: {
  children?: ReactNode;
  placeholder?: string;
  onChange?: Parameters<TextComponent['onChange']>[0];
  value?: string;
  readonly?: boolean;
}) {
  const text = useObsidianText();

  useEffect(() => {
    if (!text) return;
    if (onChange) text.onChange(onChange);
    text.setValue(value ?? '');
    if (placeholder !== undefined) text.setPlaceholder(placeholder);
    text.inputEl.readOnly = !!readonly;
  }, [text, onChange, value, placeholder, readonly]);

  return !text ? undefined : <>{createPortal(children, text.inputEl)}</>;
}
