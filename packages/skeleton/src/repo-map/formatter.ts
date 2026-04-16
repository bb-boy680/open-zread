/**
 * Repo Map Formatter - Format tree structure for LLM readability
 */

import type { SymbolInfo, DirectoryTreeNode, RepoMapOutput } from '@open-zread/types';
import { REPO_MAP_CONFIG } from './constants.js';

/**
 * Build directory tree from selected files
 */
export function buildDirectoryTree(files: SymbolInfo[]): DirectoryTreeNode {
  const root: DirectoryTreeNode = {
    name: 'root',
    type: 'directory',
    children: [],
  };

  for (const symbol of files) {
    // Normalize path
    const normalizedPath = symbol.file.replace(/\\/g, '/');
    const parts = normalizedPath.split('/');
    const fileName = parts.pop() || '';

    // Navigate/create directory structure
    let current = root;
    for (const dirName of parts) {
      if (!current.children) current.children = [];

      let dirNode = current.children.find(c => c.name === dirName && c.type === 'directory');
      if (!dirNode) {
        dirNode = {
          name: dirName,
          type: 'directory',
          children: [],
        };
        current.children.push(dirNode);
      }
      current = dirNode;
    }

    // Add file node
    if (!current.children) current.children = [];
    current.children.push({
      name: fileName,
      type: 'file',
      path: symbol.file,
    });

    // Sort children: directories first, then files alphabetically
    current.children.sort((a: DirectoryTreeNode, b: DirectoryTreeNode) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  }

  return root;
}

/**
 * Format Repo Map as tree string
 */
export function formatRepoMap(
  tree: DirectoryTreeNode,
  symbols: SymbolInfo[],
  referenceMap: Record<string, number>
): string {
  const lines: string[] = [];

  // Header
  lines.push('Project Tree & Symbols');
  lines.push('');

  // Format tree recursively (skip 'root' name)
  if (tree.children) {
    formatTreeNode(tree.children, symbols, referenceMap, lines, '');
  }

  return lines.join('\n');
}

/**
 * Format single tree node
 */
function formatTreeNode(
  nodes: DirectoryTreeNode[],
  symbols: SymbolInfo[],
  referenceMap: Record<string, number>,
  lines: string[],
  prefix: string
): void {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const nodePrefix = isLast ? '└── ' : '├── ';
    const childPrefix = isLast ? '    ' : REPO_MAP_CONFIG.tree_indent;

    if (node.type === 'directory') {
      // Directory node
      lines.push(`${prefix}${nodePrefix}${node.name}/`);
      if (node.children && node.children.length > 0) {
        formatTreeNode(node.children, symbols, referenceMap, lines, prefix + childPrefix);
      }
    } else if (node.type === 'file' && node.path) {
      // File node
      const symbol = symbols.find(s => s.file === node.path);
      if (!symbol) continue;

      const refCount = referenceMap[node.path] || 0;
      const refLabel = refCount > 0 ? ` [Ref: ${refCount}]` : '';

      lines.push(`${prefix}${nodePrefix}${node.name}${refLabel}`);

      // Add symbol details
      const symbolPrefix = prefix + childPrefix;

      // Docstring (first one)
      if (symbol.docstrings.length > 0) {
        const doc = symbol.docstrings[0].trim();
        lines.push(`${symbolPrefix}/** ${doc} */`);
      }

      // Exports (with signature truncation)
      for (const exp of symbol.exports) {
        const trimmed = trimSignature(exp, REPO_MAP_CONFIG.max_signature_length);
        lines.push(`${symbolPrefix}[Export] ${trimmed}`);
      }

      // Functions
      for (const fn of symbol.functions) {
        const trimmed = trimSignature(fn.signature, REPO_MAP_CONFIG.max_signature_length);
        lines.push(`${symbolPrefix}${trimmed}`);
      }

      // Empty line after file (for readability)
      if (symbol.exports.length > 0 || symbol.functions.length > 0 || symbol.docstrings.length > 0) {
        lines.push(`${symbolPrefix}`);
      }
    }
  }
}

/**
 * Trim signature to max length
 */
export function trimSignature(signature: string, maxLength: number): string {
  if (signature.length <= maxLength) return signature;

  // Try to keep meaningful part
  const trimmed = signature.slice(0, maxLength - 3);
  return trimmed + '...';
}

/**
 * Build complete Repo Map output
 */
export function buildRepoMapOutput(
  content: string,
  selectedSymbols: SymbolInfo[],
  priorities: { file: string; referenceCount: number }[]
): RepoMapOutput {
  // Estimate token count (rough: 1 char ≈ 0.5 token for Chinese, 0.25 for English)
  // Use conservative estimate: 1 line ≈ 10 tokens
  const lines = content.split('\n').length;
  const tokenCount = lines * 10;

  // Get top files
  const topFiles = priorities
    .sort((a: { file: string; referenceCount: number }, b: { file: string; referenceCount: number }) => b.referenceCount - a.referenceCount)
    .slice(0, 10)
    .map(p => p.file);

  return {
    content,
    tokenCount,
    fileCount: selectedSymbols.length,
    topFiles,
  };
}