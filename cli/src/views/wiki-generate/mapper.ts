/**
 * 事件→状态映射（纯函数）
 *
 * 核心原则：
 * - 输入状态 + 事件 → 输出新状态
 * - 无副作用，易于测试
 *
 * 注意：SDK 的 usage 已经是累积总量，不需要再累加
 */

import type { ArticleEventPayload } from '@open-zread/orchestrator';
import type {
  CatalogState,
  ArticlesState,
  PageStatus,
  CatalogEventPayload,
} from './types';
import { initialPageStatus } from './state';

// ==================== 目录状态转换 ====================

/**
 * 目录事件 → 状态转换（纯函数）
 *
 * @param state - 当前目录状态
 * @param event - 目录事件 payload
 * @returns 新目录状态
 *
 * 注意：usage 直接使用 SDK 返回值（已是累积总量）
 */
export function catalogEventToState(
  state: CatalogState,
  event: CatalogEventPayload
): CatalogState {
  switch (event.type) {
    case 'scanning':
      return {
        ...state,
        status: 'loading',
        phase: 'scanning',
      };

    case 'parsing':
      return {
        ...state,
        status: 'loading',
        phase: 'scanning',
      };

    case 'requesting':
      return {
        ...state,
        status: 'loading',
        phase: 'requesting',
        usage: event.usage, // 直接使用，不累加
      };

    case 'responding':
      return {
        ...state,
        status: 'loading',
        phase: 'responding',
        usage: event.usage, // 直接使用，不累加
      };

    case 'tool_start':
      return {
        ...state,
        status: 'loading',
        phase: 'tool',
        currentTool: event.toolName,
        usage: event.usage, // 直接使用，不累加
      };

    case 'tool_result':
      return {
        ...state,
        status: 'loading',
        phase: 'responding',
        usage: event.usage, // 直接使用，不累加
      };

    case 'complete':
      return {
        status: 'completed',
        usage: event.usage,
        durationMs: event.durationMs ?? 0,
      };

    case 'error':
      return {
        status: 'failed',
        usage: event.usage,
        error: event.error,
        durationMs: event.durationMs ?? 0,
      };

    case 'retry':
      return {
        ...state,
        status: 'loading',
        phase: 'retry',
        retryCount: event.retryCount,
        maxRetries: event.maxRetries,
        delayMs: event.delayMs,
        error: event.error,
        usage: event.usage,
      };

    default:
      return state;
  }
}

// ==================== 文章状态转换 ====================

/**
 * 文章事件 → 状态转换（纯函数）
 *
 * @param state - 当前文章集合状态
 * @param event - 文章事件 payload
 * @returns 新文章集合状态
 *
 * 注意：usage 直接使用 SDK 返回值（已是累积总量）
 */
export function articleEventToState(
  state: ArticlesState,
  event: ArticleEventPayload
): ArticlesState {
  // 获取当前页面状态
  const currentStatus = state.pages[event.slug] || initialPageStatus;

  // 计算新页面状态（usage 直接使用，不累加）
  let newPageStatus: PageStatus;

  switch (event.type) {
    case 'page_start':
      newPageStatus = {
        ...initialPageStatus,
        status: 'loading',
        phase: 'requesting',
      };
      break;

    case 'requesting':
      newPageStatus = {
        ...currentStatus,
        status: 'loading',
        phase: 'requesting',
        usage: event.usage, // 直接使用，不累加
      };
      break;

    case 'responding':
      newPageStatus = {
        ...currentStatus,
        status: 'loading',
        phase: 'responding',
        usage: event.usage, // 直接使用，不累加
      };
      break;

    case 'tool_start':
      newPageStatus = {
        ...currentStatus,
        status: 'loading',
        phase: 'tool',
        currentTool: event.toolName,
        usage: event.usage, // 直接使用，不累加
      };
      break;

    case 'tool_result':
      newPageStatus = {
        ...currentStatus,
        status: 'loading',
        phase: 'responding',
        usage: event.usage, // 直接使用，不累加
      };
      break;

    case 'retry':
      newPageStatus = {
        ...currentStatus,
        status: 'loading',
        phase: 'retry',
        retryCount: event.retryCount,
        maxRetries: event.maxRetries,
        delayMs: event.delayMs,
        error: event.error,
        usage: event.usage,
      };
      break;

    case 'page_complete':
      newPageStatus = {
        status: 'completed',
        usage: event.usage, // 直接使用，不累加
        durationMs: event.durationMs ?? 0,
        outputPath: event.outputPath,
      };
      break;

    case 'page_error':
      newPageStatus = {
        status: 'failed',
        usage: event.usage, // 直接使用，不累加
        error: event.error,
        durationMs: event.durationMs ?? 0,
      };
      break;

    default:
      return state;
  }

  // 计算统计变化
  const oldStatus = currentStatus.status;
  const newStatus = newPageStatus.status;

  let completedCount = state.completedCount;
  let failedCount = state.failedCount;
  let pendingCount = state.pendingCount;

  // 状态变化时更新计数
  if (oldStatus !== newStatus) {
    if (oldStatus === 'waiting' || oldStatus === 'loading') {
      pendingCount--;
    }
    if (newStatus === 'completed') {
      completedCount++;
    }
    if (newStatus === 'failed') {
      failedCount++;
    }
  }

  return {
    ...state,
    pages: { ...state.pages, [event.slug]: newPageStatus },
    currentPageSlug:
      event.type === 'page_start' ? event.slug : state.currentPageSlug,
    completedCount,
    failedCount,
    pendingCount,
  };
}