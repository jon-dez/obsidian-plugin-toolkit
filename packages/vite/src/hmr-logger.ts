import type { DevLogEntry, DevServerStore } from './ui';

interface HotImportMeta extends ImportMeta {
  hot?: {
    on(event: string, cb: (payload: any) => void): void;
  };
}

const hot =
  typeof import.meta !== 'undefined'
    ? (import.meta as HotImportMeta).hot
    : undefined;

function getStore(): DevServerStore | undefined {
  return (globalThis as typeof globalThis & { __VITE_DEV__?: { store?: DevServerStore } })
    .__VITE_DEV__?.store;
}

function log(kind: string, detail?: string) {
  const store = getStore();
  const at = new Date();

  if (!store) {
    return;
  }

  if (typeof store.setLastEvent === 'function') {
    store.setLastEvent({ type: 'hmr', at });
  }

  if (typeof store.appendLog === 'function') {
    const entry: DevLogEntry = {
      kind,
      at,
      detail,
    };
    store.appendLog(entry);
  }
}

if (hot) {
  hot.on('vite:beforeUpdate', (payload: any) => {
    try {
      const modules = Array.isArray(payload?.updates)
        ? payload.updates
            .map((u: any) => u.path || u.acceptedPath || u.timestamp || '')
            .filter(Boolean)
        : [];
      const detail =
        modules.length > 0 ? `beforeUpdate: ${modules.join(', ')}` : 'beforeUpdate';
      log('beforeUpdate', detail);
    } catch {
      log('beforeUpdate');
    }
  });

  hot.on('vite:afterUpdate', (payload: any) => {
    try {
      const modules = Array.isArray(payload?.updates)
        ? payload.updates
            .map((u: any) => u.path || u.acceptedPath || u.timestamp || '')
            .filter(Boolean)
        : [];
      const detail =
        modules.length > 0 ? `afterUpdate: ${modules.join(', ')}` : 'afterUpdate';
      log('afterUpdate', detail);
    } catch {
      log('afterUpdate');
    }
  });

  hot.on('vite:error', (payload: any) => {
    try {
      const message =
        payload?.err?.message ??
        payload?.err?.stack ??
        payload?.message ??
        'Unknown error';
      log('error', message);
    } catch {
      log('error');
    }
  });
}

