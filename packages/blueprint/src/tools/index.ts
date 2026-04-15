/**
 * Custom tools export
 */

export * from './skeleton-tools.js'
export * from './analysis-tools.js'
export * from './output-tools.js'

// Tool collections
import { GetCachedManifestTool, GetCachedSkeletonTool } from './skeleton-tools.js'
import { DetectTechStackTool, GetDirectoryTreeTool, AnalyzeReferencesTool } from './analysis-tools.js'
import { GenerateBlueprintTool, ValidateBlueprintTool } from './output-tools.js'
import type { ToolDefinition } from '@open-zread/agent'

export const skeletonTools: ToolDefinition[] = [
  GetCachedManifestTool,
  GetCachedSkeletonTool
]

export const analysisTools: ToolDefinition[] = [
  DetectTechStackTool,
  GetDirectoryTreeTool,
  AnalyzeReferencesTool
]

export const outputTools: ToolDefinition[] = [
  GenerateBlueprintTool,
  ValidateBlueprintTool
]

/**
 * Get all blueprint tools
 */
export function getAllBlueprintTools(): ToolDefinition[] {
  return [
    ...skeletonTools,
    ...analysisTools,
    ...outputTools
  ]
}