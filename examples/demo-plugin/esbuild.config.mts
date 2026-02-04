import { ServeResult } from 'esbuild';
import process from 'process';
import { createEsbuildObsidianContext } from '@obsidian-plugin-toolkit/esbuild';
import banner from '../../common/banner.mjs';

const prod = process.argv[2] === 'production';

const outdir = 'dist';

let serveConfig = {
  port: 4040,
  host: 'localhost',
};

const context = await createEsbuildObsidianContext({
  esbuildConfig: {
    outdir,
    sourcemap: prod ? false : 'inline',
    minify: prod,
    banner: {
      js: banner,
    },
  },
  obsidianPluginsConfig: {
    copyManifest: {
      outdir,
      manifestSrc: 'manifest.json',
    },
    serve: {
      port: serveConfig.port,
      host: serveConfig.host,
      onStartServe: async (): Promise<ServeResult> => {
        console.log('Starting esbuild serve...');
        const serve = await context.serve({
          servedir: outdir,
        });
        return serve;
      },
    },
  },
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
