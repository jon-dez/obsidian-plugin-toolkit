import { spawn } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchObsidianForCdp } from './cdp-launcher';
import { evaluateCdpExpression, waitForPort } from './cdp-session';
import type { ObsidianCdpSession } from './cdp-launcher';

// Ports chosen to avoid conflict with the default (9333) and each other.
const PORT_A = 9334;
const PORT_B = 9335;

// ---------------------------------------------------------------------------
// Xvfb — auto-start when running in CI without a display
// ---------------------------------------------------------------------------

let stopXvfb: (() => Promise<void>) | undefined;

if (process.env.CI && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
  beforeAll(async () => {
    const display = ':99';
    const xvfb = spawn('Xvfb', [display, '-screen', '0', '1280x720x24'], { stdio: 'ignore' });
    process.env.DISPLAY = display;
    // Give Xvfb time to bind the display before Obsidian launches.
    await new Promise(r => setTimeout(r, 500));
    stopXvfb = () => new Promise(resolve => {
      xvfb.once('exit', () => resolve());
      xvfb.kill();
    });
  }, 10_000);

  afterAll(async () => {
    await stopXvfb?.();
  });
}

// ---------------------------------------------------------------------------
// Running session — shared across URL + CDP eval tests
// ---------------------------------------------------------------------------

describe('launchObsidianForCdp — running session', () => {
  let session: ObsidianCdpSession;

  beforeAll(async () => {
    session = await launchObsidianForCdp({ cdpPort: PORT_A });
  }, 120_000);

  afterAll(async () => {
    await session?.close();
  });

  it('returns a reachable CDP URL', async () => {
    const res = await fetch(`${session.url}/json/version`);
    expect(res.ok).toBe(true);
  });

  it('supports evaluating expressions via CDP', async () => {
    const result = await evaluateCdpExpression({ cdpPort: PORT_A }, '1 + 1');
    expect(result).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Lifecycle — tests close() behaviour with its own session
// ---------------------------------------------------------------------------

describe('launchObsidianForCdp — lifecycle', () => {
  it('close() terminates Obsidian, releases the port, and is idempotent', async () => {
    const session = await launchObsidianForCdp({ cdpPort: PORT_B });

    await session.close();

    // Port should no longer be reachable.
    await expect(waitForPort(PORT_B, '127.0.0.1', 1000)).rejects.toThrow();

    // Calling close() again must not throw.
    await expect(session.close()).resolves.toBeUndefined();
  });
});
