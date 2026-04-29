/**
 * Wiki Generation Types
 *
 * Types for Wiki content generation system.
 */

import type { WikiPage } from '@open-zread/types';
import type { TokenUsage } from '@open-zread/agent-sdk';

// ==================== 进度状态（批量回调） ====================

/**
 * Progress State
 *
 * Tracks generation progress for CLI display.
 */
export interface ProgressState {
  /** Total pages to generate */
  total: number;
  /** Completed pages */
  completed: number;
  /** Failed pages */
  failed: number;
  /** Pending pages */
  pending: number;
  /** Current page being processed */
  currentPage: WikiPage | null;
  /** Individual page results */
  results: PageResult[];
}

/**
 * Page Result
 *
 * Result of a single page generation.
 */
export interface PageResult {
  /** Page slug */
  slug: string;
  /** Success status */
  success: boolean;
  /** Output file path (if successful) */
  outputPath?: string;
  /** Error message (if failed) */
  error?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Token usage (if available) */
  tokenUsage?: TokenUsage;
}

/**
 * Wiki Result
 *
 * Final result of Wiki content generation.
 */
export interface WikiResult {
  /** Total pages */
  total: number;
  /** Successfully generated pages */
  completed: number;
  /** Failed pages */
  failed: number;
  /** Total duration in milliseconds */
  durationMs: number;
  /** Individual page results */
  results: PageResult[];
}

// ==================== 细粒度事件（实时回调） ====================

/**
 * 文章生成事件类型
 */
export type ArticleEventType =
  | 'page_start' // 开始处理某页
  | 'requesting' // Agent 请求中
  | 'responding' // Agent 响应中（流式）
  | 'tool_start' // 工具调用开始
  | 'tool_result' // 工具调用结果
  | 'retry' // API 重试中
  | 'page_complete' // 页面完成
  | 'page_error'; // 页面失败

/**
 * 文章事件 payload
 */
export interface ArticleEventPayload {
  type: ArticleEventType;
  /** 页面 slug */
  slug: string;
  /** Token 使用统计 */
  usage?: TokenUsage;
  /** 工具名称（tool_start 时） */
  toolName?: string;
  /** 错误信息 */
  error?: string;
  /** 输出路径 */
  outputPath?: string;
  /** 耗时 */
  durationMs?: number;
  /** 重试次数（retry 时） */
  retryCount?: number;
  /** 最大重试次数（retry 时） */
  maxRetries?: number;
  /** 重试延迟（retry 时） */
  delayMs?: number;
}

// ==================== 生成选项 ====================

/**
 * Generate Wiki Content Options
 */
export interface GenerateWikiOptions {
  /** Blueprint file path (default: .open-zread/wiki/wiki.json) */
  blueprintPath?: string;
  /** 待生成的页面列表（如果传入，则不从 blueprint 加载，只生成这些页面） */
  pages?: WikiPage[];
  /** Custom concurrency limit (overrides config) */
  maxConcurrent?: number;
  /** 细粒度事件回调（实时） */
  onEvent?: (event: ArticleEventPayload) => void;
  /** Progress callback for CLI display (batch) */
  onProgress?: (state: ProgressState) => void;
}