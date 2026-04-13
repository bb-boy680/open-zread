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
export { loadConfig, validateConfig, getDefaultLanguage } from './config/index.js';

// Cache
export {
  loadCachedManifest,
  saveCachedManifest,
  saveCachedManifestWithSkeleton,
  loadCachedSkeleton,
  saveCachedSkeleton,
  diffManifests,
  needsReprocess,
} from './cache/index.js';

// Storage
export { WikiStore } from './storage/wiki-store.js';
export { generateSnapshotName, createVersionSnapshot } from './storage/versioning.js';

// Output
export { generateWikiJson } from './output/index.js';
