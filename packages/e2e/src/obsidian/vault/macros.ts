import { clickContextMenuItem, CopyObsidianUrlStep, hoverContextMenuItem, rightClickNavFile } from "./actions";
import { BrowserTimeoutOptions, resolveGlobalBrowser } from '../../browser';

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