import path from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import type { Plugin } from 'vite';
import type { DevelopmentLoaderOptions } from '../types';
import { getServerUrlFromUrls, readManifestId } from './shared';

/** URL path prefix for the artifact serving middleware. */
export const ARTIFACT_ENDPOINT_PREFIX = '/~obsidian-toolkit/dist';

function listOutDirFiles(outDir: string): string[] {
  try {
    return readdirSync(outDir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * Vite plugin that serves built plugin artifacts over HTTP and notifies connected
 * Obsidian clients via HMR when they change. Clients download and install
 * the new files automatically.
 *
 * Artifacts served at: `GET /~obsidian-toolkit/dist/<plugin-id>/<filename>`
 * HMR event emitted:   `obsidian-toolkit:artifacts-updated`
 */
export function vitePluginLoaderPlugin(
  options: Pick<DevelopmentLoaderOptions, 'outDir' | 'manifestPath'>,
): Plugin {
  const { outDir, manifestPath } = options;
  const manifestId = readManifestId(manifestPath);
  const resolvedOutDir = path.resolve(outDir);

  return {
    name: 'obsidian-vite-plugin-loader',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!manifestId) return next();
        const metaEndpoint = `${ARTIFACT_ENDPOINT_PREFIX}/${manifestId}`;
        const prefix = `${metaEndpoint}/`;
        const url = (req.url ?? '').split('?')[0];

        // Metadata endpoint: lists files currently in outDir
        if (url === metaEndpoint || url === `${metaEndpoint}/`) {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          res.end(JSON.stringify({ files: listOutDirFiles(outDir) }));
          return;
        }

        if (!url.startsWith(prefix)) return next();

        const fileName = url.slice(prefix.length);
        // Reject path traversal
        if (fileName.includes('/') || fileName.includes('\\')) return next();

        const filePath = path.join(outDir, fileName);
        if (!existsSync(filePath)) return next();

        const ext = path.extname(fileName);
        const contentType =
          ext === '.js' ? 'application/javascript'
          : ext === '.css' ? 'text/css'
          : ext === '.json' ? 'application/json'
          : ext === '.map' ? 'application/json'
          : 'text/plain';

        try {
          const content = readFileSync(filePath);
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'no-store');
          res.end(content);
        } catch {
          next();
        }
      });

      return async () => {
        server.watcher.add(resolvedOutDir);

        server.watcher.on('change', (file) => {
          if (path.dirname(path.resolve(file)) !== resolvedOutDir) return;
          const fileName = path.basename(file);
          const serverUrl = getServerUrlFromUrls(server.resolvedUrls);
          console.log(`[obsidian-toolkit] artifact updated: ${fileName}`);
          server.ws.send({
            type: 'custom',
            event: 'obsidian-toolkit:artifacts-updated',
            data: { manifestId, files: [fileName], serverUrl },
          });
        });

        // Emit an initial event so a freshly-connected client syncs immediately
        const existing = listOutDirFiles(outDir);
        if (existing.length > 0 && manifestId) {
          const serverUrl = getServerUrlFromUrls(server.resolvedUrls);
          server.ws.send({
            type: 'custom',
            event: 'obsidian-toolkit:artifacts-updated',
            data: { manifestId, files: existing, serverUrl },
          });
        }
      };
    },
  };
}
