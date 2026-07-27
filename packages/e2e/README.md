# @obsidian-plugin-toolkit/e2e

Shared helpers for Obsidian plugin E2E tests using [wdio-obsidian-service](https://github.com/jesse-r-s-h/wdio-obsidian-service).

## Install

```bash
yarn add -D @obsidian-plugin-toolkit/e2e wdio-obsidian-service @wdio/globals webdriverio
```

For session recording, also install `@wdio/devtools-service`, `fluent-ffmpeg`, and `devtools` (peer of devtools-service). Requires **ffmpeg** on `PATH`.

## WDIO setup

Call `defineE2eConfig()` once from `wdio.conf.mts`. It registers options for helpers and returns WDIO fields to spread.

```ts
import { defineE2eConfig } from '@obsidian-plugin-toolkit/e2e';

const e2e = defineE2eConfig({
  rootDir: __dirname,
  record: {
    enabled: true,
    outputDir: 'test-output/e2e-recordings',
    screencast: { quality: 70 },
  },
  interactive: { pauseOnEnter: false, wdioDebug: false },
  debug: { verbose: false },
  cdp: { port: 9333, host: '127.0.0.1' },
});

export const config = {
  rootDir: __dirname,
  ...(e2e.outputDir ? { outputDir: e2e.outputDir } : {}),
  services: e2e.services(['obsidian']),
  onPrepare: e2e.onPrepare,
  capabilities: [{
    'goog:chromeOptions': {
      args: ['--remote-debugging-port=9333'],
    },
  }],
};
```

When `record.enabled` is true, `@wdio/devtools-service` writes `wdio-trace-*.json` and `wdio-video-*.webm` under `outputDir` (default `{rootDir}/test-output/e2e-recordings`).

## Config options

| Option | Purpose |
| --- | --- |
| `record.enabled` | Add devtools-service screencast |
| `record.outputDir` | Trace/video directory (relative to `rootDir` or absolute) |
| `record.screencast` | JPEG quality, max width/height, poll interval |
| `interactive.pauseOnEnter` | `pauseE2eForTerminal` / manual checkpoint tests |
| `interactive.wdioDebug` | `pauseE2eForDebug` uses `browser.debug()` |
| `debug.verbose` | `dumpMenuItems` and similar logging |
| `cdp.port` / `cdp.host` | Defaults for `holdObsidianForCdp` and the CDP CLI |

Boolean shorthand: `record: true`, `interactive: true`, `debug: true`.

## Per-run configs (demo pattern)

Use separate WDIO configs instead of environment variables:

- `wdio.conf.mts` — default (no recording, no pause)
- `wdio.record.conf.mts` — `record: { enabled: true }`
- `wdio.interactive.conf.mts` — `interactive: { pauseOnEnter: true }`

## Usage in specs

```ts
import {
  copyObsidianUrlForVaultFile,
  isE2eInteractivePauseEnabled,
  pauseE2eForDebug,
  readClipboardObsidianUrl,
} from '@obsidian-plugin-toolkit/e2e';

it('optional manual checkpoint', async function () {
  if (!isE2eInteractivePauseEnabled()) this.skip();
  await pauseE2eForTerminal('Create manual-confirmation.md, then press Enter…');
});
```

## Standalone CDP CLI

```bash
yarn workspace @obsidian-plugin-toolkit/e2e run cdp -- list
yarn workspace @obsidian-plugin-toolkit/e2e run cdp -- dump
```

Defaults: host `127.0.0.1`, port `9333` (match `cdp` in `defineE2eConfig` and `--remote-debugging-port`).
