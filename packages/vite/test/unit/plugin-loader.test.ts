import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createServer, type ViteDevServer } from 'vite';
import { vitePluginLoaderPlugin, ARTIFACT_ENDPOINT_PREFIX } from '../../src/plugins/plugin-loader';

const PLUGIN_ID = 'test-plugin';
const META_URL = (base: string) => `${base}${ARTIFACT_ENDPOINT_PREFIX}/${PLUGIN_ID}`;
const FILE_URL = (base: string, file: string) => `${META_URL(base)}/${file}`;

async function startServer(outDir: string, manifestPath: string): Promise<ViteDevServer> {
  const server = await createServer({
    configFile: false,
    logLevel: 'silent',
    server: { port: 0 },
    plugins: [vitePluginLoaderPlugin({ outDir, manifestPath })],
  });
  await server.listen();
  return server;
}

function serverBase(server: ViteDevServer): string {
  const addr = server.httpServer?.address();
  if (!addr || typeof addr === 'string') throw new Error('Unexpected server address');
  return `http://localhost:${addr.port}`;
}

describe('vitePluginLoaderPlugin middleware', () => {
  let tmpDir: string;
  let outDir: string;
  let manifestPath: string;
  let server: ViteDevServer;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `vite-test-${Math.random().toString(36).slice(2)}`);
    outDir = join(tmpDir, 'dist');
    mkdirSync(outDir, { recursive: true });

    manifestPath = join(tmpDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify({ id: PLUGIN_ID, version: '1.0.0' }));

    writeFileSync(join(outDir, 'main.js'), 'console.log("hello")');
    writeFileSync(join(outDir, 'manifest.json'), JSON.stringify({ id: PLUGIN_ID }));
  });

  afterEach(async () => {
    await server?.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('metadata endpoint returns list of files in outDir', async () => {
    server = await startServer(outDir, manifestPath);
    const res = await fetch(META_URL(serverBase(server)));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('cache-control')).toBe('no-store');
    const body = await res.json() as { files: string[] };
    expect(body.files).toContain('main.js');
    expect(body.files).toContain('manifest.json');
    expect(body.files).not.toContain('styles.css');
  });

  it('metadata endpoint reflects outDir at request time (not at plugin init)', async () => {
    server = await startServer(outDir, manifestPath);
    writeFileSync(join(outDir, 'styles.css'), 'body {}');
    const res = await fetch(META_URL(serverBase(server)));
    const body = await res.json() as { files: string[] };
    expect(body.files).toContain('styles.css');
  });

  it('serves a JS file with correct content-type', async () => {
    server = await startServer(outDir, manifestPath);
    const res = await fetch(FILE_URL(serverBase(server), 'main.js'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/javascript');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.text()).toBe('console.log("hello")');
  });

  it('serves a JSON file with correct content-type', async () => {
    server = await startServer(outDir, manifestPath);
    const res = await fetch(FILE_URL(serverBase(server), 'manifest.json'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('serves a CSS file with correct content-type', async () => {
    writeFileSync(join(outDir, 'styles.css'), 'body { color: red; }');
    server = await startServer(outDir, manifestPath);
    const res = await fetch(FILE_URL(serverBase(server), 'styles.css'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/css');
    expect(await res.text()).toBe('body { color: red; }');
  });

  it('passes through (404) for a missing file', async () => {
    server = await startServer(outDir, manifestPath);
    const res = await fetch(FILE_URL(serverBase(server), 'nonexistent.js'));
    expect(res.status).toBe(404);
  });

  it('passes through for an unrelated URL', async () => {
    server = await startServer(outDir, manifestPath);
    const res = await fetch(`${serverBase(server)}/some/other/path`);
    expect(res.status).toBe(404);
  });

  it('rejects path traversal attempts', async () => {
    server = await startServer(outDir, manifestPath);
    const res = await fetch(FILE_URL(serverBase(server), '../manifest.json'));
    expect(res.status).toBe(404);
  });

  it('emits HMR event when a file in outDir changes', async () => {
    server = await startServer(outDir, manifestPath);
    const sendSpy = vi.spyOn(server.ws, 'send');

    const mainJsPath = join(outDir, 'main.js');
    server.watcher.emit('change', mainJsPath);

    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'custom',
        event: 'obsidian-toolkit:artifacts-updated',
        data: expect.objectContaining({
          manifestId: PLUGIN_ID,
          files: ['main.js'],
        }),
      }),
    );
  });

  it('does not emit HMR event for changes outside outDir', async () => {
    server = await startServer(outDir, manifestPath);
    const sendSpy = vi.spyOn(server.ws, 'send');

    server.watcher.emit('change', join(tmpDir, 'some-other-file.js'));

    expect(sendSpy).not.toHaveBeenCalledWith(
      expect.objectContaining({ event: 'obsidian-toolkit:artifacts-updated' }),
    );
  });
});
