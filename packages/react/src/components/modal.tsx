import { App, Modal as ObsidianModal } from 'obsidian';
import { ReactNode, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ContainerProvider } from 'src/providers/container';

interface ModalProps {
  app: App;
}

/**
 * A wrapper for the Obsidian {@linkcode ObsidianModal} component that allows for React rendering inside the modal.
 *
 */
export function Modal({
  open,
  modalProps,
  children,
  onClose,
}: {
  modalProps: ModalProps;
  open: boolean;
  children: ReactNode;
  onClose: () => void;
}) {
  const modal = useMemo(() => {
    return new ObsidianModal(modalProps.app).setCloseCallback(onClose);
  }, [modalProps]);

  useEffect(() => {
    return () => {
      // Modal or modalProps changed, close the old one
      modal.close();
    };
  }, [modal, modalProps]);

  useEffect(() => {
    if (open) {
      modal.open();
    } else {
      modal.close();
    }
  }, [modal, open]);

  return (
    <ContainerProvider containerEl={modal.contentEl}>
      {createPortal(children, modal.contentEl)}
    </ContainerProvider>
  );
}
