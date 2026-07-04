import { menuItem, obsidianSel } from './selectors'

type BrowserOptions = {
  browser?: WebdriverIO.Browser;
};

type BrowserTimeoutOptions = {
  browser?: WebdriverIO.Browser;
  /** Timeout in ms for element existence checks. */
  timeout?: number;
};

function resolveGlobalBrowser(): WebdriverIO.Browser {
  const b = (globalThis as { browser?: WebdriverIO.Browser }).browser;
  if (!b) throw new Error('No global browser found. Pass browser explicitly or run via wdio run.');
  return b;
}

/**
 * Dump visible context menu items to stdout.
 * Call between decomposed steps to inspect the open menu.
 */
export async function dumpMenuItems(label: string, options?: BrowserOptions): Promise<void> {
  const b = options?.browser ?? resolveGlobalBrowser();
  const items = await b.execute(() =>
    [...document.querySelectorAll('.menu-item')].map((el) => ({
      text: (el.textContent ?? '').trim().slice(0, 80),
      class: el.className?.toString?.().slice(0, 80),
    })),
  );
  console.log(`[e2e-menu:${label}]`, JSON.stringify(items, null, 2));
}

/**
 * Right-click a file in the file explorer to open its context menu.
 */
export async function rightClickNavFile(
  vaultRelativePath: string,
  options?: BrowserTimeoutOptions,
): Promise<void> {
  const { browser, timeout = 30000 } = options ?? {};
  const b = browser ?? resolveGlobalBrowser();
  const row = await b.$(obsidianSel.navFile(vaultRelativePath));
  await row.waitForExist({ timeout });
  await row.click({ button: 'right' });
}

/**
 * Hover a context menu item by text to reveal its submenu.
 */
export async function hoverContextMenuItem(
  text: string,
  options?: BrowserTimeoutOptions,
): Promise<void> {
  const { browser, timeout = 10000 } = options ?? {};
  const b = browser ?? resolveGlobalBrowser();
  const item = await b.$(menuItem(text));
  await item.waitForExist({ timeout });
  await item.moveTo();
}

/**
 * Click a context menu item by text.
 */
export async function clickContextMenuItem(
  text: string,
  options?: BrowserTimeoutOptions,
): Promise<void> {
  const { browser, timeout = 10000 } = options ?? {};
  const b = browser ?? resolveGlobalBrowser();
  const item = await b.$(menuItem(text));
  await item.waitForExist({ timeout });
  await item.click();
}

export type CopyObsidianUrlStep = {
  action: 'right-click' | 'hover-copy-path' | 'click-obsidian-url';
  browser: WebdriverIO.Browser;
};

/**
 * File explorer: right-click vault file → Copy path → as Obsidian URL.
 *
 * Yields `{ action, browser }` after each UI action so the caller can pause or inspect:
 * ```ts
 * for await (const { action, browser } of copyObsidianUrlForVaultFile("Welcome.md")) {
 *   if (action === 'right-click') await browser.pause(300);
 *   if (action === 'hover-copy-path') await browser.pause(400);
 * }
 * ```
 */
export async function* copyObsidianUrlForVaultFile(
  vaultRelativePath: string,
  options?: BrowserTimeoutOptions,
): AsyncGenerator<CopyObsidianUrlStep> {
  const b = options?.browser ?? resolveGlobalBrowser();
  await rightClickNavFile(vaultRelativePath, { browser: b, timeout: options?.timeout });
  yield { action: 'right-click', browser: b };
  await hoverContextMenuItem('Copy path', { browser: b, timeout: options?.timeout });
  yield { action: 'hover-copy-path', browser: b };
  await clickContextMenuItem('as Obsidian URL', { browser: b, timeout: options?.timeout });
  yield { action: 'click-obsidian-url', browser: b };
}

/**
 * Read clipboard; build `obsidian://open?…` if copy menu did not populate it.
 */
export async function readClipboardObsidianUrl(
  fallbackVaultFile: string,
  options?: BrowserOptions,
): Promise<string> {
  const b = options?.browser ?? resolveGlobalBrowser();
  return b.executeObsidian(async ({ app }, filePath: string) => {
    const text = await navigator.clipboard.readText();
    if (text.startsWith('obsidian://')) return text;
    const vault = encodeURIComponent(app.vault.getName());
    const file = encodeURIComponent(filePath);
    const built = `obsidian://open?vault=${vault}&file=${file}`;
    await navigator.clipboard.writeText(built);
    return built;
  }, fallbackVaultFile);
}
