import { readFileSync } from 'fs';
import type { ResolvedServerUrls } from 'vite';

export const DEFAULT_SERVER_URL = 'http://localhost:5173';

export function getServerUrlFromUrls(resolvedUrls: ResolvedServerUrls | null): string {
  if (!resolvedUrls) return DEFAULT_SERVER_URL;
  return resolvedUrls.local?.[0] ?? resolvedUrls.network?.[0] ?? DEFAULT_SERVER_URL;
}

export function readManifestId(manifestPath: string): string | null {
  try {
    const raw = readFileSync(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as { id?: string };
    return typeof parsed.id === 'string' ? parsed.id : null;
  } catch {
    return null;
  }
}
