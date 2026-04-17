/**
 * Blueprint Orchestrator
 *
 * Coordinates single Blueprint Agent to generate wiki.json blueprint.
 */

import { FileEditTool, FileReadTool, FileWriteTool, GlobTool, GrepTool } from '@open-zread/agent-sdk';
import { createAgent } from './agents/create-agent';
import GenerateCatalog from './prompts/generate-catalog.mdx';
import { GenerateBlueprintTool, ValidateBlueprintTool } from './tools/output-tools.js';
import { GetCoreSignaturesTool, GetDirectoryTreeTool, GetModuleDetailsTool } from './tools/repo-map-tools.js';
import type { BlueprintResult } from './types.js';

/**
 * Generate Wiki Catalog
 *
 * 使用 Blueprint Agent 生成 wiki.json 目录结构。
 *
 * @returns BlueprintResult with output path and metadata
 */
export async function generateWikiCatalog(): Promise<BlueprintResult> {

  const result = await createAgent({
    tools: [
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
      GrepTool
    ],
    prompts: GenerateCatalog as string,
  });

  return {
    outputPath: result.outputPath,
    pagesCount: 0,
    coreModules: result.coreModules,
    durationMs: result.durationMs,
  };
}

// Re-export types
export type { BlueprintOptions, BlueprintResult } from './types.js';
