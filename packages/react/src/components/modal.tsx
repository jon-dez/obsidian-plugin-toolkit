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
  slots,
}: {
  modalProps: ModalProps;
  open: boolean;
  children: ReactNode;
  slots?: {
    modalEl?: {
      className?: string;
    }
  }
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

  useEffect(() => {
    if (slots?.modalEl?.className) {
      modal.modalEl.addClass(slots.modalEl.className);
    }
  }, [modal, slots?.modalEl]);

  if (!open) {
    return null;
  }

  return createPortal(
    <ContainerProvider containerEl={modal.contentEl}>
      {children}
    </ContainerProvider>,
    modal.contentEl,
  );
}
