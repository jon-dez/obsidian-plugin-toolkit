import path from 'node:path';
import type { Options } from '@wdio/types';

// ── Recording types ───────────────────────────────────────────────────────────

export type E2eDevtoolsScreencastOptions = {
  enabled: boolean;
  captureFormat?: 'jpeg' | 'png';
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  pollIntervalMs?: number;
};

type DevtoolsServiceOptions = {
  screencast?: E2eDevtoolsScreencastOptions;
};

const DEFAULT_SCREENCAST = {
  captureFormat: 'jpeg' as const,
  quality: 70,
  maxWidth: 1280,
  maxHeight: 720,
};

export type E2eRecordConfig = {
  enabled: boolean;
  outputDir?: string;
  screencast?: Omit<E2eDevtoolsScreencastOptions, 'enabled'>;
};

// ── Config types ──────────────────────────────────────────────────────────────

export type E2eInteractiveConfig = {
  /** Wait for Enter in terminal when calling `pauseE2eForTerminal` / `pauseE2eForDebug` */
  pauseOnEnter?: boolean;
  /** Use `browser.debug()` in `pauseE2eForDebug` instead of terminal pause */
  wdioDebug?: boolean;
};

export type E2eDebugConfig = {
  /** Verbose helpers such as `dumpMenuItems` */
  verbose?: boolean;
};

export type E2eCdpConfig = {
  port?: number;
  host?: string;
};

export type E2eConfig = {
  rootDir: string;
  record?: boolean | E2eRecordConfig;
  interactive?: boolean | E2eInteractiveConfig;
  debug?: boolean | E2eDebugConfig;
  cdp?: E2eCdpConfig;
};

export type E2eConfigResolved = {
  rootDir: string;
  record: E2eRecordConfig;
  interactive: Required<E2eInteractiveConfig>;
  debug: Required<E2eDebugConfig>;
  cdp: Required<E2eCdpConfig>;
};

export type E2eWdioIntegration = {
  config: E2eConfigResolved;
  outputDir?: string;
  services: (base: Options.Testrunner['services']) => Options.Testrunner['services'];
  onPrepare: () => void;
};

// ── Internal recording helpers ────────────────────────────────────────────────

function resolveRecordOutputDir(rootDir: string, record: E2eRecordConfig): string {
  const dir = record.outputDir?.trim();
  if (dir) return path.isAbsolute(dir) ? dir : path.join(rootDir, dir);
  return path.join(rootDir, 'test-output', 'e2e-recordings');
}

function buildDevtoolsServiceEntry(
  record: E2eRecordConfig,
): [string, DevtoolsServiceOptions] | null {
  if (!record.enabled) return null;
  return [
    'devtools',
    { screencast: { enabled: true, ...DEFAULT_SCREENCAST, ...record.screencast } },
  ];
}

function logRecordingHint(rootDir: string, record: E2eRecordConfig): void {
  const out = resolveRecordOutputDir(rootDir, record);
  console.log(
    `[e2e] Recording enabled: devtools trace/video → ${out}/wdio-trace-*.json, ${out}/wdio-video-*.webm`,
  );
}

// ── Config state ──────────────────────────────────────────────────────────────

const DEFAULT_CDP = { port: 9333, host: '127.0.0.1' } as const;
const E2E_CONFIG_GLOBAL = '__obsidianPluginToolkitE2eConfig__' as const;

let activeConfig: E2eConfigResolved | null = null;

function fallbackConfig(rootDir = process.cwd()): E2eConfigResolved {
  return {
    rootDir,
    record: { enabled: false },
    interactive: { pauseOnEnter: false, wdioDebug: false },
    debug: { verbose: false },
    cdp: { ...DEFAULT_CDP },
  };
}

function syncGlobalConfig(config: E2eConfigResolved): void {
  (globalThis as Record<string, unknown>)[E2E_CONFIG_GLOBAL] = config;
}

function readGlobalConfig(): E2eConfigResolved | null {
  const value = (globalThis as Record<string, unknown>)[E2E_CONFIG_GLOBAL];
  return value && typeof value === 'object' ? (value as E2eConfigResolved) : null;
}

// ── Normalization ─────────────────────────────────────────────────────────────

function normalizeRecord(record?: boolean | E2eRecordConfig): E2eRecordConfig {
  if (record === true) return { enabled: true };
  if (!record) return { enabled: false };
  return { enabled: record.enabled, outputDir: record.outputDir, screencast: record.screencast };
}

function normalizeInteractive(
  interactive?: boolean | E2eInteractiveConfig,
): Required<E2eInteractiveConfig> {
  if (interactive === true) return { pauseOnEnter: true, wdioDebug: false };
  if (!interactive) return { pauseOnEnter: false, wdioDebug: false };
  return {
    pauseOnEnter: interactive.pauseOnEnter ?? false,
    wdioDebug: interactive.wdioDebug ?? false,
  };
}

function normalizeDebug(debug?: boolean | E2eDebugConfig): Required<E2eDebugConfig> {
  if (debug === true) return { verbose: true };
  if (!debug) return { verbose: false };
  return { verbose: debug.verbose ?? false };
}

function normalizeCdp(cdp?: E2eCdpConfig): Required<E2eCdpConfig> {
  return {
    port: cdp?.port ?? DEFAULT_CDP.port,
    host: cdp?.host ?? DEFAULT_CDP.host,
  };
}

export function normalizeE2eConfig(input: E2eConfig): E2eConfigResolved {
  return {
    rootDir: input.rootDir,
    record: normalizeRecord(input.record),
    interactive: normalizeInteractive(input.interactive),
    debug: normalizeDebug(input.debug),
    cdp: normalizeCdp(input.cdp),
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Install config for helpers (`pauseE2eForDebug`, `dumpMenuItems`, …). */
export function configureE2e(input: E2eConfig | E2eConfigResolved): E2eConfigResolved {
  activeConfig =
    'record' in input && 'interactive' in input && 'cdp' in input
      ? (input as E2eConfigResolved)
      : normalizeE2eConfig(input as E2eConfig);
  syncGlobalConfig(activeConfig);
  return activeConfig;
}

export function getE2eConfig(): E2eConfigResolved {
  return activeConfig ?? readGlobalConfig() ?? fallbackConfig();
}

export function isE2eRecordEnabled(): boolean {
  return getE2eConfig().record.enabled;
}

export function isE2eInteractivePauseEnabled(): boolean {
  return getE2eConfig().interactive.pauseOnEnter;
}

export function isE2eDebug(): boolean {
  return getE2eConfig().debug.verbose;
}

export function isE2eWdioDebug(): boolean {
  return getE2eConfig().interactive.wdioDebug;
}

/** WDIO wiring: call once from `wdio.conf.mts` and spread `outputDir` / `onPrepare` / `services()`. */
export function defineE2eConfig(input: E2eConfig): E2eWdioIntegration {
  const config = configureE2e(input);

  return {
    config,
    outputDir: config.record.enabled
      ? resolveRecordOutputDir(config.rootDir, config.record)
      : undefined,
    services: (base) => mergeE2eServices(base, config),
    onPrepare: () => {
      configureE2e(config);
      if (config.record.enabled) logRecordingHint(config.rootDir, config.record);
    },
  };
}

export function mergeE2eServices(
  services: Options.Testrunner['services'],
  config: E2eConfigResolved = getE2eConfig(),
): Options.Testrunner['services'] {
  const entry = buildDevtoolsServiceEntry(config.record);
  if (!entry) return services;
  if (!services) return [entry];
  if (Array.isArray(services)) return [...services, entry];
  return [services, entry];
}
