// Scanner
export { scanFiles, SCANNER_CONFIG, LANGUAGE_MAP } from './scanner/index.js';

// Parser
export { parseFiles } from './parser/index.js';
export { loadParsers, loadLanguage, loadParser, getCachedLanguage } from './parser/wasm-loader.js';
export { isLanguageSupported, getParserName } from './parser/language-map.js';
export { parseVueSfc, extractVueScript } from './parser/vue-handler.js';

// Dehydrator
export { dehydrate, DEHYDRATOR_CONFIG } from './dehydrator/index.js';
export { countReferences } from './dehydrator/reference-counter.js';
