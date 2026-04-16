/**
 * Repo Map Tools - Provide Repo Map to Blueprint Agent
 */

import type { ToolDefinition } from '@open-zread/agent';
import { loadCachedSymbols } from '@open-zread/core';
import { buildRepoMap } from '@open-zread/skeleton';

/**
 * Get Repo Map Tool
 *
 * Generates Repo Map from cached SymbolManifest.
 * This is the primary input for the Blueprint Agent.
 */
export const GetRepoMapTool: ToolDefinition = {
  name: 'get_repo_map',
  description: '生成项目的 Repo Map（树状结构上下文）。这是 LLM 理解项目的核心输入，包含文件结构、符号定义、引用计数。需要先运行 CLI 生成缓存。',
  inputSchema: {
    type: 'object',
    properties: {
      tokenBudget: {
        type: 'number',
        description: 'Token 预算（默认无限制）',
      },
      includeAll: {
        type: 'boolean',
        description: '是否包含所有文件（默认 true）',
      },
    },
    required: [],
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Generate Repo Map for the project.';
  },
  async call(input: { tokenBudget?: number; includeAll?: boolean }) {
    try {
      const symbols = await loadCachedSymbols();

      if (!symbols || symbols.symbols.length === 0) {
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: '缓存不存在或为空。请先运行 CLI：bun run dev',
        };
      }

      const repoMap = await buildRepoMap(symbols, {
        tokenBudget: input.tokenBudget,
        includeAll: input.includeAll ?? true,
      });

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify({
          repoMap: repoMap.content,
          tokenCount: repoMap.tokenCount,
          fileCount: repoMap.fileCount,
          topFiles: repoMap.topFiles,
        }, null, 2),
      };
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `生成 Repo Map 失败: ${err.message}`,
        is_error: true,
      };
    }
  },
};