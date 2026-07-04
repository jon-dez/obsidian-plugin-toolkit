import { expect } from "@wdio/globals";
import {
  copyObsidianUrlForVaultFile,
  createObsidianTest,
  isE2eInteractivePauseEnabled,
  pauseE2eForTerminal,
  readClipboardObsidianUrl,
  type ObsidianTest,
} from "@obsidian-plugin-toolkit/e2e";

declare global {
  var __VITE_DEV__:
    | {
        store?: {
          getServer?: () => { pluginLoaderDir: string };
        };
      }
    | undefined;
}

let obsidian: ObsidianTest;

describe("Demo plugin E2E", function () {
  before(async function () {
    obsidian = createObsidianTest();
    await obsidian.reload({ vault: "test/vaults/plugin-loader" });
    await obsidian.screenshot("01-vault-loaded");
  });

  it("reports Obsidian version", function () {
    expect(obsidian.version).toBeDefined();
    expect(obsidian.version.length).toBeGreaterThan(0);
    expect(obsidian.installerVersion).toBeDefined();
  });

  it("reads and writes vault files via the helper", async function () {
    const filePath = "e2e-helper-test.md";
    const content = "Hello from @obsidian-plugin-toolkit/testing";
    await obsidian.getPage().write(filePath, content);
    const read = await obsidian.getPage().read(filePath);
    expect(read).toBe(content);
    await obsidian.screenshot("02-after-vault-write");
    await obsidian.getPage().delete(filePath);
  });

  it("reads the welcome note from the test vault", async function () {
    const text = await obsidian.getPage().read("Welcome.md");
    expect(text).toContain("Welcome");
    expect(text).toContain("plugin-loader");
  });

  it("resets vault to clean state without reloading Obsidian", async function () {
    await obsidian.getPage().write("reset-demo-temp.md", "temp");
    await obsidian.getPage().resetVault("test/vaults/plugin-loader");
    const files = await obsidian.execute(({ app }) =>
      app.vault.getMarkdownFiles().map((f) => f.path),
    );
    expect(files).not.toContain("reset-demo-temp.md");
    expect(files).toContain("Welcome.md");
  });

  it("has Obsidian service plugin loaded", async function () {
    const pluginIds = await obsidian.execute(({ app }) =>
      app.plugins.plugins ? Object.keys(app.plugins.plugins) : [],
    );
    expect(pluginIds.length).toBeGreaterThanOrEqual(1);
    expect(pluginIds).toContain("wdio-obsidian-service-plugin");
  });

  it("detects plugin files via app.vault.adapter", async function () {
    const pluginFiles = await obsidian.execute(async ({ app }) => {
      const pluginId = "@obsidian-plugin-toolkit/demo-plugin-vite";
      const plugin = app.plugins.plugins[pluginId];
      const pluginDir = plugin?.manifest?.dir;
      if (!pluginDir) {
        return { pluginDir: null, hasManifest: false, hasMain: false };
      }

      const hasManifest = await app.vault.adapter.exists(`${pluginDir}/manifest.json`);
      const hasMain = await app.vault.adapter.exists(`${pluginDir}/main.js`);
      return { pluginDir, hasManifest, hasMain };
    });

    expect(pluginFiles.pluginDir).toBeDefined();
    if (pluginFiles.pluginDir === null) {
      expect(pluginFiles.hasManifest).toBe(false);
      expect(pluginFiles.hasMain).toBe(false);
    } else {
      expect(pluginFiles.hasManifest).toBe(true);
      expect(pluginFiles.hasMain).toBe(true);
    }
  });

  it("uses plugin manifest dir as runtime pluginLoaderDir", async function () {
    const result = await obsidian.execute(({ app }) => {
      const pluginId = "@obsidian-plugin-toolkit/demo-plugin-vite";
      const pluginDir = app.plugins.plugins[pluginId]?.manifest?.dir ?? null;

      // Only present when the dev runtime shim is active.
      const runtimePluginLoaderDir =
        globalThis.__VITE_DEV__?.store?.getServer?.().pluginLoaderDir ?? null;

      return { pluginDir, runtimePluginLoaderDir };
    });

    expect(result.pluginDir).toBeDefined();
    if (result.runtimePluginLoaderDir) {
      expect(result.runtimePluginLoaderDir).toBe(result.pluginDir);
    }
  });

  it("opens a file in the UI", async function () {
    await obsidian.getPage().openFile("Welcome.md");
    const activePath = await obsidian.execute(({ app }) =>
      app.workspace.getActiveFile()?.path,
    );
    expect(activePath).toBe("Welcome.md");
    await obsidian.screenshot("03-welcome-file-open");
  });

  it("copies an Obsidian URL for a vault file via Obsidian UI", async function () {
    for await (const { action, browser } of copyObsidianUrlForVaultFile("Welcome.md")) {
      if (action === 'right-click') await browser.pause(300);
      else if (action === 'hover-copy-path') await browser.pause(400);
    }
    const url = await readClipboardObsidianUrl("Welcome.md");
    expect(url).toMatch(/^obsidian:\/\//);
    const fileParam = new URL(url).searchParams.get("file");
    expect(fileParam === "Welcome.md" || fileParam === "Welcome").toBe(true);
  });

  it("supports manual pause and confirmation", async function () {
    if (!isE2eInteractivePauseEnabled()) {
      this.skip();
      return;
    }

    const markerFile = "manual-confirmation.md";
    await obsidian.getPage().delete(markerFile).catch(() => undefined);

    console.log(
      [
        "Interactive checkpoint:",
        `1) During the pause, create '${markerFile}' in the open vault.`,
        "2) Press Enter in this terminal to continue; the test verifies the file exists.",
      ].join("\n"),
    );

    await pauseE2eForTerminal(
      `[e2e] Create '${markerFile}' in the vault, then press Enter to continue…`,
    );

    const markerExists = await obsidian.execute(
      async ({ app }, file: string) => app.vault.adapter.exists(file),
      markerFile,
    );
    expect(markerExists).toBe(true);
  });
});
