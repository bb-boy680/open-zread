/**
 * useArticlesGenerate - Wiki 文章生成 Hook
 *
 * 架构设计：
 * - 状态管理：useImmer
 * - 事件处理：mapper 纯函数
 * - 副作用控制：useRef 防止并发
 *
 * 流程：加载 wiki.json → 并行生成各页面
 */

import { useCallback, useRef, useEffect, useState } from "react";
import { useImmer } from "use-immer";
import { loadConfig, getWikiDir, joinPath } from "@open-zread/utils";
import { generateWikiContent, type ArticleEventPayload } from "@open-zread/orchestrator";
import { articleEventToState } from "../mapper";
import { createInitialArticlesState } from "../state";
import type { ArticlesState, WikiPage } from "../types";

// ==================== 接口定义 ====================

interface UseArticlesGenerateOptions {
  /** 文章列表（来自 wiki.json） */
  pages: WikiPage[];
  /** 是否可以开始（目录完成后） */
  canStart: boolean;
  /** 完成回调 */
  onComplete?: () => void;
}

interface UseArticlesGenerateReturn {
  /** 文章生成状态 */
  state: ArticlesState;
  /** 操作方法 */
  actions: {
    /** 开始生成（所有文章） */
    start: () => Promise<void>;
    /** 重试所有失败文章 */
    retryFailed: () => void;
    /** 重试单篇文章 */
    retryPage: (slug: string) => void;
  };
}

// ==================== Hook 实现 ====================

export function useArticlesGenerate({
  pages,
  canStart,
  onComplete,
}: UseArticlesGenerateOptions): UseArticlesGenerateReturn {
  // 初始化状态
  const [state, updateState] = useImmer<ArticlesState>(() =>
    createInitialArticlesState(pages)
  );
  const isGenerating = useRef(false);
  const isReady = useRef(false); // 检测完成后才允许自动触发

  // 当 pages 变化时，检测已存在文档并初始化状态
  useEffect(() => {
    if (pages.length === 0) return;

    // 重置 ready 状态，等待检测完成
    isReady.current = false;

    const wikiDir = getWikiDir();

    async function initializeWithExistingPages() {
      // 先检测已存在的文档
      const existingSlugs: string[] = [];
      for (const page of pages) {
        const filePath = joinPath(wikiDir, page.section, page.file);
        try {
          const file = Bun.file(filePath);
          const exists = await file.exists();
          if (exists) {
            existingSlugs.push(page.slug);
          }
        } catch {
          // 文件检查失败，视为不存在
        }
      }

      // 一次性更新状态：初始化 + 标记已完成
      updateState((draft) => {
        const newState = createInitialArticlesState(pages);
        Object.assign(draft, newState);

        // 标记已存在的文档为 completed
        for (const slug of existingSlugs) {
          draft.pages[slug] = { status: "completed" };
        }
        draft.completedCount = existingSlugs.length;
        draft.pendingCount = pages.length - existingSlugs.length;
      });

      // 检测完成，允许自动触发
      isReady.current = true;
    }

    initializeWithExistingPages();
  }, [pages, updateState]);

  // 从配置获取并发数
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [configLoaded, setConfigLoaded] = useState(false);
  useEffect(() => {
    loadConfig().then((config) => {
      setMaxConcurrent(config.concurrency.max_concurrent);
      setConfigLoaded(true);
    }).catch(() => {
      // 配置加载失败时使用默认值
      setMaxConcurrent(1);
      setConfigLoaded(true);
    });
  }, []);

  /**
   * 事件回调
   *
   * 将 ArticleEventPayload 转换为状态更新（使用 mapper 纯函数）。
   */
  const handleEvent = useCallback(
    (event: ArticleEventPayload) => {
      updateState((draft) => {
        const newState = articleEventToState(
          { ...draft } as ArticlesState,
          event
        );
        Object.assign(draft, newState);
      });
    },
    [updateState]
  );

  /**
   * 开始生成（只生成未完成的文章）
   */
  const start = useCallback(async () => {
    if (isGenerating.current || pages.length === 0) return;
    isGenerating.current = true;

    // 计算待生成的页面列表（只生成 waiting 状态的）
    const pendingPages = pages.filter(
      (page) => state.pages[page.slug]?.status === "waiting"
    );

    if (pendingPages.length === 0) {
      isGenerating.current = false;
      return;
    }

    try {
      // 调用 generateWikiContent，只传入待生成的页面
      await generateWikiContent({
        pages: pendingPages,
        maxConcurrent,
        onEvent: handleEvent,
      });

      onComplete?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // 整体失败时更新状态
      if (state.currentPageSlug) {
        handleEvent({
          type: "page_error",
          slug: state.currentPageSlug,
          error: message,
        });
      }
    } finally {
      isGenerating.current = false;
    }
  }, [pages, state.pages, maxConcurrent, state.currentPageSlug, handleEvent, onComplete]);

  /**
   * 重试所有失败文章
   */
  const retryFailed = useCallback(() => {
    updateState((draft) => {
      for (const [slug, status] of Object.entries(draft.pages)) {
        if (status.status === "failed") {
          draft.pages[slug] = {
            status: "waiting",
          };
          draft.failedCount--;
          draft.pendingCount++;
        }
      }
    });
  }, [updateState]);

  /**
   * 重试单篇文章
   */
  const retryPage = useCallback(
    (slug: string) => {
      updateState((draft) => {
        if (draft.pages[slug]?.status === "failed") {
          draft.pages[slug] = {
            status: "waiting",
          };
          draft.failedCount--;
          draft.pendingCount++;
        }
      });
    },
    [updateState]
  );

  /**
   * 自动触发
   *
   * 当目录完成、检测完成、配置加载完成且有待处理文章时，自动开始生成。
   */
  useEffect(() => {
    if (canStart && isReady.current && configLoaded && state.pendingCount > 0 && !isGenerating.current) {
      start();
    }
  }, [canStart, configLoaded, state.pendingCount, start]);

  return {
    state,
    actions: { start, retryFailed, retryPage },
  };
}