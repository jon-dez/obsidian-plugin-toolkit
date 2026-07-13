import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { getServerUrlFromUrls, readManifestId, DEFAULT_SERVER_URL } from '../../src/plugins/shared';

describe('getServerUrlFromUrls', () => {
  it('returns default when null', () => {
    expect(getServerUrlFromUrls(null)).toBe(DEFAULT_SERVER_URL);
  });

  it('prefers local over network', () => {
    expect(
      getServerUrlFromUrls({
        local: ['http://localhost:5173'],
        network: ['http://192.168.1.1:5173'],
      }),
    ).toBe('http://localhost:5173');
  });

  it('falls back to network when no local', () => {
    expect(
      getServerUrlFromUrls({ local: [], network: ['http://192.168.1.1:5173'] }),
    ).toBe('http://192.168.1.1:5173');
  });

  it('returns default when both arrays empty', () => {
    expect(getServerUrlFromUrls({ local: [], network: [] })).toBe(DEFAULT_SERVER_URL);
  });
});

describe('readManifestId', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `vite-test-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads id from valid manifest', () => {
    const p = join(tmpDir, 'manifest.json');
    writeFileSync(p, JSON.stringify({ id: 'my-plugin', version: '1.0.0' }));
    expect(readManifestId(p)).toBe('my-plugin');
  });

  it('returns null for missing file', () => {
    expect(readManifestId(join(tmpDir, 'nonexistent.json'))).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    const p = join(tmpDir, 'manifest.json');
    writeFileSync(p, 'not json');
    expect(readManifestId(p)).toBeNull();
  });

  it('returns null when id field is absent', () => {
    const p = join(tmpDir, 'manifest.json');
    writeFileSync(p, JSON.stringify({ name: 'My Plugin', version: '1.0.0' }));
    expect(readManifestId(p)).toBeNull();
  });

  it('returns null when id is not a string', () => {
    const p = join(tmpDir, 'manifest.json');
    writeFileSync(p, JSON.stringify({ id: 42 }));
    expect(readManifestId(p)).toBeNull();
  });
});
