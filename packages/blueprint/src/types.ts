/**
 * Blueprint Generation Types
 */

import type { FileManifest, SymbolManifest } from '@open-zread/types';

/**
 * Tech stack summary (parsed from Repo Map or package.json)
 */
export interface TechStackSummary {
  techStack: {
    languages: string[];
    frameworks: string[];
    buildTools: string[];
    testFrameworks?: string[];
  };
  projectType: 'frontend' | 'backend' | 'fullstack' | 'library' | 'cli' | 'unknown';
  entryPoints: string[];
}

/**
 * Core module identified from Repo Map reference counts
 */
export interface CoreModule {
  name: string;
  files: string[];
  reason: string;
  referenceCount?: number;
}

/**
 * Module grouping by directory or functionality
 */
export interface ModuleGroups {
  [groupName: string]: string[];
}

/**
 * Core modules analysis result from Repo Map
 */
export interface CoreModules {
  coreModules: CoreModule[];
  moduleGroups: ModuleGroups;
}

/**
 * Context for Blueprint Agent
 */
export interface BlueprintContext {
  projectRoot: string;
  fileManifest?: FileManifest;
  symbolManifest?: SymbolManifest;
  techStackSummary?: TechStackSummary;
  coreModules?: CoreModules;
}

/**
 * Blueprint generation result
 */
export interface BlueprintResult {
  outputPath: string;
  pagesCount: number;
  techStackSummary?: TechStackSummary;
  coreModules?: CoreModules;
  durationMs: number;
}

/**
 * Blueprint generation options
 * Note: LLM config is loaded from ~/.zread/config.yaml, not passed here
 */
export interface BlueprintOptions {
  projectRoot?: string;
  language?: 'zh' | 'en';
  debug?: boolean;
}