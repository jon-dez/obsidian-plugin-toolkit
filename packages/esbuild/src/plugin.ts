import path from 'path';
import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { BuildContext, Plugin } from 'esbuild';
import { createEsbuildObsidianServePlugin } from './plugins/serve';

function isProductionDetected() {
  // Standard Node.js environment variable
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  // Check if the first argument is 'production' (the example plugin on the official repository uses this)
  // so we account for this specific case
  if (process.argv[2] === 'production') {
    return true;
  }
  return false;
}

export default function createEsbuildObsidianPlugins({
  copyManifest,
  serve,
}: {
  copyManifest?: {
    /**
     * The path to the output directory.
     */
    outdir: string;
    /**
     * The path to the manifest.json file.
     */
    manifestSrc: string;
  };
  serve?: Parameters<typeof createEsbuildObsidianServePlugin>[0];
}): Plugin[] {
  return (
    [
      copyManifest && {
        name: 'esbuild-obsidian-md-copy-manifest',
        setup(build) {
          const { manifestSrc, outdir } = copyManifest;
          // Check if the output path is different from the manifest path
          if (
            path.resolve(outdir, path.basename(manifestSrc)) ===
            path.resolve(manifestSrc)
          ) {
            console.warn(
              'Output path is the same as the manifest path, ignoring copy.',
            );
            return;
          }
          build.onEnd(() => {
            const manifestDest = path.join(outdir, 'manifest.json');
            if (!existsSync(manifestSrc)) {
              throw new Error(
                `Manifest file not found at ${path.resolve(manifestSrc)}`,
              );
            }
            console.log(
              'Copying manifest.json from',
              manifestSrc,
              'to',
              manifestDest,
            );
            mkdirSync(outdir, { recursive: true });
            copyFileSync(manifestSrc, manifestDest);
          });
        },
      },
      serve &&
        (!isProductionDetected()
          ? createEsbuildObsidianServePlugin(serve)
          : (() => {
              console.warn('Production detected, skipping serve plugin');
              return undefined;
            })()),
    ] satisfies (Plugin | undefined)[]
  ).filter((plugin) => plugin !== undefined);
}
