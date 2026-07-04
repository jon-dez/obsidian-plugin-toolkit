/**
 * CLI companion for launchObsidianForCdp() — inspect a running Obsidian session via CDP.
 *
 * Prerequisite: Obsidian must be running with a CDP port open.
 *   Option A — programmatic: call launchObsidianForCdp() from @obsidian-plugin-toolkit/e2e
 *   Option B — WDIO runner: set interactive.pauseOnEnter in defineE2eConfig() and run wdio
 *
 * Usage (installed bin):
 *   obsidian-cdp-util list
 *   obsidian-cdp-util eval 'document.title'
 *   obsidian-cdp-util eval '(() => ({ title: document.title, url: location.href }))()'
 *   obsidian-cdp-util eval '...' --out ./snapshot.json
 *   obsidian-cdp-util wait
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { createConnection } from 'node:net'
import { dirname, resolve } from 'node:path'
import puppeteer from 'puppeteer-core'
import type { Browser, Page, Target } from 'puppeteer-core'

const DEFAULT_CDP_PORT = 9333
const DEFAULT_CDP_HOST = '127.0.0.1'
const DEFAULT_TIMEOUT_MS = 120000

function parseArg(flag: string): string | undefined {
	const i = process.argv.indexOf(flag)
	return i >= 0 ? process.argv[i + 1] : undefined
}

const CDP_PORT = Number(parseArg('--port') ?? DEFAULT_CDP_PORT)
const CDP_HOST = parseArg('--host') ?? DEFAULT_CDP_HOST
const TIMEOUT_MS = Number(parseArg('--timeout') ?? DEFAULT_TIMEOUT_MS)
const BROWSER_URL = `http://${CDP_HOST}:${CDP_PORT}`

type JsonTarget = {
	id: string
	title: string
	url: string
	type: string
	webSocketDebuggerUrl?: string
}

const preferredTargetHint = parseArg('--target')

async function waitForPort(port: number, host: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<void> {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			await new Promise<void>((resolve, reject) => {
				const socket = createConnection({ port, host }, () => {
					socket.end()
					resolve()
				})
				socket.on('error', reject)
			})
			return
		} catch {
			await new Promise((r) => setTimeout(r, 400))
		}
	}
	throw new Error(
		`Nothing listening on ${host}:${port}. Start Obsidian via launchObsidianForCdp() or a WDIO run first.`
	)
}

async function listTargets(): Promise<JsonTarget[]> {
	const res = await fetch(`${BROWSER_URL}/json/list`)
	if (!res.ok) throw new Error(`CDP /json/list failed: ${res.status}`)
	return res.json() as Promise<JsonTarget[]>
}

function pickJsonTarget(targets: JsonTarget[]): JsonTarget {
	if (targets.length === 0) {
		throw new Error(`No CDP targets on ${BROWSER_URL}.`)
	}

	if (preferredTargetHint) {
		const hint = preferredTargetHint.toLowerCase()
		const match = targets.find(
			(t) => t.id === preferredTargetHint || t.title.toLowerCase().includes(hint)
		)
		if (match) return match
	}

	return (
		targets.find((t) => /obsidian/i.test(t.title)) ??
		targets.find((t) => t.type === 'page' && !t.url.startsWith('devtools://')) ??
		targets[0]
	)
}

async function pickPage(browser: Browser): Promise<Page> {
	const targets: Target[] = browser.targets()
	const json = await listTargets()
	const chosen = pickJsonTarget(json)

	const target =
		targets.find((t) => t.url() === chosen.url || t.url().includes(chosen.url)) ??
		targets.find((t) => /obsidian/i.test(t.url())) ??
		targets.find((t) => t.type() === 'page')

	const page = target ? await target.page() : null
	if (!page) throw new Error(`No page for target: ${chosen.title}`)
	return page
}

async function evaluateExpression(page: Page, expression: string): Promise<unknown> {
	return page.evaluate(async (source) => {
		const fn = new Function(`return (${source})`)
		const result = fn()
		return result instanceof Promise ? await result : result
	}, expression)
}

async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
	await waitForPort(CDP_PORT, CDP_HOST, TIMEOUT_MS)
	const browser = await puppeteer.connect({ browserURL: BROWSER_URL, defaultViewport: null })
	try {
		const page = await pickPage(browser)
		return await fn(page)
	} finally {
		browser.disconnect()
	}
}

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
    import { launchObsidianForCdp } from '@obsidian-plugin-toolkit/e2e';
    const { close } = await launchObsidianForCdp({ cdpPort: ${DEFAULT_CDP_PORT} });
    // Terminal 2: obsidian-cdp-util eval '...'

  Option B — WDIO runner:
    Set interactive.pauseOnEnter in defineE2eConfig() and run wdio.
    // Terminal 2: obsidian-cdp-util eval '...'
`)
}

async function main() {
	const argv = process.argv.slice(2)
	const cmd = argv[0] ?? 'help'

	switch (cmd) {
		case 'help':
		case '-h':
		case '--help':
			printHelp()
			break

		case 'wait':
			await waitForPort(CDP_PORT, CDP_HOST, TIMEOUT_MS)
			console.log(`CDP ready at ${BROWSER_URL}`)
			break

		case 'list': {
			await waitForPort(CDP_PORT, CDP_HOST, 5000).catch(() =>
				console.warn(`[e2e-cdp] CDP not yet reachable at ${BROWSER_URL}, attempting list anyway...`)
			)
			const targets = await listTargets()
			console.log(JSON.stringify(targets, null, 2))
			break
		}

		case 'eval': {
			const expr = argv.slice(1).filter(a => a !== '--out' && a !== parseArg('--out')).join(' ')
			if (!expr) {
				console.error('Usage: obsidian-cdp-util eval <javascript expression> [--out <path>]')
				process.exit(1)
			}
			const value = await withPage((page) => evaluateExpression(page, expr))
			const outArg = parseArg('--out')
			if (outArg) {
				const outPath = resolve(outArg)
				mkdirSync(dirname(outPath), { recursive: true })
				writeFileSync(outPath, JSON.stringify(value, null, 2))
				console.error(`Wrote ${outPath}`)
			} else {
				console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2))
			}
			break
		}

		default:
			console.error(`Unknown command: ${cmd}\n`)
			printHelp()
			process.exit(1)
	}
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
