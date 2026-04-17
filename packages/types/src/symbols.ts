/**
 * Symbol Manifest Types
 *
 * Parser output - extracted symbols from source files
 */

/**
 * SymbolManifest - Parser output
 */
export interface SymbolManifest {
  symbols: Array<{
    file: string;
    exports: string[];
    functions: Array<{ name: string; signature: string }>;
    imports: string[];
    docstrings: string[];
  }>;
  loadedParsers: string[];
}

/**
 * SymbolInfo - Single file symbols
 */
export interface SymbolInfo {
  file: string;
  exports: string[];
  functions: Array<{ name: string; signature: string }>;
  imports: string[];
  docstrings: string[];
}