/**
 * Cache Tools - Read cached data from CLI
 *
 * These tools read data that CLI has already processed:
 * - Manifest (file list with hash/size)
 */

import type { ToolDefinition } from '@open-zread/agent';
import { loadCachedManifest } from '@open-zread/core';

/**
 * Get Cached Manifest Tool
 *
 * Retrieves cached file manifest from previous CLI run.
 * Returns file list with path, hash, size information.
 */
export const GetCachedManifestTool: ToolDefinition = {
  name: 'get_cached_manifest',
  description: '获取 CLI 缓存的文件清单（如果存在）。返回文件路径、哈希、大小等信息。用于了解项目文件结构。',
  inputSchema: {
    type: 'object',
    properties: {},
    required: [],
  },
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  isEnabled: () => true,
  async prompt() {
    return 'Get cached file manifest from previous CLI run.';
  },
  async call() {
    try {
      const manifest = await loadCachedManifest();

      if (!manifest) {
        return {
          type: 'tool_result',
          tool_use_id: '',
          content: '缓存不存在。请先运行 CLI 执行扫描，或使用 Glob 工具获取文件列表。',
        };
      }

      // Group files by extension for summary
      const extGroups: Record<string, number> = {};
      for (const file of manifest.files) {
        const ext = file.path.split('.').pop() || 'unknown';
        extGroups[ext] = (extGroups[ext] || 0) + 1;
      }

      return {
        type: 'tool_result',
        tool_use_id: '',
        content: JSON.stringify({
          cached: true,
          totalFiles: manifest.files.length,
          generatedAt: manifest.generated_at,
          extensions: Object.entries(extGroups)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15)
            .map(([ext, count]) => ({ extension: ext, count })),
          files: manifest.files.slice(0, 30), // First 30 files as sample
        }, null, 2),
      };
    } catch (err: any) {
      return {
        type: 'tool_result',
        tool_use_id: '',
        content: `读取缓存失败: ${err.message}`,
        is_error: true,
      };
    }
  },
};