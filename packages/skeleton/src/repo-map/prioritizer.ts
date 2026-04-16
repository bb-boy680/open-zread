/**
 * File Prioritizer - Calculate file priority scores for Repo Map
 */

import type { SymbolInfo, FilePriority } from '@open-zread/types';
import { REPO_MAP_CONFIG } from './constants.js';
import { getDepth, estimateTokens } from './token-counter.js';

/**
 * Calculate priority score for a single file
 *
 * Formula: score = refScore + exportScore + depthScore
 */
export function calculatePriority(
  symbol: SymbolInfo,
  referenceCount: number
): FilePriority {
  const refScore = referenceCount * REPO_MAP_CONFIG.reference_weight;
  const exportScore = symbol.exports.length * REPO_MAP_CONFIG.export_weight;
  const depthScore = Math.max(0, REPO_MAP_CONFIG.depth_weight_base - getDepth(symbol.file));

  return {
    file: symbol.file,
    score: refScore + exportScore + depthScore,
    referenceCount,
    exportCount: symbol.exports.length,
    depth: getDepth(symbol.file),
  };
}

/**
 * Calculate priorities for all files
 */
export function calculateAllPriorities(
  symbols: SymbolInfo[],
  referenceMap: Record<string, number>
): FilePriority[] {
  return symbols.map(symbol => {
    const refCount = referenceMap[symbol.file] || 0;
    return calculatePriority(symbol, refCount);
  });
}

/**
 * Select files by token budget
 *
 * Strategy:
 * 1. Must-include files (refCount >= 5)
 * 2. Sort by score descending
 * 3. Add files until budget exhausted
 */
export function selectByTokenBudget(
  priorities: FilePriority[],
  symbols: SymbolInfo[],
  budget: number
): SymbolInfo[] {
  const selected: SymbolInfo[] = [];
  let usedTokens = 0;

  // Reserve budget for header
  const contentBudget = Math.floor(budget * (1 - REPO_MAP_CONFIG.header_budget_ratio));

  // Separate must-include files
  const mustInclude = priorities.filter(p => p.referenceCount >= REPO_MAP_CONFIG.must_include_threshold);
  const optional = priorities.filter(p => p.referenceCount < REPO_MAP_CONFIG.must_include_threshold);

  // Sort both groups by score
  mustInclude.sort((a, b) => b.score - a.score);
  optional.sort((a, b) => b.score - a.score);

  // Add must-include files first
  for (const p of mustInclude) {
    const symbol = symbols.find(s => s.file === p.file);
    if (!symbol) continue;

    const tokens = estimateTokens(symbol);
    if (usedTokens + tokens <= contentBudget) {
      selected.push(symbol);
      usedTokens += tokens;
    }
  }

  // Add optional files
  for (const p of optional) {
    const symbol = symbols.find(s => s.file === p.file);
    if (!symbol) continue;

    const tokens = estimateTokens(symbol);
    if (usedTokens + tokens <= contentBudget) {
      selected.push(symbol);
      usedTokens += tokens;
    }
  }

  return selected;
}

/**
 * Get top core files (reference count >= threshold)
 */
export function getTopCoreFiles(
  priorities: FilePriority[],
  threshold: number = REPO_MAP_CONFIG.core_threshold,
  limit: number = 10
): string[] {
  return priorities
    .filter(p => p.referenceCount >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(p => p.file);
}