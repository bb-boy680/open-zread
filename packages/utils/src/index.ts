// File I/O utilities
export {
  ensureDir,
  readTextFile,
  writeTextFile,
  writeJsonFile,
  readJsonFile,
  joinPath,
  getProjectRoot,
  getOutputDir,
  getDraftsDir,
  getCacheDir,
} from './file-io.js';

// Logger
export { logger, getLogFile } from './logger.js';

// Config
export { loadConfig, saveConfig, validateConfig, getDefaultLanguage, getConfigPath } from './config/index.js';

// Cache
export {
  loadCachedManifest,
  saveCachedManifest,
  diffManifests,
  needsReprocess,
  loadCachedSymbols,
  saveCachedSymbols,
} from './cache/index.js';

// Storage
export { WikiStore } from './storage/wiki-store.js';
export { generateSnapshotName, createVersionSnapshot } from './storage/versioning.js';

// Output
export { generateWikiJson } from './output/index.js';
export { loadWikiBlueprint } from './output/wiki-content.js';

// Provider Registry
export * from './provider-registry/types.js';
export { getProviderRegistry, syncProviders } from './provider-registry/index.js';