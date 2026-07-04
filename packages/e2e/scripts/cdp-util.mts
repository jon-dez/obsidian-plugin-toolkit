/**
 * CLI companion for launchObsidianForCdp() — inspect a running Obsidian session via CDP.
 *
 * Prerequisite: Obsidian must be running with a CDP port open.
 *   Option A — programmatic: call launchObsidianForCdp() from @obsidian-plugin-toolkit/e2e/cdp
 *   Option B — WDIO runner: set interactive.pauseOnEnter in defineE2eConfig() and run wdio
 *
 * Usage (installed bin):
 *   obsidian-cdp-util list
 *   obsidian-cdp-util eval 'document.title'
 *   obsidian-cdp-util eval '(() => ({ title: document.title, url: location.href }))()'
 *   obsidian-cdp-util eval '...' --out ./snapshot.json
 *   obsidian-cdp-util wait
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  evaluateCdpExpression,
  listCdpTargets,
  waitForPort,
} from '../src/cdp-session.ts';

const DEFAULT_CDP_PORT = 9333;
const DEFAULT_CDP_HOST = '127.0.0.1';
const DEFAULT_TIMEOUT_MS = 120000;

function parseArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const CDP_PORT = Number(parseArg('--port') ?? DEFAULT_CDP_PORT);
const CDP_HOST = parseArg('--host') ?? DEFAULT_CDP_HOST;
const TIMEOUT_MS = Number(parseArg('--timeout') ?? DEFAULT_TIMEOUT_MS);
const BROWSER_URL = `http://${CDP_HOST}:${CDP_PORT}`;
const TARGET_HINT = parseArg('--target');

function printHelp() {
  console.log(`obsidian-cdp-util — CDP inspector for held Obsidian sessions (${BROWSER_URL})

Commands:
  wait                        Block until CDP port is open
  list                        List debug targets (JSON)
  eval <expr>                 Evaluate JS expression, print to stdout
  eval <expr> --out <path>    Evaluate JS expression, write to file (stdout suppressed)

Flags:
  --port <n>        CDP port (default ${DEFAULT_CDP_PORT})
  --host <host>     CDP host (default ${DEFAULT_CDP_HOST})
  --timeout <ms>    Port wait timeout in ms (default ${DEFAULT_TIMEOUT_MS})
  --target <hint>   Target id or title substring (optional)
  --out <path>      Write output to file instead of stdout

Workflow:
  Option A — programmatic (recommended):
    import { launchObsidianForCdp } from '@obsidian-plugin-toolkit/e2e/cdp';
    const { close } = await launchObsidianForCdp({ cdpPort: ${DEFAULT_CDP_PORT} });
    // Terminal 2: obsidian-cdp-util eval '...'

  Option B — WDIO runner:
    Set interactive.pauseOnEnter in defineE2eConfig() and run wdio.
    // Terminal 2: obsidian-cdp-util eval '...'
`);
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0] ?? 'help';

  switch (cmd) {
    case 'help':
    case '-h':
    case '--help':
      printHelp();
      break;

    case 'wait':
      await waitForPort(CDP_PORT, CDP_HOST, TIMEOUT_MS);
      console.log(`CDP ready at ${BROWSER_URL}`);
      break;

    case 'list': {
      await waitForPort(CDP_PORT, CDP_HOST, 5000).catch(() =>
        console.warn(`[obsidian-cdp-util] CDP not yet reachable at ${BROWSER_URL}, attempting list anyway...`),
      );
      const targets = await listCdpTargets(BROWSER_URL);
      console.log(JSON.stringify(targets, null, 2));
      break;
    }

    case 'eval': {
      const outArg = parseArg('--out');
      const expr = argv
        .slice(1)
        .filter(a => a !== '--out' && a !== outArg)
        .join(' ');
      if (!expr) {
        console.error('Usage: obsidian-cdp-util eval <javascript expression> [--out <path>]');
        process.exit(1);
      }
      const value = await evaluateCdpExpression(
        { cdpPort: CDP_PORT, cdpHost: CDP_HOST, timeoutMs: TIMEOUT_MS, targetHint: TARGET_HINT },
        expr,
      );
      if (outArg) {
        const outPath = resolve(outArg);
        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, JSON.stringify(value, null, 2));
        console.error(`Wrote ${outPath}`);
      } else {
        console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
      }
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}\n`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
