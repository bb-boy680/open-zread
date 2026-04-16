/**
 * Custom tools export
 */

export * from './cache-tools.js';
export * from './output-tools.js';
export * from './repo-map-tools.js';

// Tool collections
import { GetCachedManifestTool } from './cache-tools.js';
import { GenerateBlueprintTool, ValidateBlueprintTool } from './output-tools.js';
import {
  getAllRepoMapTools,
} from './repo-map-tools.js';
import type { ToolDefinition } from '@open-zread/agent';

export const cacheTools: ToolDefinition[] = [
  GetCachedManifestTool,
];

export const outputTools: ToolDefinition[] = [
  GenerateBlueprintTool,
  ValidateBlueprintTool,
];

// 三层 Repo Map 工具集合
export const repoMapTools: ToolDefinition[] = getAllRepoMapTools();

/**
 * Get all blueprint tools
 */
export function getAllBlueprintTools(): ToolDefinition[] {
  return [
    ...cacheTools,
    ...outputTools,
    ...getAllRepoMapTools(),
  ];
}