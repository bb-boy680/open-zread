/**
 * Repo Map Builder - Generate LLM-friendly repository context
 *
 * Replaces Dehydrator with a tree-structured output optimized for LLM comprehension.
 */

import type { SymbolManifest, RepoMapOptions, RepoMapOutput, DirectoryTreeOutput, CoreSignaturesOutput, ModuleDetailsOutput, DirectoryTreeNode } from '@open-zread/types';
import { logger, getCacheDir, writeTextFile } from '@open-zread/utils';
import { join } from 'path';
import { countReferences } from './reference-counter.js';
import { REPO_MAP_CONFIG } from './constants.js';
import { calculateAllPriorities, selectByTokenBudget } from './prioritizer.js';
import { buildDirectoryTree, formatRepoMap, buildRepoMapOutput, trimSignature } from './formatter.js';

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
    // When tokenBudget is set, disable includeAll by default
    includeAll: options?.includeAll ?? (options?.tokenBudget === undefined),
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

// ==================== 三层 Repo Map 函数 ====================

/**
 * Layer 1: Build Directory Tree (纯目录结构)
 *
 * 生成不含符号的纯目录树，Token 消耗极低。
 * 用于 AI 建立全局模块框架。
 *
 * @param symbols - Symbol manifest from Parser
 * @returns DirectoryTreeOutput with pure directory structure
 */
export function buildDirectoryTreeOnly(symbols: SymbolManifest): DirectoryTreeOutput {
  // Use Set for O(n) directory extraction instead of O(n²) with includes()
  const dirSet = new Set<string>();

  for (const symbol of symbols.symbols) {
    const parts = symbol.file.split('/');
    // Build all parent directories
    for (let i = 1; i < parts.length; i++) {
      dirSet.add(parts.slice(0, i).join('/'));
    }
  }

  // Convert to sorted array
  const directories = [...dirSet].sort();

  // Build tree string
  const lines: string[] = ['Project Structure', ''];
  const tree = buildDirectoryTree(symbols.symbols);

  // Format tree without symbols
  formatTreeOnly(tree.children || [], lines, '');

  const content = lines.join('\n');

  return {
    content,
    directories,
  };
}

/**
 * Format directory tree without symbols (helper for Layer 1)
 */
function formatTreeOnly(
  nodes: DirectoryTreeNode[],
  lines: string[],
  prefix: string
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const nodePrefix = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : REPO_MAP_CONFIG.tree_indent;

    if (node.type === 'directory') {
      lines.push(`${prefix}${nodePrefix}${node.name}/`);
      if (node.children && node.children.length > 0) {
        formatTreeOnly(node.children, lines, prefix + childPrefix);
      }
    } else {
      // File: just name, no symbols
      lines.push(`${prefix}${nodePrefix}${node.name}`);
    }
  }
}

/**
 * Layer 2: Build Core Signatures (核心文件签名)
 *
 * 仅包含高引用文件 (Ref >= threshold) 的导出签名。
 * 用于 AI 理解核心 API 边界。
 *
 * @param symbols - Symbol manifest from Parser
 * @param threshold - Reference count threshold (default: 5)
 * @param referenceMap - Optional pre-computed reference map (avoid re-computation)
 * @returns CoreSignaturesOutput with core file signatures
 */
export function buildCoreSignatures(
  symbols: SymbolManifest,
  threshold: number = 5,
  referenceMap?: Record<string, number>
): CoreSignaturesOutput {
  // Use provided referenceMap or calculate once
  const refMap = referenceMap ?? countReferences(symbols);

  // Filter by threshold
  const coreSymbols = symbols.symbols.filter(symbol => {
    const refCount = refMap[symbol.file] || 0;
    return refCount >= threshold;
  });

  // Sort by reference count descending
  coreSymbols.sort((a, b) => {
    const refA = refMap[a.file] || 0;
    const refB = refMap[b.file] || 0;
    return refB - refA;
  });

  // Build signatures string
  const lines: string[] = [`Core Files Signatures (Ref >= ${threshold})`, ''];

  for (const symbol of coreSymbols) {
    const refCount = refMap[symbol.file] || 0;

    lines.push(`├── ${symbol.file} [Ref: ${refCount}]`);

    // Add exports only (no functions body)
    for (const exp of symbol.exports) {
      const trimmed = trimSignature(exp, REPO_MAP_CONFIG.max_signature_length);
      lines.push(`│   [Export] ${trimmed}`);
    }

    // Empty line after file
    if (symbol.exports.length > 0) {
      lines.push('│');
    }
  }

  const content = lines.join('\n');
  const files = coreSymbols.map(s => s.file);

  return {
    content,
    files,
    threshold,
  };
}

/**
 * Layer 3: Build Module Details (模块完整详情)
 *
 * 指定模块路径的完整 Repo Map，包含所有符号。
 * 用于 AI 深入分析某个模块。
 *
 * @param symbols - Symbol manifest from Parser
 * @param modulePath - Module path (e.g. "packages/auth/src/")
 * @param referenceMap - Optional pre-computed reference map (avoid re-computation)
 * @returns ModuleDetailsOutput with complete module repo map
 */
export function buildModuleDetails(
  symbols: SymbolManifest,
  modulePath: string,
  referenceMap?: Record<string, number>
): ModuleDetailsOutput {
  // Normalize module path - convert both to same separator for comparison
  const normalizedInputPath = modulePath.replace(/\\/g, '/').replace(/\/+$/, '/');

  // Filter symbols by module path (handle both / and \ in cached paths)
  const moduleSymbols = symbols.symbols.filter(symbol => {
    const normalizedFilePath = symbol.file.replace(/\\/g, '/');
    return normalizedFilePath.startsWith(normalizedInputPath);
  });

  if (moduleSymbols.length === 0) {
    return {
      content: `Module not found: ${modulePath}`,
      modulePath,
      fileCount: 0,
      tokenCount: 0,
    };
  }

  // Use provided referenceMap or calculate once
  const refMap = referenceMap ?? countReferences(symbols);

  // Build module tree
  const tree = buildDirectoryTree(moduleSymbols);

  // Format with full details
  const content = formatRepoMap(tree, moduleSymbols, refMap);

  // Estimate tokens
  const lines = content.split('\n').length;
  const tokenCount = lines * 10;

  return {
    content,
    modulePath,
    fileCount: moduleSymbols.length,
    tokenCount,
  };
}

// Public exports
export { REPO_MAP_CONFIG } from './constants.js';

// Internal exports for use within repo-map module only (not exported to public API)