/**
 * useWikiGenerate - Wiki 生成组合 Hook
 *
 * 聚合层设计：
 * - 组合 useCatalogGenerate 和 useArticlesGenerate
 * - 集中流程控制，使用 flowState 状态管理
 * - 显式调用 initialize 和 start，不依赖 useEffect 自动触发
 * - 目录完成后一次性执行：reload → initialize → start
 */

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
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
    /** 开始文章生成（内部会先初始化再启动） */
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

// ==================== 流程状态类型 ====================

type FlowState = 'idle' | 'catalog-generating' | 'waiting-pages' | 'articles-generating' | 'completed';

// ==================== Hook 实现 ====================

export function useWikiGenerate(options?: UseWikiGenerateOptions): UseWikiGenerateReturn {
  const { wikiCatalog, reload } = useWiki();
  const forceRegenerate = options?.forceRegenerate ?? false;


  // 流程状态
  const [flowState, setFlowState] = useState<FlowState>('idle');

  // 防止重复触发的 ref
  const pagesInitializedRef = useRef(false);
  const articlesStartedRef = useRef(false);

  // 派生：是否有 wiki.json（强制模式时视为无）
  const hasWikiCatalog = !forceRegenerate && wikiCatalog !== null;


  // 派生：文章列表
  const pages: WikiPage[] = useMemo(
    () => wikiCatalog?.pages ?? [],
    [wikiCatalog?.pages]
  );

  // ===== 目录完成回调 =====
  const handleCatalogComplete = useCallback(async () => {
    // 1. reload wiki.json
    await reload();
    // 2. 标记等待 pages
    setFlowState('waiting-pages');
  }, [reload]);

  // 目录生成 Hook
  const catalog = useCatalogGenerate({
    hasWikiCatalog,
    forceRegenerate,
    onComplete: handleCatalogComplete,
  });

  // ===== 文章完成回调 =====
  const handleArticlesComplete = useCallback(() => {
    // 不调用 reload，只更新状态
    setFlowState('completed');
  }, []);

  // 文章生成 Hook
  const articles = useArticlesGenerate({
    pages,
    onComplete: handleArticlesComplete,
  });

  // ===== 核心流程控制 =====
  // 场景1：目录完成后，等待 pages，然后初始化并启动文章生成
  useEffect(() => {
    if (
      flowState === 'waiting-pages' &&
      pages.length > 0 &&
      !pagesInitializedRef.current
    ) {
      // 先初始化检测已存在文档
      articles.actions.initialize().then((pendingPages) => {
        pagesInitializedRef.current = true;
        // 使用返回的 pendingPages，避免闭包陷阱
        if (!articlesStartedRef.current && pendingPages.length > 0) {
          articlesStartedRef.current = true;
          articles.actions.start(pendingPages);
          setFlowState('articles-generating');
        } else if (pendingPages.length === 0) {
          setFlowState('completed');
        }
      });
    }
  }, [flowState, pages.length, articles.state.pendingCount]);

  // 场景2：已有 wiki.json，直接进入文章生成流程
  useEffect(() => {
    if (
      hasWikiCatalog &&
      pages.length > 0 &&
      flowState === 'idle' &&
      !pagesInitializedRef.current
    ) {
      articles.actions.initialize().then((pendingPages) => {
        pagesInitializedRef.current = true;
        // 使用返回的 pendingPages，避免闭包陷阱
        if (pendingPages.length > 0 && !articlesStartedRef.current) {
          articlesStartedRef.current = true;
          articles.actions.start(pendingPages);
          setFlowState('articles-generating');
        } else if (pendingPages.length === 0) {
          setFlowState('completed');
        }
      });
    }
  }, [hasWikiCatalog, pages.length, articles.state.pendingCount]);

  // 同步目录状态到 flowState
  useEffect(() => {
    if (catalog.state.status === 'loading' && flowState === 'idle') {
      setFlowState('catalog-generating');
    }
  }, [catalog.state.status, flowState]);

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
      // startArticles 需要先初始化获取 pendingPages，再调用 start
      startArticles: async () => {
        const pendingPages = await articles.actions.initialize();
        if (pendingPages.length > 0) {
          await articles.actions.start(pendingPages);
        }
      },
      retryArticles: articles.actions.retryFailed,
      retryPage: articles.actions.retryPage,
    }),
    [
      catalog.actions.start,
      catalog.actions.retry,
      articles.actions.initialize,
      articles.actions.start,
      articles.actions.retryFailed,
      articles.actions.retryPage,
    ]
  );

  return { state, actions, derived };
}