import type { SymbolManifest } from '@open-zread/types';

// Count reference frequency
export function countReferences(symbols: SymbolManifest): Record<string, number> {
  const referenceMap: Record<string, number> = {};

  // Initialize all file counts to 0
  for (const symbol of symbols.symbols) {
    referenceMap[symbol.file] = 0;
  }

  // Analyze imports of each file, count references
  for (const symbol of symbols.symbols) {
    for (const importStatement of symbol.imports) {
      // Extract import path
      const importPath = extractImportPath(importStatement);
      if (importPath) {
        // Find matching file
        for (const targetSymbol of symbols.symbols) {
          if (isImportMatch(importPath, targetSymbol.file)) {
            referenceMap[targetSymbol.file] = (referenceMap[targetSymbol.file] || 0) + 1;
          }
        }
      }
    }
  }

  return referenceMap;
}

// Extract import path
function extractImportPath(importStatement: string): string | null {
  // Match import ... from 'path' or import ... from "path"
  const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

// Check if import matches file path
function isImportMatch(importPath: string, filePath: string): boolean {
  // Relative path match
  if (importPath.startsWith('.')) {
    // Simple match: check if filename is same
    const importName = importPath.split('/').pop() || '';
    const fileName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    return importName === fileName || importName === fileName.replace(/\.[^.]+$/, '');
  }

  return false;
}