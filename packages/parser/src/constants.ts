// WASM Parser CDN source (tree-sitter-wasms by sourcegraph on jsDelivr)
export const WASM_CDN_URL = 'https://cdn.jsdelivr.net/npm/tree-sitter-wasms@0.1.13/out';

// WASM file naming mapping
export const WASM_FILE_MAP: Record<string, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
  vue: 'tree-sitter-vue.wasm',
  go: 'tree-sitter-go.wasm',
  python: 'tree-sitter-python.wasm',
};

// Local cache directory (use homedir to avoid Chinese path encoding issues)
export const PARSER_CACHE_DIR = '~/.zread/parsers';