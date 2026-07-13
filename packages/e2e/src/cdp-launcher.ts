import ObsidianLauncher from 'obsidian-launcher';
import type { PluginEntry, ThemeEntry } from 'obsidian-launcher';
import { waitForPort } from './cdp-session';

export type { PluginEntry, ThemeEntry };

export type LaunchObsidianForCdpOptions = {
  vault?: string;
  plugins?: PluginEntry[];
  themes?: ThemeEntry[];
  appVersion?: string;
  installerVersion?: string;
  /** CDP port to open. Default `9333`. */
  cdpPort?: number;
  /** CDP host to bind. Default `'127.0.0.1'`. */
  cdpHost?: string;
  /** How long to wait for the CDP port to become available. Default `60000` ms. */
  timeoutMs?: number;
  /** Extra Electron/Chromium flags appended after `--remote-debugging-port`. */
  args?: string[];
  verbose?: boolean;
};

export type ObsidianCdpSession = {
  /** CDP base URL, e.g. `http://127.0.0.1:9333` */
  url: string;
  close: () => Promise<void>;
};

/**
 * Launch Obsidian with a CDP port open and wait until it is reachable.
 *
 * Requires `obsidian-launcher` to be installed.
 *
 * Use with {@link withCdpSession} or `obsidian-cdp-util` in a second terminal
 * for interactive selector inspection.
 *
 * @example
 * const session = await launchObsidianForCdp({ cdpPort: 9333 });
 * // Terminal 2: obsidian-cdp-util eval 'document.title'
 * await session.close();
 */
export async function launchObsidianForCdp(
  options?: LaunchObsidianForCdpOptions,
): Promise<ObsidianCdpSession> {
  const {
    vault,
    plugins,
    themes,
    appVersion,
    installerVersion,
    cdpPort = 9333,
    cdpHost = '127.0.0.1',
    timeoutMs = 60000,
    args = [],
    verbose = false,
  } = options ?? {};

  const launcher = new ObsidianLauncher();

  const { proc } = await launcher.launch({
    vault,
    plugins,
    themes,
    appVersion,
    installerVersion,
    args: [
      `--remote-debugging-port=${cdpPort}`,
      ...(process.env.OBSIDIAN_LAUNCHER_ARGS ?? '').split(' ').filter(Boolean),
      ...args,
    ],
  });

  if (verbose) {
    console.log(`Obsidian launched with PID ${proc.pid}`, { args: proc.spawnargs });
  }

  await waitForPort(cdpPort, cdpHost, timeoutMs);

  return {
    url: `http://${cdpHost}:${cdpPort}`,
    close: () =>
      new Promise<void>((resolve) => {
        if (proc.killed) { resolve(); return; }
        proc.once('exit', () => resolve());
        proc.kill();
      }),
  };
}
