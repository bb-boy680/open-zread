/**
 * Blueprint Generation Types
 */

import type { FileManifest, SymbolManifest } from '@open-zread/types';
import type { TokenUsage } from '@open-zread/agent-sdk';

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
  tokenUsage?: TokenUsage;
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

/**
 * Catalog generation event (for streaming progress)
 *
 * 完整流程：scanning → parsing → generating (Agent)
 */
export interface CatalogEvent {
  type: 'scanning' | 'parsing' | 'requesting' | 'responding' | 'tool_start' | 'tool_result' | 'complete' | 'error' | 'retry';
  /** scanning/parsing 阶段的进度信息 */
  progress?: {
    current: number;
    total: number;
  };
  /** tool 阶段的工具信息 */
  toolName?: string;
  toolInput?: string;
  output?: string;
  /** Token 使用统计 */
  usage?: TokenUsage;
  /** 错误信息 */
  error?: string;
  /** 输出路径（complete 时） */
  outputPath?: string;
  /** 耗时 */
  durationMs?: number;
  /** 重试次数（retry 时） */
  retryCount?: number;
  /** 最大重试次数（retry 时） */
  maxRetries?: number;
  /** 重试延迟毫秒（retry 时） */
  delayMs?: number;
}