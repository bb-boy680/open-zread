/**
 * Repo Map Builder - Generate LLM-friendly repository context
 *
 * Replaces Dehydrator with a tree-structured output optimized for LLM comprehension.
 */

import type { SymbolManifest, RepoMapOptions, RepoMapOutput } from '@open-zread/types';
import { logger, getCacheDir, writeTextFile } from '@open-zread/core';
import { join } from 'path';
import { countReferences } from './reference-counter.js';
import { REPO_MAP_CONFIG } from './constants.js';
import { calculateAllPriorities, selectByTokenBudget } from './prioritizer.js';
import { buildDirectoryTree, formatRepoMap, buildRepoMapOutput } from './formatter.js';

/**
 * Build Repo Map from SymbolManifest
 *
 * Generates a tree-structured representation of the codebase,
 * optimized for LLM context window.
 *
 * @param symbols - Symbol manifest from Parser
 * @param options - Repo map options (tokenBudget, includeAll)
 * @returns RepoMapOutput with formatted content and metadata
 */
export async function buildRepoMap(
  symbols: SymbolManifest,
  options?: Partial<RepoMapOptions>
): Promise<RepoMapOutput> {
  logger.progress('Building Repo Map');

  // Merge options with defaults - no truncation by default
  const opts: RepoMapOptions = {
    tokenBudget: options?.tokenBudget || Infinity,
    includeAll: options?.includeAll ?? true,
    maxSignatureLength: options?.maxSignatureLength || Infinity,
  };

  // Calculate reference counts
  const referenceMap = countReferences(symbols);

  // Calculate priorities for all files
  const priorities = calculateAllPriorities(symbols.symbols, referenceMap);

  // Select files based on token budget (or all if includeAll)
  const selectedSymbols = opts.includeAll
    ? symbols.symbols
    : selectByTokenBudget(priorities, symbols.symbols, opts.tokenBudget);

  // Build directory tree
  const tree = buildDirectoryTree(selectedSymbols);

  // Format as string
  const content = formatRepoMap(tree, selectedSymbols, referenceMap);

  // Build output with metadata
  const output = buildRepoMapOutput(
    content,
    selectedSymbols,
    priorities.map(p => ({ file: p.file, referenceCount: p.referenceCount }))
  );

  // Save Repo Map to cache directory
  const cacheDir = getCacheDir();
  const repoMapPath = join(cacheDir, 'repo-map.txt');
  await writeTextFile(repoMapPath, content);

  logger.success(`Repo Map built: ${output.fileCount} files, ~${output.tokenCount} tokens`);
  logger.success(`Repo Map saved to: ${repoMapPath}`);

  return output;
}

// Re-export sub-modules (direct re-export, no local binding)
export { REPO_MAP_CONFIG } from './constants.js';
export { estimateTokens, getDepth, estimateTotalTokens } from './token-counter.js';
export { calculatePriority, calculateAllPriorities, selectByTokenBudget, getTopCoreFiles } from './prioritizer.js';
export { buildDirectoryTree, formatRepoMap, trimSignature, buildRepoMapOutput } from './formatter.js';