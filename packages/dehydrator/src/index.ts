import { readFile } from 'fs/promises';
import { join } from 'path';
import type { SymbolManifest, DehydratedSkeleton, SkeletonItem } from '@open-zread/types';
import { logger, getProjectRoot } from '@open-zread/utils';
import { DEHYDRATOR_CONFIG } from './constants';
import { countReferences } from './reference-counter';

// Generate skeleton code
function buildSkeletonContent(symbol: SymbolManifest['symbols'][0], source: string): string {
  const lines = source.split('\n');

  // Truncate large files
  const limitedLines = lines.slice(0, DEHYDRATOR_CONFIG.header_lines_limit);

  // Build skeleton: keep imports, exports, signatures, remove function bodies
  const skeletonLines: string[] = [];

  // Add docstring
  if (symbol.docstrings.length > 0) {
    skeletonLines.push(symbol.docstrings[0]);
  }

  // Add imports
  for (const imp of symbol.imports) {
    skeletonLines.push(imp);
  }

  // Add exports and signatures
  for (const exp of symbol.exports) {
    // Truncate long exports
    const trimmed = exp.length > 200 ? exp.slice(0, 200) + '...' : exp;
    skeletonLines.push(trimmed);
  }

  for (const fn of symbol.functions) {
    skeletonLines.push(fn.signature);
  }

  return skeletonLines.join('\n');
}

// Main dehydrate function
export async function dehydrate(symbols: SymbolManifest): Promise<DehydratedSkeleton> {
  logger.progress('Dehydrating');

  const projectRoot = getProjectRoot();
  const skeleton: SkeletonItem[] = [];

  for (const symbol of symbols.symbols) {
    try {
      const fullPath = join(projectRoot, symbol.file);
      const source = await readFile(fullPath, 'utf-8');

      // Check file size
      const lines = source.split('\n');
      if (lines.length > DEHYDRATOR_CONFIG.max_file_lines) {
        logger.warn(`File too large, truncated: ${symbol.file} (${lines.length} lines)`);
      }

      const content = buildSkeletonContent(symbol, source);
      skeleton.push({ file: symbol.file, content });
    } catch (error) {
      logger.warn(`Dehydrate failed: ${symbol.file}`);
    }
  }

  // Count references
  const referenceMap = countReferences(symbols);

  logger.success(`Skeleton generated, ${skeleton.length} files`);

  return {
    skeleton,
    referenceMap,
  };
}

// Export sub-modules
export * from './reference-counter';
export { DEHYDRATOR_CONFIG };