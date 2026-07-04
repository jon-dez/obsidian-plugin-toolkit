import { createWdioConfig } from "./wdio.shared.mts";

export const config = createWdioConfig({
  interactive: { pauseOnEnter: true },
});
