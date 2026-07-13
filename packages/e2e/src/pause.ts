import * as readline from 'node:readline';
import { DEFAULT_CDP } from './config';

// ── pauseE2eForTerminal ───────────────────────────────────────────────────────

export type PauseE2eForTerminalOptions = {
  /** Override config `interactive.pauseOnEnter` */
  enabled?: boolean;
};

/**
 * Blocks until the user presses Enter in the terminal.
 * No-op unless `interactive.pauseOnEnter` is set in `configureE2e()` (or `enabled: true` is passed).
 */
export async function pauseE2eForTerminal(
  message = '[e2e] Press Enter in this terminal to continue the test...',
): Promise<void> {
  if (!process.stdin.isTTY) {
    console.warn(
      '[e2e-pause] stdin is not a TTY; skipping pause. Use an interactive shell with interactive.pauseOnEnter enabled.',
    );
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise<void>((resolve) => {
    rl.question(`${message}\n`, () => {
      rl.close();
      resolve();
    });
  });
}

// ── pauseE2eForDebug ──────────────────────────────────────────────────────────

export type PauseE2eForDebugOptions = {
  /** Browser instance. Falls back to the WDIO runner global when omitted. */
  browser?: WebdriverIO.Browser;
};

/**
 * Pause for interactive debugging. Priority:
 * 1. `wdioDebug` → `browser.debug()` (WDIO REPL; Obsidian stays open)
 * 2. `pauseOnEnter` → wait for Enter in terminal
 * 3. otherwise no-op
 */
export async function pauseE2eForDebug(
  message = '[e2e] Press Enter to continue, or enable interactive.wdioDebug in configureE2e()…',
  options?: PauseE2eForDebugOptions,
): Promise<void> {
  const b = options?.browser ?? (globalThis as { browser?: WebdriverIO.Browser }).browser;
  if (!b) throw new Error('pauseE2eForDebug: wdioDebug requires a browser — pass it explicitly or run via wdio run.');
  await b.debug();
  return;
}

// ── holdObsidianForCdp ────────────────────────────────────────────────────────

/**
 * Block until Enter so Obsidian stays open for CDP / chrome://inspect.
 * Requires `interactive.pauseOnEnter` in `defineE2eConfig()`.
 * @param browser - Falls back to the WDIO runner global when omitted. Only
 *   needed when `interactive.wdioDebug` is true.
 */
export async function holdObsidianForCdp(cdpPort?: number, browser?: WebdriverIO.Browser): Promise<void> {
  const port = cdpPort ?? DEFAULT_CDP.port;

  console.log(`
[e2e-hold] Obsidian is ready for selector debugging (CDP port ${port}).

  Terminal 2:
    yarn workspace @obsidian-plugin-toolkit/e2e run cdp -- list
    yarn workspace @obsidian-plugin-toolkit/e2e run cdp -- dump

  Chrome DevTools:
    chrome://inspect → Configure → 127.0.0.1:${port} → Inspect


Press Enter in THIS terminal when finished.
`);

  await pauseE2eForDebug('[e2e-hold] Press Enter to close Obsidian and exit.', { browser });
}
