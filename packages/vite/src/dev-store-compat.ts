/**
 * Compat stubs for DevServerStore methods added after the initial shim release.
 * Imported by both plugin-loader-client and mountDevUi so stubs are applied
 * regardless of which dev-server module the old shim happens to load first.
 */

import type { DevServerStore } from './ui';

const ARTIFACT_ENDPOINT_PREFIX = '/~obsidian-toolkit/dist';

type InternalApp = {
  plugins: { plugins: Record<string, { manifest: { dir?: string } }> };
};

export function getServerUrl(): string {
  // serverUrlOverride is set by the setServerUrl stub on old shims that lack the method
  const override = globalThis.__VITE_DEV__?.serverUrlOverride;
  if (override) return override.replace(/\/$/, '');
  const storeUrl = globalThis.__VITE_DEV__?.store?.getServer().url;
  const base = storeUrl ? storeUrl.toString() : (globalThis.__VITE_DEV__?.server ?? '');
  return base.replace(/\/$/, '');
}

export type ServerProbe = {
  reachable: boolean;
  manifestId?: string;
  files?: string[];
};

/** Probe a server URL: discovers manifestId and lists artifacts without prior knowledge of the plugin ID. */
export async function probeServer(serverUrl: string): Promise<ServerProbe> {
  const url = `${serverUrl.replace(/\/$/, '')}${ARTIFACT_ENDPOINT_PREFIX}`;
  console.log(`[obsidian-toolkit] probing ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[obsidian-toolkit] probe: server returned ${res.status}`);
      return { reachable: false };
    }
    const data = (await res.json()) as { manifestId?: string | null; files?: string[] };
    if (data.manifestId) {
      globalThis.__VITE_DEV__.manifestId = data.manifestId;
    }
    const files = Array.isArray(data.files) ? data.files : [];
    console.log(`[obsidian-toolkit] probe: manifestId=${data.manifestId ?? 'unknown'}, ${files.length} file(s)`, files);
    return { reachable: true, manifestId: data.manifestId ?? undefined, files };
  } catch (err) {
    console.warn('[obsidian-toolkit] probe: failed to reach server', err);
    return { reachable: false };
  }
}

export async function listArtifacts(): Promise<string[]> {
  const serverUrl = getServerUrl();
  let manifestId = globalThis.__VITE_DEV__?.manifestId;

  if (!manifestId) {
    const probe = await probeServer(serverUrl);
    return probe.files ?? [];
  }

  const url = `${serverUrl}${ARTIFACT_ENDPOINT_PREFIX}/${manifestId}`;
  console.log(`[obsidian-toolkit] listArtifacts: fetching ${url}`);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[obsidian-toolkit] listArtifacts: server returned ${res.status}`);
      return [];
    }
    const data = (await res.json()) as { files?: string[] };
    const files = Array.isArray(data.files) ? data.files : [];
    console.log(`[obsidian-toolkit] listArtifacts: found ${files.length} file(s)`, files);
    return files;
  } catch (err) {
    console.warn('[obsidian-toolkit] listArtifacts: failed to reach server', err);
    return [];
  }
}

export async function syncArtifacts(files: string[]): Promise<boolean> {
  const manifestId = globalThis.__VITE_DEV__?.manifestId;
  if (!manifestId) return false;

  const serverUrl = getServerUrl();
  const adapter = globalThis.app.vault.adapter;
  const configDir = globalThis.app.vault.configDir;

  const pluginDirRel =
    (globalThis.app as unknown as InternalApp).plugins.plugins[manifestId]?.manifest.dir ??
    `${configDir}/plugins/${manifestId}`;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const snapshotDirRel = `${configDir}/.@obsidian-plugin-toolkit/vite/${manifestId}/snapshots/${timestamp}`;
  let snapshotDirCreated = false;
  let anyChanged = false;

  for (const fileName of files) {
    const endpoint = `${serverUrl}${ARTIFACT_ENDPOINT_PREFIX}/${manifestId}/${fileName}`;
    let newContent: string;
    try {
      const response = await fetch(endpoint);
      if (!response.ok) {
        console.warn(`[obsidian-toolkit] server returned ${response.status} for ${fileName}`);
        continue;
      }
      newContent = await response.text();
    } catch (err) {
      console.warn(`[obsidian-toolkit] failed to fetch ${fileName}`, err);
      continue;
    }

    const currentFilePath = `${pluginDirRel}/${fileName}`;
    let current: string | undefined;
    try {
      current = await adapter.read(currentFilePath);
      if (!snapshotDirCreated) {
        await adapter.mkdir(snapshotDirRel);
        snapshotDirCreated = true;
      }
      await adapter.write(`${snapshotDirRel}/${fileName}`, current);
    } catch {
      // File doesn't exist yet — no snapshot needed
    }

    if (current === newContent) {
      console.log(`[obsidian-toolkit] ${fileName} unchanged, skipping`);
      continue;
    }

    try {
      await adapter.write(currentFilePath, newContent);
      console.log(`[obsidian-toolkit] installed ${fileName}`);
      anyChanged = true;
    } catch (err) {
      console.warn(`[obsidian-toolkit] failed to write ${fileName}`, err);
    }
  }

  const toolkitDirRel = `${configDir}/.@obsidian-plugin-toolkit/vite/${manifestId}`;
  const connectionsPath = `${toolkitDirRel}/connections.json`;
  const entry = { url: serverUrl, syncedAt: new Date().toISOString(), files };
  try {
    await adapter.mkdir(toolkitDirRel);
    let existing: object[] = [];
    try {
      const raw = await adapter.read(connectionsPath);
      existing = JSON.parse(raw) as object[];
    } catch {}
    existing.push(entry);
    await adapter.write(connectionsPath, JSON.stringify(existing, null, 2));
  } catch (err) {
    console.warn('[obsidian-toolkit] failed to update connections.json', err);
  }

  return anyChanged;
}

export function stubDevStoreMethods(store: DevServerStore): void {
  store.listArtifacts ??= listArtifacts;
  store.syncArtifacts ??= syncArtifacts;
  store.reconnect ??= () => { globalThis.__VITE_DEV__?.ws?.close(); };
  store.setServerUrl ??= (urlStr: string) => {
    try {
      globalThis.__VITE_DEV__.serverUrlOverride = new URL(urlStr).toString();
    } catch {
      // Invalid URL — ignore
    }
  };
}
