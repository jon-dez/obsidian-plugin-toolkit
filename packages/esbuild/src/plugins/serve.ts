import { Plugin, ServeResult } from 'esbuild';
import http from 'http';
import path from 'path';

const defaultConfig = {
  port: 3000,
  host: 'localhost',
};

/**
 * This plugin is used to serve the plugin's assets
 */
export const createEsbuildObsidianServePlugin = (serve: {
  port?: number;
  host?: string;
  /**
   * The configuration for the development server, should be the same as the one passed to esbuild.serve.
   */
  setConfig?: (config: { port: number; hosts: string[] }) => void;
  /**
   *
   */
  onStartServe: () => Promise<ServeResult>;
}): Plugin => ({
  name: 'esbuild-obsidian-serve',
  setup(build) {
    const config = {
      port: serve?.port ?? defaultConfig.port,
      host: serve?.host ?? defaultConfig.host,
    };
    const { setConfig, onStartServe: onReady } = serve;
    const { proxy, setEsbuildServe, getEsbuildServe } = createProxyServer(
      config.port,
      config.host,
    );

    build.initialOptions.define = {
      ...build.initialOptions.define,
      DEVELOPMENT_SERVER: JSON.stringify(config),
    };

    const shimPath = path.resolve(
      import.meta.dirname,
      'serve',
      'obsidian-shim.js',
    );

    build.onStart(async () => {
      const currentEsbuildServe = getEsbuildServe();
      if (currentEsbuildServe) {
        return;
      }
      const esbuildServe = await onReady();
      setEsbuildServe(esbuildServe);
    });

    // Assure the shim is only applied to plugins using our library
    build.onResolve({ filter: /^obsidian$/ }, (args) => {
      const isShim =
        args.importer.includes('obsidian-shim.js') ||
        args.path.includes('obsidian-shim.js');
      if (isShim) {
        return {
          path: args.path,
          external: true,
        };
      }
      return { path: shimPath };
    });
  },
});

function createProxyServer(port: number, host: string) {
  let currentEsbuildServe: ServeResult | undefined;
  const proxy = http.createServer((req, res) => {
    // Allow requests from Obsidian (without this, Obsidian will block the request)
    res.setHeader('Access-Control-Allow-Origin', 'app://obsidian.md');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (!currentEsbuildServe) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Esbuild serve is not set');
      return;
    }
    const { port: esbuildPort, hosts: esbuildHosts } = currentEsbuildServe;

    const options = {
      hostname: esbuildHosts[0],
      port: esbuildPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy request error:', err);
      res.writeHead(502);
    });

    req.pipe(proxyReq, { end: true });
  });

  return {
    proxy,
    getEsbuildServe: () => currentEsbuildServe,
    setEsbuildServe: (esbuildServe: ServeResult) => {
      currentEsbuildServe = esbuildServe;
      if (proxy.listening) return;
      return proxy.listen(port, host, () => {
        console.log('> Obsidian development:', `http://${host}:${port}/`);
      });
    },
  };
}
