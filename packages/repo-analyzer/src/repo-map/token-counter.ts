/**
 * Token Counter - Estimate token count for Repo Map
 */

import type { SymbolInfo } from '@open-zread/types';

/**
 * Estimate tokens for a single file's Repo Map representation
 *
 * Rough estimate: 1 line ≈ 10 tokens (conservative)
 */
export function estimateTokens(symbol: SymbolInfo): number {
  // File path line
  let lines = 1;

  // Docstrings (first one only)
  if (symbol.docstrings.length > 0) {
    lines += 1;
  }

  // Exports (count, each is one line)
  lines += symbol.exports.length;

  // Functions (count, each is one line)
  lines += symbol.functions.length;

  // Tree structure overhead (approximately 1 line per depth level)
  const depth = getDepth(symbol.file);
  lines += depth;

  // Conservative estimate: 1 line ≈ 10 tokens
  return lines * 10;
}

/**
 * Estimate total tokens for a set of symbols
 */
export function estimateTotalTokens(symbols: SymbolInfo[]): number {
  // Header overhead
  const headerTokens = 50;

  const contentTokens = symbols.reduce((sum, s) => sum + estimateTokens(s), 0);

  return headerTokens + contentTokens;
}

/**
 * Get directory depth from file path
 */
export function getDepth(filePath: string): number {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  // Exclude filename, count directories
  return Math.max(0, parts.length - 1);
}