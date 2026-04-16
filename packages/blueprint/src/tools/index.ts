/**
 * Custom tools export
 */

export * from './cache-tools.js';
export * from './output-tools.js';
export * from './repo-map-tools.js';

// Tool collections
import { GetCachedManifestTool } from './cache-tools.js';
import { GenerateBlueprintTool, ValidateBlueprintTool } from './output-tools.js';
import { GetRepoMapTool } from './repo-map-tools.js';
import type { ToolDefinition } from '@open-zread/agent';

export const cacheTools: ToolDefinition[] = [
  GetCachedManifestTool,
];

export const outputTools: ToolDefinition[] = [
  GenerateBlueprintTool,
  ValidateBlueprintTool,
];

export const repoMapTools: ToolDefinition[] = [
  GetRepoMapTool,
];

/**
 * Get all blueprint tools
 */
export function getAllBlueprintTools(): ToolDefinition[] {
  return [
    ...cacheTools,
    ...outputTools,
    ...repoMapTools,
  ];
}