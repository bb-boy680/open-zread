export const WASM_CDN_URL = 'https://cdn.jsdelivr.net/npm/tree-sitter-wasms@0.1.13/out';

export const WASM_FILE_MAP: Record<string, string> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx: 'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
  vue: 'tree-sitter-vue.wasm',
  go: 'tree-sitter-go.wasm',
  python: 'tree-sitter-python.wasm',
};

export const PARSER_CACHE_DIR = '~/.zread/parsers';
