// Scanner
export { scanFiles, SCANNER_CONFIG, LANGUAGE_MAP } from './scanner/index.js';

// Parser
export { parseFiles } from './parser/index.js';
export { loadParsers, loadLanguage, loadParser, getCachedLanguage } from './parser/wasm-loader.js';
export { isLanguageSupported, getParserName } from './parser/language-map.js';
export { parseVueSfc, extractVueScript } from './parser/vue-handler.js';

// Repo Map
export { buildRepoMap, REPO_MAP_CONFIG } from './repo-map/index.js';
export {
  buildDirectoryTreeOnly,
  buildCoreSignatures,
  buildModuleDetails,
} from './repo-map/index.js';
export {
  estimateTokens,
  getDepth,
  estimateTotalTokens,
  calculatePriority,
  calculateAllPriorities,
  selectByTokenBudget,
  getTopCoreFiles,
  buildDirectoryTree,
  formatRepoMap,
  trimSignature,
  buildRepoMapOutput,
} from './repo-map/index.js';