import { menuItem, obsidianSel } from '../selectors'
import { BrowserOptions, BrowserTimeoutOptions, resolveGlobalBrowser } from '../../browser';

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
