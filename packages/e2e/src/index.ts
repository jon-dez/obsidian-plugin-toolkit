export {
  createObsidianTest,
  type ExecuteContext,
  type ObsidianPage,
  type ObsidianTest,
} from './obsidian/testing';
export {
  configureE2e,
  defineE2eConfig,
  getE2eConfig,
  isE2eDebug,
  isE2eInteractivePauseEnabled,
  isE2eRecordEnabled,
  isE2eWdioDebug,
  mergeE2eServices,
  normalizeE2eConfig,
  type E2eCdpConfig,
  type E2eConfig,
  type E2eConfigResolved,
  type E2eDebugConfig,
  type E2eDevtoolsScreencastOptions,
  type E2eInteractiveConfig,
  type E2eRecordConfig,
  type E2eWdioIntegration,
} from './config';
export {
  holdObsidianForCdp,
  pauseE2eForDebug,
  pauseE2eForTerminal,
  type PauseE2eForDebugOptions,
  type PauseE2eForTerminalOptions,
} from './pause';
export { menuItem, obsidianSel } from './obsidian/selectors';
export {
  clickContextMenuItem,
  copyObsidianUrlForVaultFile,
  type CopyObsidianUrlStep,
  dumpMenuItems,
  hoverContextMenuItem,
  readClipboardObsidianUrl,
  rightClickNavFile,
} from './obsidian/vault';
