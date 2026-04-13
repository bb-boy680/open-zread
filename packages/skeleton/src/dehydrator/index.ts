import { readFile } from 'fs/promises';
import { join } from 'path';
import type { SymbolManifest, DehydratedSkeleton, SkeletonItem } from '@open-zread/types';
import { logger, getProjectRoot } from '@open-zread/core';
import { DEHYDRATOR_CONFIG } from './constants';
import { countReferences } from './reference-counter';

function buildSkeletonContent(symbol: SymbolManifest['symbols'][0], source: string): string {
  const lines = source.split('\n');

  lines.slice(0, DEHYDRATOR_CONFIG.header_lines_limit);

  const skeletonLines: string[] = [];

  if (symbol.docstrings.length > 0) {
    skeletonLines.push(symbol.docstrings[0]);
  }

  for (const imp of symbol.imports) {
    skeletonLines.push(imp);
  }

  for (const exp of symbol.exports) {
    const trimmed = exp.length > 200 ? exp.slice(0, 200) + '...' : exp;
    skeletonLines.push(trimmed);
  }

  for (const fn of symbol.functions) {
    skeletonLines.push(fn.signature);
  }

  return skeletonLines.join('\n');
}

export async function dehydrate(symbols: SymbolManifest): Promise<DehydratedSkeleton> {
  logger.progress('Dehydrating');

  const projectRoot = getProjectRoot();
  const skeleton: SkeletonItem[] = [];

  for (const symbol of symbols.symbols) {
    try {
      const fullPath = join(projectRoot, symbol.file);
      const source = await readFile(fullPath, 'utf-8');

      const lines = source.split('\n');
      if (lines.length > DEHYDRATOR_CONFIG.max_file_lines) {
        logger.warn(`File too large, truncated: ${symbol.file} (${lines.length} lines)`);
      }

      const content = buildSkeletonContent(symbol, source);
      skeleton.push({ file: symbol.file, content });
    } catch {
      logger.warn(`Dehydrate failed: ${symbol.file}`);
    }
  }

  const referenceMap = countReferences(symbols);

  logger.success(`Skeleton generated, ${skeleton.length} files`);

  return {
    skeleton,
    referenceMap,
  };
}

export * from './reference-counter';
export { DEHYDRATOR_CONFIG };
