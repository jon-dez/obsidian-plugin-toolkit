import {
  ComponentPropsWithoutRef,
  createContext,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

const ContainerContext = createContext<
  | {
      containerEl: HTMLElement;
    }
  | undefined
>(undefined);

export function useComponentContainer() {
  const container = useContext(ContainerContext);
  return container?.containerEl;
}

export function ContainerProvider({
  children,
  containerEl,
}: {
  containerEl: HTMLElement;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ containerEl }), [containerEl]);
  return (
    <ContainerContext.Provider value={value}>
      {children}
    </ContainerContext.Provider>
  );
}

/**
 * Provides a container element via context to Obsidian components.
 */
export function Container({
  children,
  ...otherContainerProps
}: {
  children: ReactNode | ((containerEl: HTMLElement) => ReactNode);
} & Omit<ComponentPropsWithoutRef<'div'>, 'children'>) {
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  return (
    <div ref={setContentEl} {...otherContainerProps}>
      {!contentEl ? undefined : (
        <ContainerProvider containerEl={contentEl}>
          {typeof children === 'function' ? children(contentEl) : children}
        </ContainerProvider>
      )}
    </div>
  );
}
