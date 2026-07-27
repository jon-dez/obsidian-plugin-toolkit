/// <reference types="wdio-obsidian-service" />
import * as path from "path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = __dirname;

function Config(): WebdriverIO.Config {
  return {
    runner: "local",
    rootDir: projectRoot,
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
            ...(process.env.OBSIDIAN_LAUNCHER_ARGS ?? "").split(" ").filter(Boolean),
            "--remote-debugging-port=9333",
          ],
        },
      },
    ],

    services: ["obsidian"],
    reporters: ["obsidian"],
    cacheDir: path.join(projectRoot, ".obsidian-cache"),
    mochaOpts: {
      ui: "bdd",
      timeout: 60000,
    },
    logLevel: "warn",
  };
}

export const config = Config();