/**
 * Blueprint Generation Types
 */

import type { FileManifest, SymbolManifest, DehydratedSkeleton } from '@open-zread/types'

/**
 * Tech stack summary from ScanAgent
 */
export interface TechStackSummary {
  techStack: {
    languages: string[]
    frameworks: string[]
    buildTools: string[]
    testFrameworks?: string[]
  }
  projectType: 'frontend' | 'backend' | 'fullstack' | 'library' | 'cli' | 'unknown'
  entryPoints: string[]
}

/**
 * Core module from ClusterAgent
 */
export interface CoreModule {
  name: string
  files: string[]
  reason: string
  referenceCount: number
}

/**
 * Module grouping from ClusterAgent
 */
export interface ModuleGroups {
  [groupName: string]: string[]
}

/**
 * Core modules analysis result
 */
export interface CoreModules {
  coreModules: CoreModule[]
  moduleGroups: ModuleGroups
}

/**
 * Context passed between agents
 */
export interface BlueprintContext {
  projectRoot: string
  fileManifest?: FileManifest
  symbolManifest?: SymbolManifest
  skeleton?: DehydratedSkeleton
  techStackSummary?: TechStackSummary
  coreModules?: CoreModules
}

/**
 * Blueprint generation result
 */
export interface BlueprintResult {
  outputPath: string
  pagesCount: number
  techStackSummary?: TechStackSummary
  coreModules?: CoreModules
  durationMs: number
}

/**
 * Blueprint generation options
 * Note: LLM config is loaded from ~/.zread/config.yaml, not passed here
 */
export interface BlueprintOptions {
  projectRoot?: string
  language?: 'zh' | 'en'
  debug?: boolean
}