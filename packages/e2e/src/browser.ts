export type BrowserOptions = {
  browser?: WebdriverIO.Browser;
};

export type BrowserTimeoutOptions = {
  browser?: WebdriverIO.Browser;
  /** Timeout in ms for element existence checks. */
  timeout?: number;
};

export function resolveGlobalBrowser(): WebdriverIO.Browser {
  const b = (globalThis as { browser?: WebdriverIO.Browser }).browser;
  if (!b) throw new Error('No global browser found. Pass browser explicitly or run via wdio run.');
  return b;
}
