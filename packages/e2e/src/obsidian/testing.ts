import fs from 'node:fs';
import path from 'node:path';
import type { ObsidianPage, ExecuteObsidianArg } from 'wdio-obsidian-service';

export type { ExecuteObsidianArg as ExecuteContext };
export type { ObsidianPage };

export interface ObsidianTest {
  command(id: string): Promise<void>;
  execute<Params extends unknown[], Return>(
    fn: (ctx: ExecuteObsidianArg, ...params: Params) => Return,
    ...params: Params
  ): Promise<Return>;
  reload(options?: { vault?: string; plugins?: string[]; theme?: string }): Promise<void>;
  readonly version: string;
  readonly installerVersion: string;
  getPage(): ObsidianPage;
  screenshot(name?: string, dir?: string): Promise<string>;
}

const DEFAULT_SCREENSHOT_DIR = 'test-output/screenshots';

export function createObsidianTest(browser?: WebdriverIO.Browser): ObsidianTest {
  const b: WebdriverIO.Browser = browser ?? (() => {
    const g = (globalThis as { browser?: WebdriverIO.Browser }).browser;
    if (!g || typeof (g as { executeObsidianCommand?: unknown }).executeObsidianCommand !== 'function') {
      throw new Error(
        'createObsidianTest: no browser provided and no global browser found. ' +
          'Pass the browser from your WDIO test or run via wdio run.',
      );
    }
    return g;
  })();

  let pageCache: ObsidianPage | null = null;
  function getPage(): ObsidianPage {
    if (!pageCache) pageCache = b.getObsidianPage();
    return pageCache;
  }

  async function screenshot(name = 'screenshot', dir = DEFAULT_SCREENSHOT_DIR): Promise<string> {
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `${name}.png`);
    await b.saveScreenshot(filePath);
    return filePath;
  }

  return {
    command: (id) => b.executeObsidianCommand(id),
    execute: (fn, ...params) => b.executeObsidian(fn, ...params),
    reload: (options) => b.reloadObsidian(options),
    get version() { return b.getObsidianVersion(); },
    get installerVersion() { return b.getObsidianInstallerVersion(); },
    getPage,
    screenshot,
  };
}
