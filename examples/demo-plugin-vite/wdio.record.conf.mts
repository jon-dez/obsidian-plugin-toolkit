import { createWdioConfig } from "./wdio.shared.mts";

export const config = createWdioConfig({
  record: {
    enabled: true,
    outputDir: "test-output/e2e-recordings",
  },
});
