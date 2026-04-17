/**
 * Reference Counter - Count file references from import statements
 * Optimized O(n) algorithm using Map for file path indexing
 */

import type { SymbolManifest } from '@open-zread/types';

export function countReferences(symbols: SymbolManifest): Record<string, number> {
  const referenceMap: Record<string, number> = {};

  // Initialize all files with 0 references
  for (const symbol of symbols.symbols) {
    referenceMap[symbol.file] = 0;
  }

  // Build file path index for O(1) lookup
  // Key: filename without extension, Value: full file path
  const fileIndex = new Map<string, string>();
  for (const symbol of symbols.symbols) {
    const fileName = symbol.file.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    fileIndex.set(fileName, symbol.file);
  }

  // Count references using indexed lookup
  for (const symbol of symbols.symbols) {
    for (const importStatement of symbol.imports) {
      const importPath = extractImportPath(importStatement);
      if (importPath?.startsWith('.')) {
        // Relative import: extract filename and lookup in index
        const importName = importPath.split('/').pop() || '';
        const targetFile = fileIndex.get(importName);
        if (targetFile) {
          referenceMap[targetFile]++;
        }
      }
    }
  }

  return referenceMap;
}

function extractImportPath(importStatement: string): string | null {
  const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}