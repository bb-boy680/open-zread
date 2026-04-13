import type { SymbolManifest } from '@open-zread/types';

export function countReferences(symbols: SymbolManifest): Record<string, number> {
  const referenceMap: Record<string, number> = {};

  for (const symbol of symbols.symbols) {
    referenceMap[symbol.file] = 0;
  }

  for (const symbol of symbols.symbols) {
    for (const importStatement of symbol.imports) {
      const importPath = extractImportPath(importStatement);
      if (importPath) {
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

function extractImportPath(importStatement: string): string | null {
  const match = importStatement.match(/from\s+['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

function isImportMatch(importPath: string, filePath: string): boolean {
  if (importPath.startsWith('.')) {
    const importName = importPath.split('/').pop() || '';
    const fileName = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
    return importName === fileName || importName === fileName.replace(/\.[^.]+$/, '');
  }

  return false;
}
