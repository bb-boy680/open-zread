/**
 * Wiki Generate 类型定义
 *
 * 架构设计：
 * - 基础类型：Status、Phase
 * - 目录状态：CatalogState
 * - 文章状态：PageStatus、ArticlesState
 * - 聚合状态：WikiGenerateState
 */

import type { WikiPage } from '@open-zread/types';
import type { TokenUsage, ArticleEventPayload } from '@open-zread/orchestrator';

// ==================== 基础状态类型 ====================

/** 统一状态枚举 */
export type Status = 'waiting' | 'loading' | 'completed' | 'failed';

/** 目录生成阶段 */
export type CatalogPhase = 'scanning' | 'requesting' | 'responding' | 'tool';

/** 文章生成阶段 */
export type ArticlePhase = 'requesting' | 'responding' | 'tool';

/** 文章事件类型 */
export type ArticleEventType =
  | 'page_start'
  | 'requesting'
  | 'responding'
  | 'tool_start'
  | 'tool_result'
  | 'page_complete'
  | 'page_error';

// ==================== 导出外部类型 ====================

export type { WikiPage } from '@open-zread/types';
export type { TokenUsage, ArticleEventPayload } from '@open-zread/orchestrator';

// ==================== 目录状态 ====================

/** 目录生成状态 */
export interface CatalogState {
  status: Status;
  phase?: CatalogPhase;
  /** 当前工具名（tool 阶段） */
  currentTool?: string;
  /** Token 使用统计 */
  usage?: TokenUsage;
  /** 耗时（毫秒） */
  durationMs?: number;
  /** 错误信息 */
  error?: string;
}

// ==================== 文章状态 ====================

/** 单篇文章状态 */
export interface PageStatus {
  status: Status;
  phase?: ArticlePhase;
  /** 当前工具名（tool 阶段） */
  currentTool?: string;
  /** Token 使用统计 */
  usage?: TokenUsage;
  /** 耗时（毫秒） */
  durationMs?: number;
  /** 错误信息 */
  error?: string;
  /** 输出路径（完成时） */
  outputPath?: string;
}

/** 文章集合状态 */
export interface ArticlesState {
  /** 状态映射：slug → PageStatus */
  pages: Record<string, PageStatus>;
  /** 当前正在生成的页面 slug */
  currentPageSlug?: string;
  /** 已完成数量 */
  completedCount: number;
  /** 失败数量 */
  failedCount: number;
  /** 待处理数量 */
  pendingCount: number;
  /** 总耗时（毫秒） */
  totalDurationMs?: number;
}

// ==================== 聚合状态 ====================

/** Wiki 生成完整状态 */
export interface WikiGenerateState {
  catalog: CatalogState;
  articles: ArticlesState;
  /** 文章列表数据（来自 wiki.json） */
  wikiPages: WikiPage[];
}

// ==================== 事件 Payload（供 mapper 使用） ====================

/** 目录事件类型 */
export type CatalogEventType =
  | 'scanning'
  | 'parsing'
  | 'requesting'
  | 'responding'
  | 'tool_start'
  | 'tool_result'
  | 'complete'
  | 'error';

/** 目录事件 payload */
export interface CatalogEventPayload {
  type: CatalogEventType;
  phase?: CatalogPhase;
  toolName?: string;
  usage?: TokenUsage;
  error?: string;
  durationMs?: number;
  outputPath?: string;
}

// ==================== 兼容旧类型（过渡期保留） ====================

/** 目录生成进度状态（旧命名，兼容现有代码） */
export type CatalogProgress = CatalogState;