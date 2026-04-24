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
import { loadConfig } from "@open-zread/utils";
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
  const initialState = createInitialArticlesState(pages);
  const [state, updateState] = useImmer<ArticlesState>(initialState);
  const isGenerating = useRef(false);

  // 从配置获取并发数
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  useEffect(() => {
    loadConfig().then((config) => {
      setMaxConcurrent(config.concurrency.max_concurrent);
    }).catch(() => {
      // 配置加载失败时使用默认值
      setMaxConcurrent(1);
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
   * 开始生成（所有文章）
   */
  const start = useCallback(async () => {
    if (isGenerating.current || pages.length === 0) return;
    isGenerating.current = true;

    try {
      // 调用 generateWikiContent，传递并发数
      await generateWikiContent({
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
  }, [pages, maxConcurrent, state.currentPageSlug, handleEvent, onComplete]);

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
   * 当目录完成且有待处理文章时，自动开始生成。
   */
  useEffect(() => {
    if (canStart && state.pendingCount > 0 && !isGenerating.current) {
      start();
    }
  }, [canStart, state.pendingCount, start]);

  return {
    state,
    actions: { start, retryFailed, retryPage },
  };
}