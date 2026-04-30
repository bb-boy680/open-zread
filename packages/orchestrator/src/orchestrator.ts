/**
 * Blueprint Orchestrator
 *
 * Coordinates single Blueprint Agent to generate wiki.json blueprint.
 */

import { FileEditTool, FileReadTool, FileWriteTool, GlobTool, GrepTool } from '@open-zread/agent-sdk';
import { createAgent } from './agents/create-agent';
import GenerateCatalog from './prompts/generate-catalog';
import { GenerateBlueprintTool, ValidateBlueprintTool } from './tools/output-tools.js';
import { GetCoreSignaturesTool, GetDirectoryTreeTool, GetModuleDetailsTool } from './tools/repo-map-tools.js';
import type { BlueprintResult, CatalogEvent } from './types.js';

/** Blueprint Agent 工具列表 */
const BLUEPRINT_TOOLS = [
  // 三层 Repo Map 工具
  GetDirectoryTreeTool,      // Layer 1: 目录树
  GetCoreSignaturesTool,     // Layer 2: 核心签名
  GetModuleDetailsTool,      // Layer 3: 模块详情
  // 输出工具
  GenerateBlueprintTool,     // 生成 wiki.json
  ValidateBlueprintTool,     // 验证蓝图
  // 基础工具
  FileReadTool,
  FileWriteTool,
  FileEditTool,
  GlobTool,
  GrepTool,
];

/**
 * Generate Wiki Catalog
 *
 * 使用 Blueprint Agent 生成 wiki.json 目录结构。
 * 支持可选进度回调用于实时 UI 更新。
 *
 * @param onEvent - 进度回调（可选）
 * @returns BlueprintResult with output path and metadata
 */
export async function generateWikiCatalog(
  onEvent?: (event: CatalogEvent) => void
): Promise<BlueprintResult> {
  const result = await createAgent({
    tools: BLUEPRINT_TOOLS,
    prompts: GenerateCatalog as string,
    onEvent,
  });

  return {
    pagesCount: 0,
    durationMs: result.durationMs,
    tokenUsage: result.tokenUsage,
  };
}

// Re-export types
export type { BlueprintOptions, BlueprintResult, CatalogEvent } from './types.js';
