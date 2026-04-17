/**
 * 三层 Repo Map Tools - 分层递进的项目上下文工具
 *
 * Layer 1: get_directory_tree - 纯目录结构
 * Layer 2: get_core_signatures - 核心文件签名
 * Layer 3: get_module_details - 模块完整详情
 */

import type { ToolDefinition, ToolInputParams, ToolContext, ToolResult } from '@open-zread/agent';
import { loadCachedSymbols } from '@open-zread/core';
import { buildDirectoryTreeOnly, buildCoreSignatures, buildModuleDetails } from '@open-zread/skeleton';

/**
 * Layer 1: Get Directory Tree Tool
 *
 * 生成纯目录结构树，不含符号信息。
 * Token 消耗极低，用于 AI 建立全局模块框架。
 */
export const GetDirectoryTreeTool: ToolDefinition = {
  name: 'get_directory_tree',
  description: '获取项目目录树（纯结构，无符号）。Token 消耗极低（约 200-500），用于建立全局模块框架。需要先运行 CLI 生成缓存。',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Get project directory tree structure.';
  },
  async call(_input: ToolInputParams, _context: ToolContext): Promise<ToolResult> {
    try {
      const symbols = await loadCachedSymbols();

      if (!symbols || symbols.symbols.length === 0) {
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: '缓存不存在或为空。请先运行 CLI：bun run dev',
        };
      }

      const output = buildDirectoryTreeOnly(symbols);

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify({
          directoryTree: output.content,
          directories: output.directories,
          directoryCount: output.directories.length,
        }, null, 2),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `生成目录树失败: ${message}`,
        is_error: true,
      };
    }
  },
};

/**
 * Layer 2: Get Core Signatures Tool
 *
 * 生成核心文件签名（Ref >= threshold）。
 * 仅包含导出签名，用于 AI 理解核心 API 边界。
 */
export const GetCoreSignaturesTool: ToolDefinition = {
  name: 'get_core_signatures',
  description: '获取核心文件签名（高引用文件，Ref >= 5）。仅显示导出签名，不含函数体。用于理解核心 API 边界。需要先运行 CLI 生成缓存。',
  inputSchema: {
    type: 'object',
    properties: {
      threshold: {
        type: 'number',
        description: '引用阈值（默认 5，文件被引用次数 >= threshold 才会显示）',
      },
    },
    required: [],
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Get core file signatures.';
  },
  async call(input: ToolInputParams, _context: ToolContext): Promise<ToolResult> {
    try {
      const symbols = await loadCachedSymbols();

      if (!symbols || symbols.symbols.length === 0) {
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: '缓存不存在或为空。请先运行 CLI：bun run dev',
        };
      }

      const threshold = (input.threshold as number | undefined) ?? 5;
      const output = buildCoreSignatures(symbols, threshold);

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify({
          coreSignatures: output.content,
          coreFiles: output.files,
          threshold: output.threshold,
          coreFileCount: output.files.length,
        }, null, 2),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `生成核心签名失败: ${message}`,
        is_error: true,
      };
    }
  },
};

/**
 * Layer 3: Get Module Details Tool
 *
 * 生成指定模块的完整 Repo Map。
 * 包含所有符号（exports + functions + docstrings）。
 * 用于 AI 深入分析某个模块。
 */
export const GetModuleDetailsTool: ToolDefinition = {
  name: 'get_module_details',
  description: '获取指定模块的完整详情（所有符号、引用计数）。用于深入分析某个模块的实现。需要先运行 CLI 生成缓存。',
  inputSchema: {
    type: 'object',
    properties: {
      modulePath: {
        type: 'string',
        description: '模块路径（如 packages/auth/src/ 或 packages/core/src/agent/）',
      },
    },
    required: ['modulePath'],
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Get detailed module repo map.';
  },
  async call(input: ToolInputParams, _context: ToolContext): Promise<ToolResult> {
    try {
      const modulePath = input.modulePath as string;
      const symbols = await loadCachedSymbols();

      if (!symbols || symbols.symbols.length === 0) {
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: '缓存不存在或为空。请先运行 CLI：bun run dev',
        };
      }

      const output = buildModuleDetails(symbols, modulePath);

      if (output.fileCount === 0) {
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: `模块未找到: ${modulePath}\n请检查路径是否正确（以 / 结尾）`,
          is_error: true,
        };
      }

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify({
          moduleDetails: output.content,
          modulePath: output.modulePath,
          fileCount: output.fileCount,
          tokenCount: output.tokenCount,
        }, null, 2),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `生成模块详情失败: ${message}`,
        is_error: true,
      };
    }
  },
};

// 工具集合
export const directoryTreeTools: ToolDefinition[] = [GetDirectoryTreeTool];
export const coreSignatureTools: ToolDefinition[] = [GetCoreSignaturesTool];
export const moduleDetailTools: ToolDefinition[] = [GetModuleDetailsTool];

/**
 * Get all three-layer repo map tools
 */
export function getAllRepoMapTools(): ToolDefinition[] {
  return [
    GetDirectoryTreeTool,
    GetCoreSignaturesTool,
    GetModuleDetailsTool,
  ];
}