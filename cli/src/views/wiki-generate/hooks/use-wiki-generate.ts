/**
 * useWikiGenerate - Wiki 生成组合 Hook
 *
 * 聚合层设计：
 * - 组合 useCatalogGenerate 和 useArticlesGenerate
 * - 提供统一的声明式接口
 * - 计算派生状态（简化组件逻辑）
 * - 支持强制重新生成模式
 */

import { useMemo } from "react";
import { useWiki } from "../../../provider";
import { useCatalogGenerate } from "./use-catalog";
import { useArticlesGenerate } from "./use-articles";
import type { WikiGenerateState, WikiPage } from "../types";

// ==================== 接口定义 ====================

interface UseWikiGenerateOptions {
  /** 强制重新生成（忽略现有 wiki.json） */
  forceRegenerate?: boolean;
}

interface UseWikiGenerateReturn {
  /** 聚合状态 */
  state: WikiGenerateState;
  /** 操作方法 */
  actions: {
    /** 开始目录生成 */
    startCatalog: () => Promise<void>;
    /** 重试目录生成 */
    retryCatalog: () => void;
    /** 开始文章生成 */
    startArticles: () => Promise<void>;
    /** 重试所有失败文章 */
    retryArticles: () => void;
    /** 重试单篇文章 */
    retryPage: (slug: string) => void;
  };
  /** 派生状态（计算属性） */
  derived: {
    /** 是否已有 wiki.json */
    hasWikiCatalog: boolean;
    /** 目录是否完成 */
    catalogCompleted: boolean;
    /** 文章是否全部完成 */
    articlesCompleted: boolean;
    /** 全部流程是否完成 */
    allCompleted: boolean;
  };
}

// ==================== Hook 实现 ====================

export function useWikiGenerate(options?: UseWikiGenerateOptions): UseWikiGenerateReturn {
  const { wikiCatalog, reload } = useWiki();
  const forceRegenerate = options?.forceRegenerate ?? false;

  // 派生：是否有 wiki.json（强制模式时视为无）
  const hasWikiCatalog = !forceRegenerate && wikiCatalog !== null;

  // 派生：文章列表
  const pages: WikiPage[] = useMemo(
    () => wikiCatalog?.pages ?? [],
    [wikiCatalog?.pages]
  );

  // 目录生成 Hook
  const catalog = useCatalogGenerate({
    hasWikiCatalog,
    forceRegenerate,
    onComplete: reload, // 目录完成后重新加载
  });

  // 文章生成 Hook（目录完成后自动开始）
  const articles = useArticlesGenerate({
    pages,
    canStart: catalog.state.status === "completed",
    onComplete: reload,
  });

  // 聚合状态
  const state = useMemo<WikiGenerateState>(
    () => ({
      catalog: catalog.state,
      articles: articles.state,
      wikiPages: pages,
    }),
    [catalog.state, articles.state, pages]
  );

  // 派生状态
  const derived = useMemo(
    () => ({
      hasWikiCatalog: wikiCatalog !== null,
      catalogCompleted: catalog.state.status === "completed",
      articlesCompleted:
        articles.state.completedCount === pages.length && pages.length > 0,
      allCompleted:
        catalog.state.status === "completed" &&
        articles.state.completedCount === pages.length &&
        pages.length > 0,
    }),
    [
      wikiCatalog,
      catalog.state.status,
      articles.state.completedCount,
      pages.length,
    ]
  );

  // 聚合操作
  const actions = useMemo(
    () => ({
      startCatalog: catalog.actions.start,
      retryCatalog: catalog.actions.retry,
      startArticles: articles.actions.start,
      retryArticles: articles.actions.retryFailed,
      retryPage: articles.actions.retryPage,
    }),
    [
      catalog.actions.start,
      catalog.actions.retry,
      articles.actions.start,
      articles.actions.retryFailed,
      articles.actions.retryPage,
    ]
  );

  return { state, actions, derived };
}