/** Obsidian shell UI selectors (file explorer, context menus). */
export function menuItem(containsText: string): string {
  return `//*[contains(@class,'menu-item')][contains(.,"${containsText}")]`;
}

export const obsidianSel = {
  navFile: (vaultRelativePath: string) => `.nav-file-title[data-path="${vaultRelativePath}"]`,
  obsidianUrlMenuItem: `//*[contains(@class,'menu-item')][normalize-space()="as Obsidian URL"]`,
} as const;
