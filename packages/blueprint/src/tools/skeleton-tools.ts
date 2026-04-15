/**
 * Skeleton Tools - Call skeleton package functions
 */

import type { ToolDefinition } from '@open-zread/agent'
import { scanFiles, parseFiles, dehydrate, countReferences } from '@open-zread/skeleton'
import { getProjectRoot } from '@open-zread/core'
import type { FileManifest, SymbolManifest } from '@open-zread/types'

/**
 * Scan Project Tool
 *
 * Scans project directory and returns file manifest.
 */
export const ScanProjectTool: ToolDefinition = {
  name: 'scan_project',
  description: '扫描项目目录，返回文件清单（包含路径、语言、大小、哈希等信息）。',
  inputSchema: {
    type: 'object',
    properties: {
      projectRoot: {
        type: 'string',
        description: '项目根目录路径（可选，默认使用当前目录）'
      }
    },
    required: []
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Scan the project to get a complete file listing.'
  },
  async call(input: { projectRoot?: string }) {
    try {
      const root = input.projectRoot || getProjectRoot()
      const manifest = await scanFiles(root)

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify(manifest, null, 2)
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `扫描失败: ${err.message}`,
        is_error: true
      }
    }
  }
}

/**
 * Parse Symbols Tool
 *
 * Parses code files and extracts symbols (imports, exports, functions, etc.)
 */
export const ParseSymbolsTool: ToolDefinition = {
  name: 'parse_symbols',
  description: '解析代码文件，提取导入、导出、函数签名等符号信息。需要提供文件清单。',
  inputSchema: {
    type: 'object',
    properties: {
      manifest: {
        type: 'object',
        description: 'FileManifest 对象（从 scan_project 获得）'
      },
      projectRoot: {
        type: 'string',
        description: '项目根目录路径（可选）'
      }
    },
    required: ['manifest']
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Parse files to extract code symbols.'
  },
  async call(input: { manifest: FileManifest; projectRoot?: string }) {
    try {
      const manifest = input.manifest as FileManifest

      // Note: parseFiles uses getProjectRoot() internally
      const symbolManifest = await parseFiles(manifest)

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify(symbolManifest, null, 2)
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `解析失败: ${err.message}`,
        is_error: true
      }
    }
  }
}

/**
 * Dehydrate Skeleton Tool
 *
 * Generates dehydrated skeleton from symbol manifest.
 * Returns skeleton content and reference map.
 */
export const DehydrateSkeletonTool: ToolDefinition = {
  name: 'dehydrate_skeleton',
  description: '将代码脱水为骨架，保留签名和文档注释，移除函数体细节。返回骨架内容和引用计数。',
  inputSchema: {
    type: 'object',
    properties: {
      symbols: {
        type: 'object',
        description: 'SymbolManifest 对象（从 parse_symbols 获得）'
      }
    },
    required: ['symbols']
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Generate dehydrated code skeleton with reference counts.'
  },
  async call(input: { symbols: SymbolManifest }) {
    try {
      const symbols = input.symbols as SymbolManifest

      const skeleton = await dehydrate(symbols)

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify(skeleton, null, 2)
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `脱水失败: ${err.message}`,
        is_error: true
      }
    }
  }
}

/**
 * Count References Tool
 *
 * Analyzes reference counts from symbol manifest.
 */
export const CountReferencesTool: ToolDefinition = {
  name: 'count_references',
  description: '分析符号引用计数，返回每个文件被引用的次数。',
  inputSchema: {
    type: 'object',
    properties: {
      symbols: {
        type: 'object',
        description: 'SymbolManifest 对象'
      }
    },
    required: ['symbols']
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Count file references to identify core modules.'
  },
  async call(input: { symbols: SymbolManifest }) {
    try {
      const symbols = input.symbols as SymbolManifest

      const referenceMap = countReferences(symbols)

      // Sort by reference count (descending)
      const sorted = Object.entries(referenceMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 50) // Top 50 files

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify({
          topFiles: sorted.map(([file, count]) => ({ file, count })),
          totalFiles: Object.keys(referenceMap).length
        }, null, 2)
      }
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `引用计数失败: ${err.message}`,
        is_error: true
      }
    }
  }
}