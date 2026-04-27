/**
 * 初始状态工厂（纯函数）
 *
 * 无外部依赖，易于测试。
 */

import type { WikiPage } from '@open-zread/types';
import type {
  CatalogState,
  ArticlesState,
  PageStatus,
  WikiGenerateState,
} from './types';

// ==================== 目录初始状态 ====================

/** 目录初始状态 */
export const initialCatalogState: CatalogState = {
  status: 'waiting',
};

// ==================== 文章初始状态 ====================

/** 单篇文章初始状态 */
export const initialPageStatus: PageStatus = {
  status: 'waiting',
};

/**
 * 创建文章初始状态（工厂函数）
 *
 * @param pages - Wiki 页面列表
 * @returns ArticlesState 初始状态
 */
export function createInitialArticlesState(pages: WikiPage[]): ArticlesState {
  const pageStatuses: Record<string, PageStatus> = {};

  for (const page of pages) {
    pageStatuses[page.slug] = initialPageStatus;
  }

  return {
    pages: pageStatuses,
    completedCount: 0,
    failedCount: 0,
    pendingCount: pages.length,
  };
}

// ==================== 聚合初始状态 ====================

/**
 * 创建 Wiki 生成初始状态（工厂函数）
 *
 * @param pages - Wiki 页面列表（来自 wiki.json）
 * @returns WikiGenerateState 初始状态
 */
export function createInitialWikiState(pages: WikiPage[]): WikiGenerateState {
  return {
    catalog: initialCatalogState,
    articles: createInitialArticlesState(pages),
    wikiPages: pages,
  };
}