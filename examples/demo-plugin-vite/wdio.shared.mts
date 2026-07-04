/// <reference types="wdio-obsidian-service" />
import { defineE2eConfig, type E2eConfig } from "@obsidian-plugin-toolkit/e2e";
import * as path from "path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = __dirname;

export function createWdioConfig(e2eOptions: Omit<E2eConfig, "rootDir">): WebdriverIO.Config {
  const e2e = defineE2eConfig({ rootDir: projectRoot, ...e2eOptions });

  return {
    runner: "local",
    rootDir: projectRoot,
    ...(e2e.outputDir ? { outputDir: e2e.outputDir } : {}),
    framework: "mocha",
    specs: ["./test/specs/**/*.e2e.ts"],
    maxInstances: 1,

    capabilities: [
      {
        browserName: "obsidian",
        browserVersion: "latest",
        "wdio:obsidianOptions": {
          installerVersion: "latest",
          plugins: [path.join(projectRoot, "dist", "production")],
          vault: path.join(projectRoot, "test", "vaults", "plugin-loader"),
        },
        "goog:chromeOptions": {
          args: [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--disable-software-rasterizer",
            "--remote-debugging-port=9333",
          ],
        },
      },
    ],

    services: e2e.services(["obsidian"]),
    reporters: ["obsidian"],
    cacheDir: path.join(projectRoot, ".obsidian-cache"),
    onPrepare: e2e.onPrepare,
    mochaOpts: {
      ui: "bdd",
      timeout: 60000,
    },
    logLevel: "warn",
  };
}
