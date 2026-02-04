import { MomentFormatComponent } from 'obsidian';
import { ReactNode, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useComponentContainer } from 'src/providers/container';

function useObsidianMomentFormat() {
  const slotEl = useComponentContainer();
  return useMemo(() => {
    if (!slotEl) return null;
    return new MomentFormatComponent(slotEl);
  }, [slotEl]);
}

export function MomentFormat({
  children,
  placeholder,
  defaultFormat,
  onChange,
  value,
  sampleEl,
}: {
  children?: ReactNode;
  placeholder?: string;
  defaultFormat?: string;
  onChange?: Parameters<MomentFormatComponent['onChange']>[0];
  value?: string;
  sampleEl?: HTMLElement;
}) {
  const momentFormat = useObsidianMomentFormat();

  useEffect(() => {
    if (!momentFormat) return;
    if (onChange) momentFormat.onChange(onChange);
    if (value !== undefined) momentFormat.setValue(value);
    if (placeholder !== undefined) momentFormat.setPlaceholder(placeholder);
    if (defaultFormat !== undefined)
      momentFormat.setDefaultFormat(defaultFormat);
    if (sampleEl) momentFormat.setSampleEl(sampleEl);
  }, [momentFormat, onChange, value, placeholder, sampleEl]);

  return !momentFormat ? undefined : (
    <>{createPortal(children, momentFormat.inputEl)}</>
  );
}
