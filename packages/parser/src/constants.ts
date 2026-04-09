// WASM Parser CDN source
export const WASM_CDN_URL = 'https://tree-sitter.github.io/tree-sitter/assets/wasm';

// WASM file naming mapping
export const WASM_FILE_MAP: Record<string, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
  vue: 'tree-sitter-vue.wasm',
  go: 'tree-sitter-go.wasm',
  python: 'tree-sitter-python.wasm',
};

// Local cache directory
export const PARSER_CACHE_DIR = '~/.zread/parsers';